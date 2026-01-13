"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buildUrl as build } from "@/lib/api";
import { getAuthHeader } from "@/lib/token";
import BackgroundSlideshow from "@/components/auth/BackgroundSlideshow";

type StateOpt = { code: string; name: string; type: "State" | "UT" };
type UserAddress = { line1: string; line2?: string | null; city: string; state: string; pincode: string };
type UpdateMePayload = { name?: string; email?: string; address?: UserAddress };
type Me = { _id: string; name?: string | null; email?: string | null; addresses?: UserAddress[] };

const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
const isValidPincode = (v: string) => /^\d{6}$/.test(v);

export default function CompleteProfileClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const returnTo = useMemo(
    () =>
      sp.get("returnTo") ||
      (typeof window !== "undefined" ? sessionStorage.getItem("wnr.returnTo") || "/" : "/"),
    [sp]
  );

  const [states, setStates] = useState<StateOpt[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const headers = getAuthHeader();
        const meRes = await fetch(build("/api/users/me"), { cache: "no-store", headers });
        if (!meRes.ok) return;
        const me: Me = await meRes.json();
        const addr = me.addresses?.[0];
        setName(me.name?.trim() || "");
        setEmail(me.email?.trim() || "");
        setLine1(addr?.line1?.trim() || "");
        setLine2(addr?.line2?.trim() || "");
        setCity(addr?.city?.trim() || "");
        setStateVal(addr?.state?.trim() || "");
        setPincode(addr?.pincode?.toString() || "");
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(build("/api/geo/states"), { cache: "no-store" });
        if (r.ok) setStates(await r.json());
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setCities([]);
      if (!stateVal) return;
      try {
        setLoadingCities(true);
        const r = await fetch(build(`/api/geo/cities?state=${encodeURIComponent(stateVal)}`), {
          cache: "no-store",
        });
        if (r.ok) {
          const data = await r.json();
          setCities(data?.cities || []);
        }
      } catch {
      } finally {
        setLoadingCities(false);
      }
    })();
  }, [stateVal]);

  const handleSave = useCallback(async () => {
    setErr(null);

    const nameClean = name.trim();
    const emailClean = email.trim();
    const line1Clean = line1.trim();
    const line2Clean = line2.trim();
    const cityClean = city.trim();
    const stateClean = stateVal.trim();
    const pinClean = pincode.trim();

    if (!nameClean) return setErr("Please enter your name.");
    if (emailClean && !isValidEmail(emailClean)) return setErr("Enter a valid email or leave it blank.");
    if (!line1Clean || !cityClean || !stateClean || !isValidPincode(pinClean)) {
      return setErr("Please fill all mandatory fields correctly.");
    }

    const payload: UpdateMePayload = {
      name: nameClean,
      ...(emailClean ? { email: emailClean } : {}),
      address: { line1: line1Clean, line2: line2Clean || undefined, city: cityClean, state: stateClean, pincode: pinClean },
    };

    try {
      setSaving(true);
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        ...getAuthHeader()
      };
      const r = await fetch(build("/api/users/me"), {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      if (!r.ok) return setErr("Could not save your profile. Please try again.");
      router.replace(sessionStorage.getItem("wnr.returnTo") || returnTo || "/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, email, line1, line2, city, stateVal, pincode, router, returnTo]);

  return (
    <>
      <BackgroundSlideshow />

      {/* Center logo properly with spacing */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-20">
        <Link href="/" aria-label="Go to homepage">
          <img
            src="https://res.cloudinary.com/dob666wa0/image/upload/v1761475389/WNR_Logo_New_hdc0wb.png"
            alt="Wild n Root"
            className="h-12 md:h-16 w-auto drop-shadow-lg"
          />
        </Link>
      </div>

      <main className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 md:px-8 mt-15">
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-2xl ring-1 ring-black/10">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Complete your profile</h1>
            <p className="text-sm mt-1 text-[var(--wnr-berry)]">One-time setup for faster checkout</p>
          </div>

          <div className="space-y-4">
            <input
              placeholder="Full name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
            />
            <input
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
            />
            <input
              placeholder="Address line 1 *"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
            />
            <input
              placeholder="Address line 2 (optional)"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-[var(--wnr-berry)]"
              >
                <option value="">Select State / UT *</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!stateVal || loadingCities}
                className="w-full rounded-lg border px-3 py-2 outline-none bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-[var(--wnr-berry)]"
              >
                <option value="">
                  {loadingCities ? "Loading..." : stateVal ? "Select City *" : "Select State first"}
                </option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <input
              placeholder="Pincode *"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
              inputMode="numeric"
              maxLength={6}
            />

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                onClick={() => router.replace(returnTo || "/")}
                className="rounded-lg px-4 py-2 bg-gray-100 hover:bg-gray-200 transition"
              >
                Skip for now
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg px-4 py-2 bg-black text-white hover:bg-[var(--wnr-berry)] transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
