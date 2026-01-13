"use client";

import Section from "../../components/common/Section";
import { IoHeartSharp, IoArrowUpSharp } from "react-icons/io5";
import { LuZap, LuBrain, LuTarget, LuWind } from "react-icons/lu";
import { useCallback, useEffect, useRef, useState } from "react";

/* ----------------------------- Data ----------------------------- */

const BENEFITS = [
  {
    id: "power-brew",
    title: "POWER BREW",
    bg: "var(--wnr-berry)",
    features: [
      "CAFFEINE-FREE\nENERGY BOOST",
      "BOOSTS FOCUS\n& CLARITY",
      "SHAKE OFF\nFATIGUE",
      "SUPPORTS\nMUSCLE BUILDING",
    ],
  },
  {
    id: "gutease-brew",
    title: "GUTEASE BREW",
    bg: "var(--wnr-pink)",
    features: [
      "IMPROVES GUT\nMOBILITY",
      "ENHANCES\nAPPETITE",
      "EASES\nBLOATING",
      "LIGHTNESS AFTER\nMEALS",
    ],
  },
  {
    id: "sugarwise-brew",
    title: "SUGARWISE BREW",
    bg: "var(--wnr-green)",
    features: [
      "SUPPORTS BLOOD\nSUGAR BALANCE",
      "REDUCES SUGAR\nCRAVINGS",
      "BOOSTS METABOLISM\n& ENERGY",
      "IMPROVED\nSLEEP CYCLE",
    ],
  },
  {
    id: "digestive-brew",
    title: "DIGESTIVE BREW",
    bg: "var(--wnr-orange)",
    features: [
      "IMPROVES\nDIGESTION",
      "REDUCES POST-MEAL\nHEAVINESS",
      "EASES\nDISCOMFORT",
      "FEELING REFRESHED\n& ACTIVE",
    ],
  },
  {
    id: "slim-brew",
    title: "SLIM BREW",
    bg: "#ffcb64ff",
    features: [
      "REDUCES WATER\nRETENTION",
      "INCREASES\nMETABOLISM",
      "SUPPORTS\nFAT BURN",
      "IMPROVES SKIN\nLUSTRE",
    ],
  },
];

const FEATURE_ICONS = [LuZap, LuBrain, LuTarget, LuWind];

/* --------------------------- Component -------------------------- */

export default function BenefitsStrip() {
  const stripRef = useRef<HTMLDivElement>(null);
  const railHRef = useRef<HTMLDivElement>(null);
  const railVRef = useRef<HTMLDivElement>(null);

  const [progress, setProgress] = useState(0);
  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const scrollEndTimer = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

  const getSlidePrimarySize = useCallback(() => {
    const el = stripRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return 1;
    return isMobile ? el.clientHeight : el.clientWidth;
  }, [isMobile]);

  const getMaxScroll = useCallback(() => {
    const el = stripRef.current;
    if (!el) return 0;
    return isMobile ? Math.max(0, el.scrollHeight - el.clientHeight) : Math.max(0, el.scrollWidth - el.clientWidth);
  }, [isMobile]);

  const setScrollFromProgress = useCallback(
    (p: number) => {
      const el = stripRef.current;
      if (!el) return;
      const ms = getMaxScroll();
      const pos = ms * p;
      if (isMobile) el.scrollTop = pos;
      else el.scrollLeft = pos;
    },
    [getMaxScroll, isMobile]
  );

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (isMobile) el.scrollTo({ top: 0 });
    else el.scrollTo({ left: 0 });
    setProgress(0);
    setIndex(0);
  }, [isMobile]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onScroll = () => {
      const ms = getMaxScroll();
      const pos = isMobile ? el.scrollTop : el.scrollLeft;
      const p = ms ? clamp((pos || 0) / ms, 0, 1) : 0;
      setProgress(p);
      const slideSize = getSlidePrimarySize() || 1;
      const approxIdx = Math.round((pos || 0) / slideSize);
      setIndex(clamp(approxIdx, 0, BENEFITS.length - 1));
      if (isMobile) {
        setIsActive(true);
        if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
        scrollEndTimer.current = window.setTimeout(() => setIsActive(false), 140);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [getMaxScroll, getSlidePrimarySize, isMobile]);

  const dragTo = useCallback(
    (clientX: number, clientY: number) => {
      const rail = isMobile ? railVRef.current : railHRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const ratio = isMobile
        ? clamp((clientY - rect.top) / rect.height, 0, 1)
        : clamp((clientX - rect.left) / rect.width, 0, 1);
      setProgress(ratio);
      setScrollFromProgress(ratio);
      const ms = getMaxScroll();
      const slideSize = getSlidePrimarySize() || 1;
      const pos = ms * ratio;
      const approxIdx = Math.round(pos / slideSize);
      setIndex(clamp(approxIdx, 0, BENEFITS.length - 1));
    },
    [getMaxScroll, getSlidePrimarySize, isMobile, setScrollFromProgress]
  );

  const onRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    setIsActive(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    dragTo(e.clientX, e.clientY);
  };
  const onRailPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragTo(e.clientX, e.clientY);
  };
  const endDrag = () => {
    dragging.current = false;
    setIsActive(false);
  };

  useEffect(() => {
    const off = () => endDrag();
    window.addEventListener("pointerup", off);
    window.addEventListener("pointercancel", off);
    return () => {
      window.removeEventListener("pointerup", off);
      window.removeEventListener("pointercancel", off);
    };
  }, []);

  const edgeH = progress < 0.1 ? "left" : progress > 0.9 ? "right" : "center";

  return (
    <Section>
      <div className="wnr-container">
        <h3 className="section-title text-center text-[var(--wnr-berry)]">BENEFITS</h3>

        <div className="mt-8">
          <div className="relative rounded-2xl overflow-hidden text-white md:pb-14">
            <div
              ref={stripRef}
              className={[
                "flex select-none min-h-[220px]",
                isMobile
                  ? "flex-col overflow-y-auto max-h-[75vh] overscroll-auto no-scrollbar"
                  : "overflow-hidden",
              ].join(" ")}
            >
              {BENEFITS.map((b) => (
                <section
                  key={b.id}
                  className={[
                    isMobile
                      ? "w-full min-w-full mb-4 last:mb-0"
                      : "shrink-0 min-w-[calc(100%-64px)] md:min-w-[calc(90%-140px)]",
                    "p-6 md:p-8",
                  ].join(" ")}
                  style={{ backgroundColor: b.bg }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-xl md:text-2xl flex items-center gap-3">
                      <IoHeartSharp className="h-6 w-6 text-white" />
                      <span className="tracking-wide">{b.title}</span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4">
                    {b.features.map((f, i) => {
                      const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between py-2 px-4 ${
                            i > 0 ? "border-l border-white/25" : ""
                          }`}
                        >
                          <p className="whitespace-pre-line leading-5 font-semibold tracking-wide" style={{ fontSize: '20px' }}>{f}</p>
                          <Icon className="h-7 w-7 md:h-8 md:w-8 text-white/70 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Desktop Rail */}
            <div className="hidden md:block absolute left-6 right-6 bottom-16">
              <div
                ref={railHRef}
                className="relative h-px bg-white/50 select-none"
                onPointerDown={onRailPointerDown}
                onPointerMove={onRailPointerMove}
                onPointerUp={endDrag}
              >
                <div
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `calc(${progress * 100}% - 6px)` }}
                >
                  <div
                    className="relative h-6 w-6 cursor-pointer touch-none select-none group"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    <span className="absolute -inset-9  " />

                    {/* Tooltip BELOW knob */}
                    <div
                      className={[
                        "absolute top-full mt-2 z-50 flex items-center gap-1",
                        edgeH === "center"
                          ? "left-1/2 -translate-x-1/2"
                          : edgeH === "left"
                          ? "left-0 ml-2"
                          : "right-0 mr-2",
                        "text-xs text-white bg-black/70 px-2 py-1 rounded-lg whitespace-nowrap",
                        "pointer-events-none transition-opacity duration-150 opacity-100 animate-heartbeat",
                      ].join(" ")}
                    >
                      <IoArrowUpSharp className="h-3 w-3" />
                      Drag me
                    </div>

                    <IoHeartSharp
                      className={[
                        "relative z-[1] h-5 w-5 will-change-transform transition-all duration-150 ease-out",
                        isActive || isHovering ? "text-red-500 scale-125" : "text-white",
                        "animate-heartbeat-soft",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Rail (No tooltip) */}
            <div className="md:hidden absolute top-6 bottom-6 right-1 w-4">
              <div
                ref={railVRef}
                className="relative mx-auto w-px h-full bg-white/50 select-none"
                onPointerDown={onRailPointerDown}
                onPointerMove={onRailPointerMove}
                onPointerUp={endDrag}
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ top: `calc(${progress * 100}% - 8px)` }}
                >
                  <IoHeartSharp
                    className={[
                      "relative z-[1] h-5 w-5 will-change-transform transition-all duration-150 ease-out",
                      isActive ? "text-red-500 scale-125" : "text-white",
                      "animate-heartbeat-soft",
                    ].join(" ")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heartbeat {
          0% { transform: scale(0.96); }
          20% { transform: scale(1.06); }
          40% { transform: scale(0.98); }
          60% { transform: scale(1.04); }
          100% { transform: scale(0.96); }
        }
        @keyframes heartbeat-soft {
          0% { transform: scale(1); }
          20% { transform: scale(1.08); }
          40% { transform: scale(1); }
          60% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .animate-heartbeat { animation: heartbeat 1.1s ease-in-out infinite; }
        .animate-heartbeat-soft { animation: heartbeat-soft 1.1s ease-in-out infinite; }
      `}</style>
    </Section>
  );
}
