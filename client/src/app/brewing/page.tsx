// src/app/brewing/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BrewingPage() {
  const router = useRouter();

  useEffect(() => {
    // Read details set by checkout page
    const raw = sessionStorage.getItem("wnr:thanks");
    const data = raw ? JSON.parse(raw) as {
      orderNumber?: string;
      amount?: number;
      email?: string;
      phone?: string;
    } : {};

    // Fallback guard
    const qs = new URLSearchParams({
      status: "success",
      orderNumber: data.orderNumber || "",
      amount: String(data.amount ?? 0),
    });
    if (data.email) qs.set("email", encodeURIComponent(data.email));
    if (data.phone) qs.set("phone", encodeURIComponent(data.phone));

    const to = `/thank-you?${qs.toString()}`;

    // tiny pause for the "brewing" effect
    const t = setTimeout(() => {
      router.replace(to);
    }, 1600);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-[80vh] grid place-items-center bg-[var(--wnr-cream,#faf7f2)]">
      <div className="text-center">
        {/* Cup + steam */}
        <div className="mx-auto mb-4 relative w-20 h-20">
          <div className="absolute inset-x-3 top-0 flex gap-2 justify-center">
            <span className="block w-1 h-4 bg-gradient-to-b from-transparent to-[#722F37] rounded-full animate-[steam_1.2s_ease-in-out_infinite]" />
            <span className="block w-1 h-4 bg-gradient-to-b from-transparent to-[#722F37] rounded-full animate-[steam_1.4s_ease-in-out_infinite_200ms]" />
            <span className="block w-1 h-4 bg-gradient-to-b from-transparent to-[#722F37] rounded-full animate-[steam_1.6s_ease-in-out_infinite_400ms]" />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-10 bg-white rounded-b-xl rounded-t-md ring-1 ring-black/10 overflow-hidden">
            <div className="w-full h-1/2 bg-[#d6b0b4]" />
          </div>
          <div className="absolute bottom-2 right-1 w-4 h-6 border-2 border-[#722F37] rounded-r-md" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--wnr-berry,#722F37)]">
          Brewing your order…
        </h1>
        <p className="mt-1 text-sm text-black/60">This just takes a moment.</p>
      </div>

      <style jsx global>{`
        @keyframes steam {
          0% { transform: translateY(6px); opacity: 0; }
          40% { opacity: .6; }
          100% { transform: translateY(-8px); opacity: 0; }
        }
      `}</style>
    </main>
  );
}
