"use client";

import { usePathname, useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";

export default function GoBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Hide on homepage
  if (pathname === "/") return null;

  return (
    <div className="fixed top-[calc(8rem+var(--offer-strip-height,0px))] left-6 z-[60] hidden md:flex items-center group">
      <button
        onClick={() => router.back()}
        className="
          flex items-center justify-center
          rounded-full
          bg-white/80 backdrop-blur-md
          border border-black/10
          shadow-sm p-2
          hover:bg-[var(--wnr-berry)] hover:text-white
          transition-all duration-200
        "
        aria-label="Go back"
      >
        <IoArrowBack className="text-lg" />
      </button>

      {/* Tooltip — aligned horizontally */}
      <span
        className="
          ml-2 opacity-0 group-hover:opacity-100
          translate-x-[-10px] group-hover:translate-x-0
          transition-all duration-300
          bg-black/70 text-white text-xs font-medium
          px-3 py-1 rounded-full backdrop-blur-sm
          pointer-events-none whitespace-nowrap
        "
      >
        Go back
      </span>
    </div>
  );
}
