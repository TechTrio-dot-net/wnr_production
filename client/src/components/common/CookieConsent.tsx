"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/** Storage keys */
const STORAGE_ACCEPT = "wnr:cookies:accepted";
const STORAGE_SNOOZE_UNTIL = "wnr:cookies:snooze-until";

/** In-memory caches to avoid repeated localStorage reads */
let acceptedCache: boolean | null = null;
let snoozeUntilCache: number | null = null;

function readAccepted(): boolean {
  if (acceptedCache != null) return acceptedCache;
  if (typeof window === "undefined") return false;
  acceptedCache = window.localStorage.getItem(STORAGE_ACCEPT) === "true";
  return acceptedCache;
}
function writeAccepted(val: boolean) {
  acceptedCache = val;
  try {
    window.localStorage.setItem(STORAGE_ACCEPT, String(val));
  } catch {}
}

function readSnoozeUntil(): number {
  if (snoozeUntilCache != null) return snoozeUntilCache;
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_SNOOZE_UNTIL);
  const n = raw ? Number(raw) : 0;
  snoozeUntilCache = Number.isFinite(n) ? n : 0;
  return snoozeUntilCache!;
}
function writeSnoozeUntil(ts: number) {
  snoozeUntilCache = ts;
  try {
    if (ts > 0) window.localStorage.setItem(STORAGE_SNOOZE_UNTIL, String(ts));
    else window.localStorage.removeItem(STORAGE_SNOOZE_UNTIL);
  } catch {}
}

/** How long to snooze when user clicks "Close" (not Accept). */
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24h

export default function CookieConsent() {
  const pathname = usePathname();

  // UI state
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const hideTimer = useRef<number | null>(null);

  // Decide visibility immediately after hydration to avoid flicker.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const onHome = pathname === "/";
    const accepted = readAccepted();

    let snoozed = false;
    if (!accepted) {
      const until = readSnoozeUntil();
      if (until && Date.now() < until) snoozed = true;
      if (until && Date.now() >= until) writeSnoozeUntil(0); // clear expired
    }

    setVisible(onHome && !accepted && !snoozed);
    setMounted(true);
  }, [pathname]);

  // Smooth exit animation
  const smoothHide = () => {
    if (exiting) return;
    setExiting(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 220);
  };

  // Cleanup
  useLayoutEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  // Event handlers (no hooks below this line!)
  const accept = () => {
    writeAccepted(true);
    writeSnoozeUntil(0);
    smoothHide();
  };
  const closeForNow = () => {
    writeSnoozeUntil(Date.now() + SNOOZE_MS);
    smoothHide();
  };

  // Early return is OK now—there are no hooks after this point.
  if (!mounted || !visible) return null;

  // Build classes without useMemo to keep hook order stable
  const wrapperCls =
    "fixed bottom-5 right-5 z-[60] max-w-[380px] w-[92vw] sm:w-[360px] " +
    "rounded-2xl bg-white/90 backdrop-blur ring-1 ring-black/10 shadow-xl p-4 " +
    "text-[var(--wnr-text)] transition-transform duration-200 ease-out will-change-transform " +
    (exiting ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100");

  return (
    <div className={wrapperCls} role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p className="text-sm leading-5">
        We use cookies to improve your experience, analyze site traffic, and for
        essential functionality. See our{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 text-[var(--wnr-berry)] hover:opacity-80"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={accept}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-white bg-[var(--wnr-berry)] hover:opacity-90 text-sm font-medium"
          aria-label="Accept cookies"
        >
          Accept
        </button>

        <button
          onClick={closeForNow}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full ring-1 ring-black/10 hover:bg-black/5 text-sm"
          aria-label="Close cookie popup"
        >
          Close for now
        </button>
      </div>
    </div>
  );
}
