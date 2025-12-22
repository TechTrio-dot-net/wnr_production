"use client";

import { useEffect, useMemo, useState } from "react";

type BgSlide = { id: string; src: string };

const BG_IMAGES: string[] = [
  "https://res.cloudinary.com/dob666wa0/image/upload/v1761473438/IMG_0756_TIF-min_epdnih.jpg",
  "https://res.cloudinary.com/dob666wa0/image/upload/v1761473438/IMG_0757_TIF-min_vfvewo.jpg",
  "https://res.cloudinary.com/dob666wa0/image/upload/v1761473438/IMG_0754_TIF-min_rbasz9.jpg",
  "https://res.cloudinary.com/dob666wa0/image/upload/v1761473437/IMG_0755_TIF-min_fqylth.jpg",
  "https://res.cloudinary.com/dob666wa0/image/upload/v1761473437/IMG_0753_TIF-min_kinum4.jpg",
];

export default function BackgroundSlideshow() {
  const slides: BgSlide[] = useMemo(
    () => BG_IMAGES.map((url, i) => ({ id: `slide-${i}`, src: url })),
    []
  );

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    slides.forEach((s) => {
      const img = new Image();
      img.src = s.src;
    });
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (!paused) setIdx((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={s.src}
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-out will-change-transform ${
            i === idx ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-105"
          }`}
          loading="eager"
        />
      ))}
      <div className="absolute inset-0 bg-[var(--wnr-berry)]/15 mix-blend-multiply" />
    </div>
  );
}
