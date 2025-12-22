// src/sections/home/InstagramReels.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Section from "../../components/common/Section";

type ReelItem = {
  id: string;
  video?: string;
  poster?: string;
  url?: string;
  author?: string;
  caption?: string;
};

export default function InstagramReels() {
  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [errDetails, setErrDetails] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/instagram/reels?`, { cache: "no-store" });
        if (!res.ok) {
          let payload: any = undefined;
          try { payload = await res.json(); } catch { /* ignore */ }
          if (!alive) return;
          setErr(payload?.error || `HTTP ${res.status}`);
          setErrDetails(payload || null);
          return;
        }
        const json = await res.json();
        if (!alive) return;
        setItems(Array.isArray(json?.data) ? json.data : []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load reels");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Section>
      <div className="wnr-container">
        <div className="text-center max-w-2xl mx-auto">
          <h3 className="section-title text-[var(--wnr-berry)]">
            Sip. Share. Stay Rooted — Follow Us on Instagram
          </h3>
          <p className="mt-2 text-[14px] md:text-[18px] text-neutral-700">
            Follow us for daily wellness brews, rituals &amp; community stories
          </p>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : err ? (
          <div className="mt-6 space-y-2">
            <div className="text-center text-sm text-red-600">{err}</div>
            {process.env.NODE_ENV !== "production" && errDetails && (
              <pre className="text-xs bg-red-50 text-red-800 p-3 rounded overflow-x-auto max-h-64">
                {JSON.stringify(errDetails, null, 2)}
              </pre>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 text-center text-sm text-neutral-500">No reels available right now.</div>
        ) : (
          <ReelsCarousel items={items} />
        )}
      </div>
    </Section>
  );
}

/* --------------------------- Carousel --------------------------- */

function ReelsCarousel({ items }: { items: ReelItem[] }) {
  const [perView, setPerView] = useState(1);
  const [index, setIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);
  const [paused, setPaused] = useState(false);
  // ✅ Track if any video is playing (use counter to handle multiple videos)
  const videoPlayingCountRef = useRef(0);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const startXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const deltaXRef = useRef(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPerView(mq.matches ? 3 : 1);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const slides = useMemo(() => {
    if (items.length === 0) return [];
    const take = Math.min(perView, items.length);
    const head = items.slice(0, take);
    const tail = items.slice(-take);
    return [...tail, ...items, ...head];
  }, [items, perView]);

  const firstReal = Math.min(perView, items.length);
  const lastReal = firstReal + Math.max(0, items.length - 1);

  useEffect(() => { setIndex(firstReal); }, [perView, items.length]);

  useEffect(() => {
    if (items.length <= perView) return;
    const id = setInterval(() => {
      // ✅ Don't auto-scroll if paused, dragging, or video is playing
      if (!paused && !draggingRef.current && !videoPlaying) {
        setIndex((i) => i + 1);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [items.length, perView, paused, videoPlaying]);

  useEffect(() => {
    if (items.length === 0) return;
    if (index > lastReal) {
      const to = index - items.length;
      setTimeout(() => { setNoTransition(true); setIndex(to); requestAnimationFrame(() => setNoTransition(false)); }, 250);
    } else if (index < firstReal) {
      const to = index + items.length;
      setTimeout(() => { setNoTransition(true); setIndex(to); requestAnimationFrame(() => setNoTransition(false)); }, 250);
    }
  }, [index, firstReal, lastReal, items.length]);

  const basePct = perView > 0 ? -(100 / perView) * index : 0;
  const dragPct = perView > 0 && viewportRef.current
    ? (deltaXRef.current / viewportRef.current.clientWidth) * 100
    : 0;
  const translate = basePct + dragPct;

  const next = () => {
    // ✅ Don't allow navigation if video is playing
    if (!videoPlaying) setIndex((i) => i + 1);
  };
  const prev = () => {
    // ✅ Don't allow navigation if video is playing
    if (!videoPlaying) setIndex((i) => i - 1);
  };

  const onPointerDown = (x: number) => {
    // ✅ Don't allow dragging if video is playing
    if (videoPlaying) return;
    draggingRef.current = true;
    startXRef.current = x;
    deltaXRef.current = 0;
    setPaused(true);
  };
  const onPointerMove = (x: number) => {
    if (!draggingRef.current || startXRef.current == null) return;
    deltaXRef.current = x - startXRef.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${translate}%)`;
  };
  const endDrag = () => {
    if (!draggingRef.current) return;
    const threshold = (viewportRef.current?.clientWidth || 1) * 0.1;
    const dist = deltaXRef.current;
    draggingRef.current = false; startXRef.current = null; deltaXRef.current = 0;
    if (Math.abs(dist) > threshold) (dist < 0 ? next() : prev());
    setPaused(false);
  };

  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); onPointerDown(e.clientX); window.addEventListener("mousemove", onMouseMove); window.addEventListener("mouseup", onMouseUp, { once: true }); };
  const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX);
  const onMouseUp = () => { window.removeEventListener("mousemove", onMouseMove); endDrag(); };

  const onTouchStart = (e: React.TouchEvent) => onPointerDown(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => onPointerMove(e.touches[0].clientX);
  const onTouchEnd = () => endDrag();

  return (
    <div
      ref={viewportRef}
      className="group mt-6 md:mt-8 overflow-hidden rounded-2xl bg-transparent relative select-none mx-auto w-full max-w-screen-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => !draggingRef.current && setPaused(false)}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={trackRef}
        className={`flex gap-px md:gap-px px-[0.5px] md:px-[0.5px] will-change-transform ${noTransition || draggingRef.current ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translateX(${translate}%)` }}
      >
        {slides.map((r, i) => (
          <div key={`${r.id}-${i}`} className="flex-none basis-full md:basis-1/3">
            <CarouselCard 
              reel={r} 
              onVideoPlayingChange={(playing) => {
                // ✅ Use counter to handle multiple videos in carousel
                if (playing) {
                  videoPlayingCountRef.current += 1;
                  setVideoPlaying(true);
                } else {
                  videoPlayingCountRef.current = Math.max(0, videoPlayingCountRef.current - 1);
                  if (videoPlayingCountRef.current === 0) {
                    setVideoPlaying(false);
                  }
                }
              }} 
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 md:flex hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Previous">‹</button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 md:flex hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Next">›</button>

      <div className="md:hidden absolute inset-x-3 inset-y-0 flex items-center justify-between pointer-events-none">
        <button onClick={prev} className="pointer-events-auto h-10 w-10 rounded-full bg-white/90 shadow ring-1 ring-black/10" aria-label="Previous">‹</button>
        <button onClick={next} className="pointer-events-auto h-10 w-10 rounded-full bg-white/90 shadow ring-1 ring-black/10" aria-label="Next">›</button>
      </div>
    </div>
  );
}

/* --------------------------- Card --------------------------- */

function CarouselCard({ reel, onVideoPlayingChange }: { reel: ReelItem; onVideoPlayingChange?: (playing: boolean) => void }) {
  return (
    <div className="mx-auto h-[460px] md:h-[420px] lg:h-[480px] aspect-[9/16]">
      {reel.video ? (
        <HoverPlayVideo 
          mediaId={reel.id} 
          src={reel.video} 
          poster={reel.poster} 
          link={reel.url}
          onPlayingChange={onVideoPlayingChange}
        />
      ) : reel.url ? (
        <div className="card h-full w-full overflow-hidden rounded-xl">
          <iframe
            src={toEmbedUrl(reel.url)}
            className="h-full w-full"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <div className="card h-full w-full flex items-center justify-center text-neutral-500 text-xs rounded-xl">
          Reel unavailable
        </div>
      )}
    </div>
  );
}

/* --------------------------- Skeleton --------------------------- */

function SkeletonGrid() {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-px md:gap-px px-[0.5px] md:px-[0.5px]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="aspect-[9/16] h-[460px] md:h-[440px] lg:h-[480px] rounded-xl bg-black/5 animate-pulse" />
      ))}
    </div>
  );
}

/* --------------------------- Video --------------------------- */

function HoverPlayVideo({ mediaId, src, poster, link, onPlayingChange }: { mediaId: string; src: string; poster?: string; link?: string; onPlayingChange?: (playing: boolean) => void }) {
  const vref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // IntersectionObserver to pause videos when out of view
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) {
          v.pause();
        }
      });
    }, { threshold: 0.5 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // Play/pause based on hover state and notify parent
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    
    if (isHovered) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          onPlayingChange?.(true);
        })
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    }
  }, [isHovered, onPlayingChange]);

  // Also track video play/pause events directly
  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayingChange?.(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      onPlayingChange?.(false);
    };

    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);

    return () => {
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
    };
  }, [onPlayingChange]);

  // ✅ Use backend API for video streaming (avoids CORS and expired URLs)
  // The backend proxy fetches fresh signed URLs from Instagram Graph API
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
  const videoSrc = API_BASE 
    ? `${API_BASE}/api/instagram/stream/${mediaId}`
    : `/api/instagram/stream/${mediaId}`; // Fallback to frontend route if API_BASE not set

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        const v = vref.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
        if (v.paused) v.play().catch(() => {});
      }}
    >
      <video
        ref={vref}
        loop
        playsInline
        muted={muted}
        poster={poster}
        className="h-full w-full object-cover"
        preload="metadata"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      {link && (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="absolute top-2 right-2 bg-white/80 hover:bg-white px-2 py-1 text-[10px] rounded z-10"
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </a>
      )}
      <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-2 py-1 rounded pointer-events-none">
        {muted ? "Hover to play • Click for sound" : "Click to mute"}
      </div>
    </div>
  );
}

/* --------------------------- Helpers --------------------------- */

function toEmbedUrl(permalink: string) {
  try {
    const u = new URL(permalink);
    const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
    return `https://www.instagram.com${path}embed`;
  } catch {
    return permalink;
  }
}
