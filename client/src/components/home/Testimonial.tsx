"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildUrl } from "@/lib/api";
import TestimonialCard, { type TestimonialCard as TestimonialCardType } from "./TestimonialCard";

/* ========== Motion settings ========== */
const SPEED_MIN = 24;   // px/sec
const SPEED_MAX = 50;   // px/sec
const EDGE_PADDING = 20; // px
const ROTATE_MAX = 4;   // deg

type Vec = { x: number; y: number };
type Card = {
  pos: Vec;   // px
  vel: Vec;   // px/sec
  size: Vec;  // px
  rot: number;
};

const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const speedVec = (): Vec => {
  const ang = rand(0, Math.PI * 2);
  const spd = rand(SPEED_MIN, SPEED_MAX);
  return { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd };
};

/* ========== Main Section ========== */
export default function Testimonials({
  title = "What Our Customers Say",
  subtitle = "Discover early users' feedback on Wild n' Root within their workflows.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [testimonials, setTestimonials] = useState<TestimonialCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const cards = useMemo(() => testimonials.slice(0, 6), [testimonials]);

  // Fetch testimonials from backend
  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const res = await fetch(buildUrl("/api/testimonials"), { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setTestimonials(data.testimonials || []);
        }
      } catch (error) {
        console.error("Failed to fetch testimonials:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonials();
  }, []);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const elRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dataRef = useRef<Card[]>(
    cards.map(() => ({
      pos: { x: 0, y: 0 },
      vel: speedVec(),
      size: { x: 0, y: 0 },
      rot: rand(-ROTATE_MAX, ROTATE_MAX),
    }))
  );

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // helper: assign element refs in map()
  const setElRef = (i: number) => (el: HTMLDivElement | null) => {
    elRefs.current[i] = el;
  };

  // measure + initial placement
  const measureAndInit = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    dataRef.current.forEach((d, i) => {
      // estimate sizes (cards are consistent height visually)
      const w = window.innerWidth >= 768 ? 420 : window.innerWidth >= 640 ? 360 : 320;
      const h = 240; // Updated height for new card design
      d.size = { x: w, y: h };

      // if first-time (pos 0,0): random place; else clamp to bounds
      const isInit = d.pos.x === 0 && d.pos.y === 0;
      const maxX = Math.max(EDGE_PADDING, W - d.size.x - EDGE_PADDING);
      const maxY = Math.max(EDGE_PADDING, H - d.size.y - EDGE_PADDING);

      if (isInit) {
        d.pos.x = rand(EDGE_PADDING, maxX);
        d.pos.y = rand(EDGE_PADDING, maxY);
      } else {
        d.pos.x = Math.min(Math.max(d.pos.x, EDGE_PADDING), maxX);
        d.pos.y = Math.min(Math.max(d.pos.y, EDGE_PADDING), maxY);
      }

      // place immediately
      const el = elRefs.current[i];
      if (el) {
        el.style.position = "absolute";
        el.style.left = `${d.pos.x}px`;
        el.style.top = `${d.pos.y}px`;
        el.style.transform = `translateZ(0) rotate(${d.rot}deg)`;
      }
    });
  };

  // Update dataRef when cards change
  useEffect(() => {
    dataRef.current = cards.map(() => ({
      pos: { x: 0, y: 0 },
      vel: speedVec(),
      size: { x: 0, y: 0 },
      rot: rand(-ROTATE_MAX, ROTATE_MAX),
    }));
    elRefs.current = [];
    measureAndInit();
  }, [cards.length]);

  // anim loop (imperative DOM updates)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || cards.length === 0) return;

    measureAndInit();
    const onResize = () => measureAndInit();
    window.addEventListener("resize", onResize);

    const tick = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = (ts - lastRef.current) / 1000;
      lastRef.current = ts;

      const W = wrap.clientWidth;
      const H = wrap.clientHeight;

      dataRef.current.forEach((d, i) => {
        const el = elRefs.current[i];
        if (!el) return;

        const isPaused = hovered === i;

        // z-index + dimming handled here
        el.style.zIndex = isPaused ? "1000" : "1";
        el.style.filter = isPaused ? "none" : "saturate(0.9) blur(0.2px)";
        el.style.opacity = isPaused ? "1" : "0.9";

        if (!isPaused) {
          // integrate motion
          d.pos.x += d.vel.x * dt;
          d.pos.y += d.vel.y * dt;

          // bounce
          const minX = EDGE_PADDING;
          const minY = EDGE_PADDING;
          const maxX = W - d.size.x - EDGE_PADDING;
          const maxY = H - d.size.y - EDGE_PADDING;

          if (d.pos.x <= minX) { d.pos.x = minX; d.vel.x = Math.abs(d.vel.x); }
          if (d.pos.x >= maxX) { d.pos.x = maxX; d.vel.x = -Math.abs(d.vel.x); }
          if (d.pos.y <= minY) { d.pos.y = minY; d.vel.y = Math.abs(d.vel.y); }
          if (d.pos.y >= maxY) { d.pos.y = maxY; d.vel.y = -Math.abs(d.vel.y); }

          // subtle wobble
          d.rot += rand(-0.2, 0.2);
          d.rot = Math.max(-ROTATE_MAX, Math.min(ROTATE_MAX, d.rot));
        }

        // write styles
        el.style.left = `${d.pos.x}px`;
        el.style.top = `${d.pos.y}px`;
        // keep small 3D tilt if set by mouse
        const rx = getComputedStyle(el).getPropertyValue("--rx") || "0deg";
        const ry = getComputedStyle(el).getPropertyValue("--ry") || "0deg";
        el.style.transform = `translateZ(0) rotate(${d.rot}deg) rotateX(${rx}) rotateY(${ry})`;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hovered, cards.length]);

  // tilt toward cursor on hovered card
  const handleTilt = (i: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (hovered !== i) return;
    const el = elRefs.current[i];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rx = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2)));
    const ry = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2)));
    el.style.setProperty("--rx", `${(-rx * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(ry * 6).toFixed(2)}deg`);
  };

  if (loading) {
    return (
      <section className="relative w-full py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mt-2 text-3xl md:text-5xl font-extrabold leading-tight text-[color:var(--wnr-berry,#5A1D3D)]">
            {title}
          </h2>
          <p className="mt-4 text-sm md:text-base text-black/70 max-w-3xl mx-auto">Loading testimonials...</p>
        </div>
      </section>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="mt-2 text-3xl md:text-5xl font-extrabold leading-tight text-[color:var(--wnr-berry,#5A1D3D)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 text-sm md:text-base text-black/70 max-w-3xl mx-auto">{subtitle}</p>
        )}
      </div>

      {/* Floating canvas (desktop/tablet) */}
      <div
        ref={wrapRef}
        className="relative hidden md:block mx-auto mt-4 h-[660px] max-w-6xl rounded-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(236, 221, 221, 0.04), transparent 40%), radial-gradient(circle at 70% 80%, rgba(230, 210, 220, 0.04), transparent 40%)",
        }}
      >
        {cards.map((t, i) => (
          <div
            key={t._id}
            ref={setElRef(i)}
            className="select-none will-change-transform cursor-pointer transition-[filter,opacity] duration-150 ease-out"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            onMouseMove={handleTilt(i)}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            <TestimonialCard testimonial={t} />
          </div>
        ))}
      </div>

      {/* Mobile swipe rail */}
      <div className="md:hidden mt-8">
        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-2">
          {cards.map((t) => (
            <div key={t._id} className="snap-center shrink-0 w-[88%] mx-1">
              <TestimonialCard testimonial={t} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
