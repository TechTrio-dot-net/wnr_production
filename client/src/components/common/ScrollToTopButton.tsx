"use client";

import { useEffect, useState } from "react";
import { IoChevronUp } from "react-icons/io5";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      className={`fixed bottom-6 right-5 z-[9999] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Tooltip */}
      <div
        className={`absolute bottom-13 right-1/2 translate-x-1/2 whitespace-nowrap
          bg-black/80 text-white text-[12px] font-medium
          px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm
          transition-all duration-200 ease-out
          ${hover ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"}
        `}
        style={{
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
        }}
      >
        Back to top
      </div>

      {/* Button */}
      <button
        onClick={scrollTop}
        aria-label="Scroll to top"
        className="
          rounded-full p-3 md:p-3.5 shadow-lg ring-1 ring-black/10
          bg-[var(--wnr-berry)] text-white
          hover:scale-105 hover:opacity-90
          transition-all duration-300
          flex items-center justify-center
        "
      >
        <IoChevronUp size={20} />
      </button>
    </div>
  );
}
