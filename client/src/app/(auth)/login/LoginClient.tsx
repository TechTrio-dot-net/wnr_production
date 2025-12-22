"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getFirebaseAuth, createInvisibleRecaptcha } from "@/lib/firebaseClient";
import { signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { buildUrl as build } from "@/lib/api";
import BackgroundSlideshow from "@/components/auth/BackgroundSlideshow";
import { setToken } from "@/lib/token";



interface UserMe {
  _id: string;
  name?: string | null;
  phone?: string | null;
  isProfileComplete?: boolean;
}
interface SessionExchange {
  status: "new" | "existing";
  returnTo?: string | null;
}

const toE164 = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
};
const getErr = (e: unknown) =>
  e instanceof FirebaseError ? e.message : e instanceof Error ? e.message : "Something went wrong";

export default function LoginClient() {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const router = useRouter();
  const sp = useSearchParams();

  // Debug helper (set NEXT_PUBLIC_DEBUG_AUTH=true on prod to enable)
  const DEBUG = true;
  const dlog = (...args: any[]) => {
    if (DEBUG) console.log("[auth]", ...args);
  };

  const [resolvedReturnTo, setResolvedReturnTo] = useState("/");
  useEffect(() => {
    const q = sp.get("returnTo");
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("wnr.returnTo") : null;
    let dest = q || stored || "/";
    if (!dest || dest.startsWith("/login")) dest = "/";
    setResolvedReturnTo(dest);
    if (typeof window !== "undefined") sessionStorage.setItem("wnr.returnTo", dest);
  }, [sp]);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stepOtp, setStepOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  const recaptchaRef = useRef<any>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const verifyInProgressRef = useRef(false);
  const verifyFiredOnceRef = useRef(false);
  const confirmPromiseRef = useRef<Promise<any> | null>(null);
  const lastOtpAttemptRef = useRef<string | null>(null);
  const lastAttemptAtRef = useRef(0);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);
  const startLongCooldown = useCallback(
    (minutes: number) => startCooldown(Math.max(60, minutes * 60)),
    [startCooldown]
  );

  useEffect(() => {
    // Log runtime context and Firebase app options once
    try {
      const opts: any = (auth as any)?.app?.options || {};
      dlog("app.options", {
        projectId: opts.projectId,
        appId: opts.appId,
        apiKey: opts.apiKey?.slice?.(0, 6) + "…",
        authDomain: opts.authDomain,
        origin: typeof window !== "undefined" ? window.location.origin : "-",
        NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
      });
    } catch {}
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        recaptchaRef.current?.clear?.();
      } catch {}
    };
  }, []);

  const sendOtp = useCallback(async () => {
    setErr(null);
    if (cooldown > 0) {
      setErr("Please wait a moment before resending.");
      return;
    }

    const normalized = toE164(phone);
    if (!/^\+\d{10,15}$/.test(normalized)) {
      setErr("Enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      dlog("sendOtp:start", { normalized });
      try {
        recaptchaRef.current?.clear?.();
      } catch {}
      recaptchaRef.current = createInvisibleRecaptcha(auth);
      dlog("sendOtp:recaptcha-created");
      const confirmation = await signInWithPhoneNumber(auth, normalized, recaptchaRef.current);
      confirmationRef.current = confirmation;
      dlog("sendOtp:confirmation-created");
      verifyFiredOnceRef.current = false; // reset guard for new OTP flow
      confirmPromiseRef.current = null;
      lastOtpAttemptRef.current = null;
      lastAttemptAtRef.current = 0;
      setOtp("");
      setWrongAttempts(0);
      startCooldown(60);
      setStepOtp(true);
      setTimeout(() => otpInputRef.current?.focus(), 0);
    } catch (e) {
      if (e instanceof FirebaseError && e.code === "auth/too-many-requests") {
        setErr("Too many attempts. Please wait a few minutes before trying again.");
        startLongCooldown(5);
      } else {
        setErr(getErr(e));
      }
    } finally {
      setLoading(false);
    }
  }, [auth, phone, cooldown, startCooldown, startLongCooldown]);

  const verifyOtp = useCallback(async () => {
    setErr(null);
    if (!confirmationRef.current) {
      setErr("Please request OTP first.");
      return;
    }
    if (!otp || otp.length < 6) {
      setErr("Enter the 6-digit OTP");
      return;
    }

    // Hard single-flight + duplicate OTP suppression (30s window)
    if (confirmPromiseRef.current) {
      dlog("verify:skip (in-flight)");
      return;
    }
    if (lastOtpAttemptRef.current === otp && Date.now() - lastAttemptAtRef.current < 30000) {
      dlog("verify:skip (same-otp-recent)");
      return;
    }
    lastOtpAttemptRef.current = otp;
    lastAttemptAtRef.current = Date.now();

    setLoading(true);
    try {
      dlog("verify:start", { otpLen: otp.length });

      // One-time retry with exponential backoff for transient backend errors
      const attemptConfirm = async () => {
        try {
          const c = await confirmationRef.current!.confirm(otp);
          dlog("verify:confirmation-ok");
          return c;
        } catch (err: any) {
          dlog("verify:confirmation-error", { code: err?.code, message: err?.message });
          throw err;
        }
      };

      let cred: any;
      let lastErr: any;
      confirmPromiseRef.current = (async () => {
        for (let i = 0; i < 2; i++) {
          try {
            cred = await attemptConfirm();
            break;
          } catch (e: any) {
            lastErr = e;
            const msg = String(e?.message || "");
            const maybeTransient = /503|backendError|Error code:\s*39|internal/i.test(msg);
            if (i === 0 && maybeTransient) {
              const delay = 500 * Math.pow(2, i);
              dlog("verify:retrying-after", delay);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            throw e;
          }
        }
      })();

      await confirmPromiseRef.current;
      confirmPromiseRef.current = null;
        try {
        // no-op
      } catch (e) {
        // keep lastErr from the loop
      }
      if (!cred) throw lastErr;
      setWrongAttempts(0);
      const idToken = await cred.user.getIdToken(true);
      dlog("verify:idToken-len", { len: String(idToken || "").length });

      const res = await fetch(build("/api/auth/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken, returnTo: resolvedReturnTo }),
      });
      dlog("session:response", { status: res.status });
      if (!res.ok) throw new Error("Login failed.");

      // ✅ Store JWT token in localStorage with proper persistence
      const sessionData: any = await res.json();
      if (sessionData.token) {
        setToken(sessionData.token); // Uses our token management system
        dlog("token:stored", { len: sessionData.token.length });
      } else {
        throw new Error("No token received from server");
      }

      // Get user info from session response or fetch
      const me: UserMe | null = sessionData.user || null;
      dlog("me:data", { hasUser: !!me, isComplete: me?.isProfileComplete });

      // 🔔 notify client-land (UserContext, etc.) that auth changed
      window.dispatchEvent(new CustomEvent("wnr:auth:changed"));

      if (me?.isProfileComplete) {
        // show short welcome then navigate + refresh so navbar shows user immediately
        setWelcomeName(me.name || me.phone || "there");
        setTimeout(() => {
          router.replace(resolvedReturnTo);
          // Force RSC/SSR + client hooks to re-evaluate with fresh cookies
          router.refresh();
        }, 600);
      } else {
        router.replace("/complete-profile");
        setTimeout(() => router.refresh(), 0);
      }
    } catch (e: any) {
      const msg = getErr(e);
      dlog("verify:final-error", { msg });
      // If session expired or code expired, force user to re-send
      if (/SESSION_EXPIRED/i.test(msg) || /code-expired/i.test(String(e?.code || ""))) {
        setErr("Code expired. Please request a new OTP.");
        setStepOtp(false);
        setOtp("");
        setTimeout(() => phoneInputRef.current?.focus(), 0);
      } else {
        setErr(msg);
      }
    } finally {
      confirmPromiseRef.current = null;
      setLoading(false);
    }
  }, [otp, resolvedReturnTo, router]);

  useEffect(() => {
    // Fire auto-verify exactly once per OTP entry, and never in parallel
    if (otp.length === 6 && stepOtp && !loading && !verifyFiredOnceRef.current && !verifyInProgressRef.current && !confirmPromiseRef.current) {
      verifyInProgressRef.current = true;
      verifyFiredOnceRef.current = true;
      void verifyOtp().finally(() => {
        verifyInProgressRef.current = false;
      });
    }
  }, [otp, stepOtp, loading, verifyOtp]);

  if (welcomeName) {
    return (
      <>
        <BackgroundSlideshow />
        <main className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="rounded-2xl bg-white/90 backdrop-blur px-8 py-10 text-center shadow-xl ring-1 ring-black/10">
            <div className="text-2xl font-semibold">Welcome, {welcomeName} 👋</div>
            <div className="text-sm text-gray-700 mt-2">Taking you to the homepage…</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <BackgroundSlideshow />
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10">
        <Link href="/" aria-label="Go to homepage">
          <img
            src="https://res.cloudinary.com/dob666wa0/image/upload/v1761475389/WNR_Logo_New_hdc0wb.png"
            alt="Wild n Root"
            className="h-14 md:h-16 lg:h-20 w-auto drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]"
          />
        </Link>
      </div>

      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold">Sign in</h1>
            <p className="text-sm mt-1 text-[var(--wnr-berry)]">
              Redirecting → {resolvedReturnTo === "/" ? "homepage" : resolvedReturnTo}
            </p>
          </div>

          <div className="mt-6 bg-white/90 backdrop-blur p-5 rounded-2xl shadow-2xl ring-1 ring-black/10">
            {!stepOtp ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium">Phone number</span>
                  <input
                    ref={phoneInputRef}
                    className="mt-1 w-full rounded-lg border px-3 py-2 outline-none"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) {
                        e.preventDefault();
                        void sendOtp();
                      }
                    }}
                  />
                </label>
                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send OTP"}
                </button>
                {cooldown > 0 && <p className="text-xs text-gray-500">Resend in {cooldown}s</p>}
                {err && <p className="text-sm text-red-600">{err}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium">Enter OTP</span>
                  <input
                    ref={otpInputRef}
                    className="mt-1 w-full rounded-lg border px-3 py-2 outline-none text-center tracking-widest"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                  />
                </label>
                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify & Continue"}
                </button>
                {cooldown > 0 ? (
                  <p className="text-xs text-gray-500">Resend available in {cooldown}s</p>
                ) : (
                  <button
                    onClick={sendOtp}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
                <button
                  onClick={() => {
                    setStepOtp(false);
                    setOtp("");
                    setTimeout(() => phoneInputRef.current?.focus(), 0);
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Change number
                </button>
                {err && <p className="text-sm text-red-600">{err}</p>}
              </div>
            )}
            <div id="recaptcha-container" />
          </div>
        </div>
      </main>
    </>
  );
}
