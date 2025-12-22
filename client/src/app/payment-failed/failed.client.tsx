// src/app/payment-failed/failed.client.tsx
"use client";

import Link from "next/link";

export default function PaymentFailedClient({
  initialOrderNumber,
  initialReason = "",
}: {
  initialOrderNumber?: string;
  initialReason?: string;
}) {
  return (
    <main className="min-h-[70vh] bg-[var(--wnr-sand,#faf7f2)] py-16">
      <div className="wnr-container">
        <div className="mx-auto max-w-xl bg-white rounded-2xl shadow-soft ring-1 ring-black/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700 ring-1 ring-red-200">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-neutral-900">Payment Failed</h1>
          <p className="mt-2 text-neutral-600">
            {initialReason ? initialReason : "We couldn’t complete your payment. If you were charged, contact support and we’ll help right away."}
          </p>

          {initialOrderNumber ? (
            <p className="mt-2 text-sm text-neutral-700">Order reference: <strong>{initialOrderNumber}</strong></p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/buy-now" className="inline-flex items-center justify-center rounded-xl px-4 py-3 bg-[var(--wnr-berry,#6b2b39)] text-white hover:opacity-95">
              Try Again
            </Link>
            <Link href="/faq#payments" className="inline-flex items-center justify-center rounded-xl px-4 py-3 ring-1 ring-black/10 bg-white hover:bg-black/5">
              Payment FAQs
            </Link>
          </div>

          <p className="mt-6 text-xs text-neutral-500">
            Need help? <Link href="mailto:support@wildnroot.com" className="underline">support@wildnroot.com</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
