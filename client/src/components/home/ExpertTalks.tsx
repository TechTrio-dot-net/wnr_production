"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaVolumeMute, FaVolumeUp } from "react-icons/fa";

/** Local video and thumbnail paths */
// Videos: /videos/expert-talks/
// Thumbnails: /images/expert-talks/
const talks = [
  {
    image: "/images/expert-talks/thumbnail-1.jpg",
    video: "/videos/expert-talks/video-1.mp4",
  },
  {
    image: "/images/expert-talks/thumbnail-2.jpg",
    video: "/videos/expert-talks/video-2.mp4",
  },
  {
    image: "/images/expert-talks/thumbnail-3.jpg",
    video: "/videos/expert-talks/video-3.mp4",
  },
  {
    image: "/images/expert-talks/thumbnail-4.jpg",
    video: "/videos/expert-talks/video-4.mp4",
  },
  {
    image: "/images/expert-talks/thumbnail-5.jpg",
    video: "/videos/expert-talks/video-5.mp4",
  },
];

export default function ExpertTalksCarousel() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // detect mobile (coarse pointer)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Optional: choose center card on first load via ?expert=<index> or localStorage
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("expert");
      if (q && /^\d+$/.test(q)) {
        const idx = Number(q);
        if (idx >= 0 && idx < talks.length) {
          setActiveIndex(idx);
          return;
        }
      }
      const saved = window.localStorage.getItem("experts.activeIndex");
      if (saved) {
        const idx = Number(saved);
        if (!Number.isNaN(idx) && idx >= 0 && idx < talks.length) setActiveIndex(idx);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("experts.activeIndex", String(activeIndex)); } catch {}
  }, [activeIndex]);

  // swipe state (mobile)
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const verticalScroll = useRef(false);

  // video refs
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);

  const length = talks.length;
  const shiftLeft = () => { setActiveIndex((p) => (p - 1 + length) % length); };
  const shiftRight = () => { setActiveIndex((p) => (p + 1) % length); };

  const weightFor = (pos: number) => (pos === 0 ? 1 : pos === 1 || pos === -1 ? 0.6 : pos === 2 || pos === -2 ? 0.3 : 0);

  const getRelativePosition = (index: number): number => {
    const diff = (index - activeIndex + length) % length;
    if (diff === 0) return 0;
    if (diff === 1 || diff === -4) return 1;
    if (diff === 2 || diff === -3) return 2;
    if (diff === 3 || diff === -2) return -2;
    if (diff === 4 || diff === -1) return -1;
    return 99;
  };

  // Desktop positions (unchanged)
  const getPositionClass = (position: number): string => {
    switch (position) {
      case -2: return "translate-x-[-380px] scale-75 z-0 blur-sm opacity-50";
      case -1: return "translate-x-[-190px] scale-90 z-10 blur-[1px] opacity-80";
      case  0: return "translate-x-0 scale-100 z-20 blur-0 opacity-100";
      case  1: return "translate-x-[190px] scale-90 z-10 blur-[1px] opacity-80";
      case  2: return "translate-x-[380px] scale-75 z-0 blur-sm opacity-50";
      default: return "hidden";
    }
  };

  // touch handlers (mobile) — single-card swipe
  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    verticalScroll.current = false;
    setIsDragging(true);
    setDragX(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current; // fixed typo
    if (!verticalScroll.current && Math.abs(dy) > Math.abs(dx) + 8) {
      verticalScroll.current = true;
      // allow page to scroll without stopping playback
      return;
    }
    if (!verticalScroll.current) {
      setDragX(dx);
      e.preventDefault();
    }
  };
  const onTouchEnd = () => {
    if (!isMobile) return;
    if (!verticalScroll.current) {
      const threshold = 60;
      if (dragX > threshold) setActiveIndex((p) => (p - 1 + length) % length);
      else if (dragX < -threshold) setActiveIndex((p) => (p + 1) % length);
    }
    setIsDragging(false);
    setDragX(0);
    touchStartX.current = touchStartY.current = null;
    verticalScroll.current = false;
  };

  // ensure autoplay on mobile for the active video
  useEffect(() => {
    if (!isMobile) return;
    setIsPlaying(true);
    const el = activeVideoRef.current;
    if (el) {
      el.muted = isMuted; // keep in sync
      el.play().catch(() => {});
    }
  }, [activeIndex, isMobile, isMuted]);

  // desktop hover playback remains unchanged

  // mute toggle
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      const el = isMobile ? activeVideoRef.current : desktopVideoRef.current;
      if (el) {
        el.muted = next;
        if (!next) el.play().catch(() => {});
      }
      return next;
    });
  };

  return (
    <section className="relative w-full py-10 sm:py-12 md:py-16 px-4 overflow-x-hidden">
      {/* Heading */}
      <div className="relative  sm:mb-10 flex flex-col items-center text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: "var(--wnr-berry)" }}>
          Expert Talks
        </h2>
        <p className="text-gray-600 mt-2 sm:mt-3 text-base sm:text-lg">Learn from trusted voices of Ayurveda and wellness</p>
      </div>
      {/* Carousel */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: "min(85vh, 720px)", touchAction: isMobile ? "pan-y" : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Chevrons */}
        <button
          onClick={shiftLeft}
          aria-label="Previous"
          className="absolute left-2 sm:left-3 z-30 text-[var(--wnr-berry)] hover:scale-110 transition w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 shadow flex items-center justify-center"
        >
          <FaChevronLeft className="text-xl sm:text-2xl" />
        </button>
        <button
          onClick={shiftRight}
          aria-label="Next"
          className="absolute right-2 sm:right-3 z-30 text-[var(--wnr-berry)] hover:scale-110 transition w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 shadow flex items-center justify-center"
        >
          <FaChevronRight className="text-xl sm:text-2xl" />
        </button>

        {/* Track */}
        <div className="relative flex items-center justify-center w-full sm:w-[760px] md:w-[900px] lg:w-[980px] h-full overflow-hidden">
          {talks.map((talk, index) => {
            const pos = getRelativePosition(index);
            const isActive = pos === 0;
            const weight = weightFor(pos);
            const desktopPosClass = getPositionClass(pos);
            const visibility = isMobile ? (isActive ? "block" : "hidden") : (isActive ? "block" : "hidden sm:block");

            return (
              <div
                key={index}
                className={`${visibility} absolute ${isMobile ? "" : desktopPosClass} ${isDragging ? "transition-none" : "transition-all duration-500 ease-in-out"}`}
                style={isMobile && isActive ? { transform: `translateX(${weight * dragX}px)` } : undefined}
                onMouseEnter={() => !isMobile && isActive && setIsHovered(true)}
                onMouseLeave={() => !isMobile && isActive && setIsHovered(false)}
              >
                {/* Card */}
                <div
                  className={`relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl ${isActive ? "cursor-pointer" : ""} ${!isMobile && isActive ? "sm:hover:scale-105 transition-transform duration-300" : ""}`}
                  style={isMobile ? { width: "88vw", maxWidth: 420 } : { height: "min(78vh, 680px)" }}
                >
                  <div className={`relative ${isMobile ? "w-full aspect-[9/16]" : "h-full aspect-[9/16]"} bg-black`}>
                    {isActive ? (
                      isMobile ? (
                        <>
                          <video
                            ref={activeVideoRef}
                            src={talk.video}
                            poster={talk.image}
                            className="absolute inset-0 w-full h-full object-contain"
                            loop
                            muted={isMuted}
                            playsInline
                            autoPlay
                            preload="metadata"
                            onLoadedData={(e) => {
                              // Mark video as loaded to prevent re-downloading
                              e.currentTarget.setAttribute("data-loaded", "true");
                            }}
                            onClick={(e) => {
                              const v = e.currentTarget;
                              if (v.paused) v.play(); else v.pause();
                            }}
                          />
                          <button
                            onClick={toggleMute}
                            className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 text-white p-2 hover:bg-black/80"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                          </button>
                        </>
                      ) : isHovered ? (
                        <>
                          <video
                            ref={desktopVideoRef}
                            src={talk.video}
                            poster={talk.image}
                            className="absolute inset-0 w-full h-full object-contain"
                            autoPlay
                            loop
                            muted={isMuted}
                            playsInline
                            preload="metadata"
                            onLoadedData={(e) => {
                              // Mark video as loaded to prevent re-downloading
                              e.currentTarget.setAttribute("data-loaded", "true");
                            }}
                          />
                          <button
                            onClick={toggleMute}
                            className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 text-white p-2 hover:bg-black/80"
                            aria-label={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                          </button>
                        </>
                      ) : (
                        <img
                          src={talk.image}
                          alt="Expert talk thumbnail"
                          className="absolute inset-0 w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      )
                    ) : (
                      <img
                        src={talk.image}
                        alt="Expert talk thumbnail"
                        className="absolute inset-0 w-full h-full object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots (mobile only) */}
      <div className="mt-4 flex sm:hidden items-center justify-center gap-2">
        {talks.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i); }}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${i === activeIndex ? "bg-[var(--wnr-berry)] scale-110" : "bg-gray-300"}`}
          />
        ))}
      </div>
    </section>
  );
}
