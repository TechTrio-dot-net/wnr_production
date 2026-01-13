"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#FDE047", "#86EFAC", "#93C5FD", "#FCA5A5", "#F9A8D4", "#FCD34D", "#A7F3D0", "#C4B5FD"];

export default function CelebrationConfetti({
  duration = 2500,   // total display duration in ms
  count = 80,        // number of confetti pieces
  speed = 1.0,       // lower = slower, higher = faster
}: {
  duration?: number;
  count?: number;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "confetti-piece";
      el.style.setProperty("--x", Math.random().toString());
      el.style.setProperty("--r", (Math.random() * 360).toFixed(2));
      el.style.setProperty("--d", (0.8 + Math.random() * 0.8).toFixed(2)); // fall randomness
      el.style.background = COLORS[i % COLORS.length];
      root.appendChild(el);
      pieces.push(el);
    }

    const t = setTimeout(() => {
      pieces.forEach((p) => p.remove());
    }, duration);

    return () => {
      clearTimeout(t);
      pieces.forEach((p) => p.remove());
    };
  }, [duration, count]);

  return (
    <>
      <div ref={ref} className="pointer-events-none fixed inset-0 overflow-hidden z-[60]" aria-hidden />
      <style jsx global>{`
        .confetti-piece {
          position: absolute;
          top: -8px;
          left: calc(var(--x) * 100%);
          width: 8px;
          height: 12px;
          border-radius: 2px;
          opacity: 0.95;
          transform: translateX(-50%) rotate(calc(var(--r) * 1deg));
          animation: confetti-fall calc(${1.2 / speed}s * var(--d)) ease-in forwards,
                     confetti-drift calc(${1.8 / speed}s * var(--d)) ease-in-out infinite alternate;
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) translateX(-50%) rotate(0deg); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(-50%) rotate(720deg); opacity: 0.95; }
        }
        @keyframes confetti-drift {
          0%   { margin-left: -10px; }
          100% { margin-left: 10px; }
        }
      `}</style>
    </>
  );
}
