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
        setErr(null);
        setErrDetails(null);
        const res = await fetch(`/api/instagram/reels?`, { cache: "no-store" });
        if (!res.ok) {
          let payload: any = undefined;
          try { payload = await res.json(); } catch { /* ignore */ }
          if (!alive) return;
          const errorMsg = payload?.error || `HTTP ${res.status}`;
          console.error("Instagram Reels API Error:", errorMsg, payload);
          setErr(errorMsg);
          setErrDetails(payload || null);
          setItems([]);
          return;
        }
        const json = await res.json();
        if (!alive) return;
        const data = Array.isArray(json?.data) ? json.data : [];
        if (process.env.NODE_ENV === 'development') {
          console.log("Instagram Reels loaded:", data.length, "items");
        }
        setItems(data);
        if (data.length === 0) {
          console.warn("No Instagram reels found. Check API configuration.");
        }
      } catch (e: any) {
        if (alive) {
          const errorMsg = e?.message || "Failed to load reels";
          console.error("Instagram Reels fetch error:", errorMsg, e);
          setErr(errorMsg);
          setItems([]);
        }
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
            <div className="text-center text-sm text-red-600 font-medium">
              {err}
            </div>
            {errDetails?.hint && (
              <div className="text-center text-xs text-neutral-600 mt-2 max-w-md mx-auto">
                {errDetails.hint}
              </div>
            )}
            {(process.env.NODE_ENV !== "production" || errDetails) && errDetails && (
              <details className="mt-4 text-center">
                <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700">
                  Show technical details
                </summary>
                <pre className="text-xs bg-red-50 text-red-800 p-3 rounded overflow-x-auto max-h-64 mt-2 text-left max-w-2xl mx-auto">
                  {JSON.stringify(errDetails, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 text-center">
            <div className="text-sm text-neutral-500">No reels available right now.</div>
            <div className="text-xs text-neutral-400 mt-1">
              Check Instagram API configuration or try again later.
            </div>
          </div>
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
    if (!videoPlaying) setIndex((i) => i + 1);
  };
  const prev = () => {
    if (!videoPlaying) setIndex((i) => i - 1);
  };

  const onPointerDown = (x: number) => {
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

function isInstagramCDNUrl(url: string): boolean {
  if (!url) return false;
  return /instagram\.(famd|cdninstagram\.com)|fbcdn\.net|cdninstagram\.com/i.test(url);
}

function HoverPlayVideo({ 
  mediaId, 
  src, 
  poster, 
  link, 
  onPlayingChange 
}: { 
  mediaId: string; 
  src: string; 
  poster?: string; 
  link?: string; 
  onPlayingChange?: (playing: boolean) => void;
}) {
  const vref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine which URL to use for the video
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
  const srcIsInstagramCDN = isInstagramCDNUrl(src);
  
  // Always use streaming API for Instagram videos (they require fresh signed URLs)
  // Only use direct src if it's explicitly NOT an Instagram CDN URL
  const streamUrl = API_BASE 
    ? `${API_BASE}/api/instagram/stream/${mediaId}`
    : `/api/instagram/stream/${mediaId}`;
  
  // Use streaming API unless src is NOT from Instagram CDN (rare case)
  const videoSrc = srcIsInstagramCDN ? streamUrl : src;

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Video ${mediaId}] Initializing:`, {
        src,
        videoSrc,
        srcIsInstagramCDN,
        API_BASE: API_BASE || 'none (using frontend route)',
        streamUrl
      });
    }
  }, [mediaId, src, videoSrc, srcIsInstagramCDN, API_BASE, streamUrl]);

  // Pre-flight check: Test if streaming API is accessible (for backend routes)
  // This is NON-BLOCKING - only for debugging/logging, doesn't prevent video from loading
  useEffect(() => {
    if (!srcIsInstagramCDN || !API_BASE) return; // Skip check for frontend routes or non-Instagram URLs
    
    let cancelled = false;
    const testUrl = `${API_BASE}/api/instagram/stream/${mediaId}`;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Quick GET request to check backend and get error details if any
    // Note: This is just for logging/warnings, NOT for blocking video loading
    fetch(testUrl, { 
      method: 'GET',
      signal: controller.signal
    })
      .then(async res => {
        clearTimeout(timeoutId);
        if (cancelled) return;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Video ${mediaId}] Backend check:`, {
            status: res.status,
            ok: res.ok,
            contentType: res.headers.get('content-type')
          });
        }
        
        // If backend returned an error, log it but don't block video loading
        // The video element will handle errors on its own
        if (!res.ok) {
          try {
            const errData = await res.json();
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[Video ${mediaId}] Backend pre-check warning:`, {
                status: res.status,
                error: errData.error || 'Unknown error',
                hint: errData.hint,
                where: errData.where,
                details: errData.details
              });
              
              // Special handling for token validation errors
              if (errData.error?.includes('access token') || errData.error?.includes('session has been invalidated')) {
                console.error(`[Video ${mediaId}] ⚠️ INSTAGRAM TOKEN ERROR:`);
                console.error('   The Instagram Access Token is invalid or expired.');
                console.error('   Error:', errData.error);
                console.error('   Fix: Update IG_ACCESS_TOKEN in backend .env file');
                console.error('   Get a new token from: https://developers.facebook.com/tools/explorer/');
              }
            }
          } catch {
            // Failed to parse JSON - might be a network error
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[Video ${mediaId}] Backend returned ${res.status} but response was not JSON`);
            }
          }
        }
      })
      .catch(err => {
        clearTimeout(timeoutId);
        if (cancelled) return;
        
        if (process.env.NODE_ENV === 'development') {
          const isAbort = err.name === 'AbortError';
          if (!isAbort) {
            console.warn(`[Video ${mediaId}] Backend pre-check failed:`, err.name, err.message);
            console.warn('   This might mean backend is unreachable, but video will still attempt to load');
          }
        }
      });
    
    return () => { 
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [mediaId, API_BASE, srcIsInstagramCDN]);

  // Reset states when source changes
  useEffect(() => {
    setHasError(false);
    setErrorMessage(null);
    setLoadingState('idle');
  }, [videoSrc, mediaId]);

  // IntersectionObserver to pause videos when out of view
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting && !v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.5 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // Handle play/pause on hover
  useEffect(() => {
    const v = vref.current;
    if (!v || hasError) return;
    
    if (isHovered) {
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (vref.current === v && !v.paused) {
              setIsPlaying(true);
              onPlayingChange?.(true);
            }
          })
          .catch((err) => {
            // Ignore expected errors
            if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
              return;
            }
            if (process.env.NODE_ENV === 'development' && vref.current === v) {
              console.warn(`[Video ${mediaId}] Play failed:`, err.name, err.message);
            }
            if (vref.current === v) {
              setHasError(true);
            }
          });
      }
    } else {
      v.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    }
  }, [isHovered, hasError, mediaId, onPlayingChange]);

  // Track video events
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
    
    // Add timeout to detect stuck loading
    let loadTimeout: NodeJS.Timeout | null = null;
    
    const handleLoadStart = () => {
      setLoadingState('loading');
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Video ${mediaId}] Load started:`, videoSrc);
      }
      
      // Set timeout - if video doesn't load in 15 seconds, show error
      loadTimeout = setTimeout(() => {
        if (vref.current && vref.current.readyState < 2) {
          // Video hasn't loaded enough data (readyState 2 = HAVE_CURRENT_DATA)
          if (process.env.NODE_ENV === 'development') {
            console.error(`[Video ${mediaId}] Load timeout after 15s. Video may be stuck.`);
            console.error(`[Video ${mediaId}] Current readyState:`, vref.current.readyState);
            console.error(`[Video ${mediaId}] Current networkState:`, vref.current.networkState);
          }
          setErrorMessage('Video loading timeout. Check if streaming API is working.');
          setHasError(true);
          setLoadingState('error');
        }
      }, 15000);
    };
    
    const handleCanPlay = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }
      setLoadingState('ready');
      setHasError(false);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Video ${mediaId}] Can play`);
      }
    };

    const handleError = (e: Event) => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
      }
      
      const video = e.target as HTMLVideoElement;
      const error = video.error;
      const videoSrcActual = video.src;
      
      setLoadingState('error');
      
      // Check what type of error we have
      const isDirectInstagramUrl = isInstagramCDNUrl(videoSrcActual);
      const isStreamingAPIUrl = videoSrcActual.includes('/api/instagram/stream/');
      
      // Try to fetch error details if it's a streaming API error (only once)
      if (isStreamingAPIUrl) {
        // Use a flag to prevent multiple fetches
        let fetched = false;
        const fetchErrorDetails = async () => {
          if (fetched) return;
          fetched = true;
          
          try {
            const errController = new AbortController();
            const errTimeoutId = setTimeout(() => errController.abort(), 3000);
            
            const res = await fetch(videoSrcActual, { signal: errController.signal });
            clearTimeout(errTimeoutId);
            
            if (!res.ok) {
              const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
              
              // Extract comprehensive error message
              let msg = errData.error || errData.message || `HTTP ${res.status}`;
              
              // Add helpful hints if available
              if (errData.hint) {
                msg += ` (${errData.hint})`;
              }
              
              // Special handling for token validation errors
              if (errData.error?.includes('access token') || 
                  errData.error?.includes('session has been invalidated') ||
                  errData.error?.includes('Error validating access token')) {
                msg = 'Instagram Access Token is invalid or expired. Update IG_ACCESS_TOKEN in backend .env';
              }
              
              setErrorMessage(msg);
              
              if (process.env.NODE_ENV === 'development') {
                console.error(`[Video ${mediaId}] Streaming API error details:`, {
                  status: res.status,
                  error: errData.error,
                  hint: errData.hint,
                  where: errData.where,
                  details: errData.details,
                  request_url: errData.request_url
                });
              }
            }
          } catch (fetchErr: any) {
            // Fetch failed - backend might be down or CORS issue
            const msg = fetchErr.name === 'AbortError'
              ? 'Streaming API timeout. Backend may be slow or unreachable.'
              : 'Cannot connect to streaming API. Check if backend is running.';
            setErrorMessage(msg);
            if (process.env.NODE_ENV === 'development') {
              console.error(`[Video ${mediaId}] Failed to fetch error details:`, fetchErr.name, fetchErr.message);
            }
          }
        };
        fetchErrorDetails();
      }
      
      const errorDetails = {
        mediaId,
        errorCode: error?.code,
        errorMessage: error?.message,
        videoSrc,
        actualSrc: videoSrcActual,
        networkState: video.networkState,
        readyState: video.readyState,
        isDirectInstagramUrl,
        isStreamingAPIUrl,
      };

      // Log detailed error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Video ${mediaId}] Video ERROR:`, errorDetails);
        
        if (isStreamingAPIUrl) {
          console.error(`[Video ${mediaId}] Streaming API failed. Possible causes:`);
          console.error('  1. Backend at', API_BASE || 'frontend', 'is not running');
          console.error('  2. IG_USER_ID or IG_ACCESS_TOKEN are missing/incorrect');
          console.error('  3. Media ID is invalid or token lacks permissions');
          console.error('  4. Check Network tab - look for', videoSrcActual);
          console.error('  5. If response is JSON, backend returned an error (check response body)');
        } else if (isDirectInstagramUrl) {
          console.error(`[Video ${mediaId}] Direct Instagram CDN URL will always 403. Use streaming API instead.`);
        }
        
        // Error code meanings
        if (error?.code) {
          const codeMap: Record<number, string> = {
            1: 'MEDIA_ERR_ABORTED - Loading aborted',
            2: 'MEDIA_ERR_NETWORK - Network error',
            3: 'MEDIA_ERR_DECODE - Decode error',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source not supported'
          };
          console.error(`[Video ${mediaId}] Error code ${error.code}:`, codeMap[error.code] || 'Unknown');
        }
      }

      // Set error state - show error UI
      setHasError(true);
      if (!errorMessage) {
        setErrorMessage(error?.message || 'Failed to load video');
      }
    };

    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    v.addEventListener("loadstart", handleLoadStart);
    v.addEventListener("canplay", handleCanPlay);
    v.addEventListener("error", handleError);

    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("loadstart", handleLoadStart);
      v.removeEventListener("canplay", handleCanPlay);
      v.removeEventListener("error", handleError);
    };
  }, [mediaId, videoSrc, onPlayingChange, API_BASE]);

  const isInstagramCDNPoster = isInstagramCDNUrl(poster || "");

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl cursor-pointer bg-black/5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        const v = vref.current;
        if (!v || hasError) return;
        v.muted = !v.muted;
        setMuted(v.muted);
        if (v.paused) {
          v.play().catch(() => {});
        }
      }}
    >
      {hasError ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-neutral-500 text-xs p-4">
          <p className="font-medium">Video unavailable</p>
          {errorMessage && (
            <p className="mt-2 text-[10px] opacity-75 max-w-full text-center break-words px-2">
              {errorMessage}
            </p>
          )}
          {process.env.NODE_ENV === 'development' && errorMessage?.includes('Access Token') && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] max-w-md text-left">
              <p className="font-semibold text-yellow-800 mb-1">How to fix:</p>
              <ol className="list-decimal list-inside space-y-1 text-yellow-700">
                <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline">Facebook Graph API Explorer</a></li>
                <li>Generate a new Page Access Token or Instagram Business Account Token</li>
                <li>Update <code className="bg-yellow-100 px-1 rounded">IG_ACCESS_TOKEN</code> in <code className="bg-yellow-100 px-1 rounded">backend/.env</code></li>
                <li>Restart the backend server</li>
              </ol>
            </div>
          )}
          {process.env.NODE_ENV === 'development' && !errorMessage?.includes('Access Token') && (
            <p className="mt-1 text-[10px] opacity-50">Check console & Network tab for details</p>
          )}
          {link && (
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mt-2 text-[var(--wnr-berry)] hover:underline"
            >
              View on Instagram →
            </a>
          )}
        </div>
      ) : (
        <>
          <video
            ref={vref}
            loop
            playsInline
            muted={muted}
            className="h-full w-full object-cover"
            preload="metadata"
            key={`${mediaId}-${videoSrc}`}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          
          {poster && !posterError && !isPlaying && !isInstagramCDNPoster && (
            <img
              src={poster}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
              onError={() => setPosterError(true)}
              loading="lazy"
            />
          )}
          
          {loadingState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
              <div className="text-white text-xs">Loading...</div>
            </div>
          )}
          
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
        </>
      )}
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
