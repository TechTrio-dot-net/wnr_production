// src/components/home/Hero.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Head from "next/head";
import Image, { type StaticImageData } from "next/image";
import { usePathname } from "next/navigation";
import SingleBoxStage from "../../components/three/SingleBoxStage";

/* ========= SITE BASE (for canonical) ========= */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");

/* ========= HELPERS ========= */
const fromUrl = (src: string) => ({ src } as unknown as StaticImageData);

/** Cloudinary helper: inject f_auto,q_auto and optional width */
const cld = (url: string, { w }: { w?: number } = {}) => {
  if (!url) return url;
  const t = ["f_auto", "q_auto", w ? `w_${w}` : null].filter(Boolean).join(",");
  return url.replace("/upload/", `/upload/${t}/`);
};

/* ========= CLOUDINARY IMAGES ========= */
/* POWER */
const powerFront = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767122/Power_front_u7ppbt.jpg");
const powerBack = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767122/Power_back_jaxoae.jpg");
const powerLeft = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767123/Power_side1_smiiwg.jpg");
const powerRight = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767123/Power_side2_jf4qf1.jpg");
const powerTop = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767124/Power_top_mdpvhs.jpg");
const powerBottom = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767119/Power_bottom_p6gdnn.jpg");

/* DIGESTIVE */
const digestiveFront = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767132/Digestive_FRONT_rzfnm4.jpg");
const digestiveBack = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767131/Digestive_BACK_icworj.jpg");
const digestiveLeft = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767133/Digestive_SIDE1_hnvscj.jpg");
const digestiveRight = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767133/Digestive_SIDE2_vfmqex.jpg");
const digestiveTop = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767134/Digestive_TOP_kg6gwk.jpg");
const digestiveBottom = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767132/Digestive_BOTTOM_ic4pzr.jpg");

/* SUGARWISE */
const sugarwiseFront = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767129/Sugarwise_FRONT_lrervn.jpg");
const sugarwiseBack = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767128/Sugarwise_BACK_wjshqp.jpg");
const sugarwiseLeft = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767130/Sugarwise_SIDE1_tfjies.jpg");
const sugarwiseRight = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767130/Sugarwise_SIDE2_asv5qb.jpg");
const sugarwiseTop = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767131/Sugarwise_TOP_wmnnbr.jpg");
const sugarwiseBottom = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767128/Sugarwise_BOTTOM_rkc3fe.jpg");

/* SLIM */
const slimFront = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767125/Slim_FRONT_xfuvfk.jpg");
const slimBack = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767124/Slim_BACK_v6ru9r.jpg");
const slimLeft = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767125/Slim_SIDE1_zbwrf9.jpg");
const slimRight = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767127/Slim_SIDE2_ur6ver.jpg");
const slimTop = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767127/Slim_TOP_muce8v.jpg");
const slimBottom = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767124/Slim_BOTTOM_rp4d8k.jpg");

/* GUTEASE */
const guteaseFront = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767120/Gutease_FRONT_yqpae2.jpg");
const guteaseBack = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767119/Gutease_BACK_dki6zv.jpg");
const guteaseLeft = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767120/Gutease_SIDE1_omgly9.jpg");
const guteaseRight = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767122/Gutease_SIDE2_seh3ly.jpg");
const guteaseTop = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767121/Gutease_TOP_unzoic.jpg");
const guteaseBottom = fromUrl("https://res.cloudinary.com/dob666wa0/image/upload/v1761767119/Gutease_BOTTOM_azsknk.jpg");

/* ========= DESKTOP & MOBILE BANNERS ========= */
const bannerPower = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940705/Power_Banner_ngz7p9.png";
const bannerDigestive = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940705/Digestive_Banner_fpztqs.png";
const bannerSugarwise = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Sugarwise_Banner_ypscfh.png";
const bannerSlim = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Slim_Banner_efgcdp.png";
const bannerGutease = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Gutease_Banner_f1pzwf.png";

const bannerPowerMobile = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Power_Banner_mobile_ln2vy4.png";
const bannerDigestiveMobile = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Digestive_Banner_mobile_o2nj8e.png";
const bannerSugarwiseMobile = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Sugarwise_Banner_mobile_wa5irf.png";
const bannerSlimMobile = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Slim_Banner_mobile_aenmjz.png";
const bannerGuteaseMobile = "https://res.cloudinary.com/dob666wa0/image/upload/v1767940706/Gutease_Banner_mobile_ugjm4p.png";

/* ========= TYPES ========= */
type Faces = { front: string; back: string; left: string; right: string; top: string; bottom: string };
type ProductId = "power" | "digestive" | "sugarwise" | "slim" | "gutease";
type ProductConf = {
  id: ProductId;
  name: string;
  faces: Faces;
  heroClass: string;
  finalRot?: [number, number, number];
  banner: StaticImageData | string;
  bannerMobile: StaticImageData | string;
};

const facesFrom = (f: {
  front: StaticImageData; back: StaticImageData; left: StaticImageData;
  right: StaticImageData; top: StaticImageData; bottom: StaticImageData;
}): Faces => ({
  front: f.front.src, back: f.back.src, left: f.left.src, right: f.right.src, top: f.top.src, bottom: f.bottom.src,
});

/* ========= PRODUCTS ========= */
const PRODUCTS: ProductConf[] = [
  { id: "power", name: "POWER BREW", faces: facesFrom({ front: powerFront, back: powerBack, left: powerLeft, right: powerRight, top: powerTop, bottom: powerBottom }), heroClass: "hero-berry", finalRot: [-0.22, Math.PI / 6, 0.1], banner: bannerPower, bannerMobile: bannerPowerMobile },
  { id: "digestive", name: "DIGESTIVE BREW", faces: facesFrom({ front: digestiveFront, back: digestiveBack, left: digestiveLeft, right: digestiveRight, top: digestiveTop, bottom: digestiveBottom }), heroClass: "hero-digestive", finalRot: [-0.24, Math.PI / 5.2, 0.08], banner: bannerDigestive, bannerMobile: bannerDigestiveMobile },
  { id: "sugarwise", name: "SUGARWISE BREW", faces: facesFrom({ front: sugarwiseFront, back: sugarwiseBack, left: sugarwiseLeft, right: sugarwiseRight, top: sugarwiseTop, bottom: sugarwiseBottom }), heroClass: "hero-sugarwise", finalRot: [-0.22, Math.PI / 6, 0.06], banner: bannerSugarwise, bannerMobile: bannerSugarwiseMobile },
  { id: "slim", name: "SLIM BREW", faces: facesFrom({ front: slimFront, back: slimBack, left: slimLeft, right: slimRight, top: slimTop, bottom: slimBottom }), heroClass: "hero-slim", finalRot: [-0.2, Math.PI / 5.5, 0.05], banner: bannerSlim, bannerMobile: bannerSlimMobile },
  { id: "gutease", name: "GUTEASE BREW", faces: facesFrom({ front: guteaseFront, back: guteaseBack, left: guteaseLeft, right: guteaseRight, top: guteaseTop, bottom: guteaseBottom }), heroClass: "hero-gutease", finalRot: [-0.26, Math.PI / 5.8, 0.08], banner: bannerGutease, bannerMobile: bannerGuteaseMobile },
];

const toSrc = (x: string | StaticImageData) => (typeof x === "string" ? x : x.src);

/* ========= BANNER TEXT ========= */
type BannerText = {
  topLine: string;
  mainHeading: string;
  subheading: string;
  description: string;
};

const BANNER_TEXTS: Record<ProductId, BannerText> = {
  digestive: {
    topLine: "It's not Green Tea",
    mainHeading: "IT'S  HERBAL BREW",
    subheading: "A tangy ritual for happy digestion.",
    description: "A tangy blend designed with salts to improve digestion and reduce post meal sluggishness and heaviness",
  },
  gutease: {
    topLine: "Comforting herbal brew",
    mainHeading: "FOR HEALTHY GOOD HABIT  ",
    subheading: "Comfort from within.",
    description: "A natural blend of herbs to improve gut health and enhance appetite and support lightness after meals.",
  },
  slim: {
    topLine: "Not a green Tea",
    mainHeading: "A BALANCED HERBAL BREW",
    subheading: "Sip into balance.",
    description: "A healthy blend crafted with 15 herbs to naturally manage water retention, to reduce swelling and assist in healthy fat burn and boosting confidence.",
  },
  sugarwise: {
    topLine: "Mindful herbal brew",
    mainHeading: "A GOOD HABIT ",
    subheading: "Balance, naturally.",
    description: "A brew crafted with natural ingredients to support healthy blood sugar balance, enhance metabolism and ease diabetic wellness.",
  },
  power: {
    topLine: "Energy herbal brew",
    mainHeading: "FOR HEALTHY GOOD HABIT",
    subheading: "Strength rooted in nature.",
    description: "A premium brew designed to naturally boost energy levels and improve focus and reduce fatigue.",
  },
};

/* ========= FLOATING TITLES ========= */
const FLOATING_TITLES = [
  "Enjoy Herbal Brew for Healthy Good Habits",
  "It's not Green Tea, Its Herbal Brew",
  "Hot Herbal Brews, Healthy Habits",
];

/* ========= PREFETCH UTILS ========= */
const decodeCache = new Map<string, Promise<void>>();
function decodeImage(url: string, priority: "auto" | "high" = "auto"): Promise<void> {
  if (decodeCache.has(url)) return decodeCache.get(url)!;
  const p = new Promise<void>((resolve) => {
    const img = new window.Image();
    img.decoding = "async";
    // @ts-ignore
    if ("fetchPriority" in img) img.fetchPriority = priority;
    img.src = url;
    img.onload = () => (img.decode?.() ?? Promise.resolve()).finally(() => resolve());
    img.onerror = () => resolve();
  });
  decodeCache.set(url, p);
  return p;
}
function preloadProductFaces(product: ProductConf, priority: "auto" | "high" = "auto") {
  return Promise.all(Object.values(product.faces).map((u) => decodeImage(u, priority))).then(() => undefined);
}
function idle(cb: () => void, delay = 300) {
  const id = window.setTimeout(cb, delay);
  return () => window.clearTimeout(id);
}

/* ========= MAIN COMPONENT ========= */
export default function Hero() {
  const [idx, setIdx] = useState(0);
  const current = PRODUCTS[idx];
  const currentTitle = FLOATING_TITLES[idx % FLOATING_TITLES.length];

  // Optimize textures
  const facesOptimized = useMemo(() => {
    const f = current.faces;
    return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, cld(v, { w: 1024 })])) as Faces;
  }, [current]);

  // Canonical
  const pathname = usePathname();
  const canonicalUrl = useMemo(() => (pathname ? `${SITE_URL}${pathname}` : ""), [pathname]);

  /* UI states */
  const [hintsVisible, setHintsVisible] = useState(true);
  const [grabbing, setGrabbing] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Cursor-follow tooltip
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  const startRAF = useCallback(() => {
    if (frameRef.current) return;
    const tick = () => {
      const el = tooltipRef.current;
      if (el) {
        currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.18;
        currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.18;
        el.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, []);
  const stopRAF = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setHintsVisible(false), 10000);
    return () => window.clearTimeout(t);
  }, []);
  const dismissHints = useCallback(() => setHintsVisible(false), []);

  /* Preload current, then idle prefetch next */
  useEffect(() => {
    preloadProductFaces(current, "high");
  }, [current]);

  useEffect(() => {
    const cleanup = idle(() => {
      const n1 = (idx + 1) % PRODUCTS.length;
      const n2 = (idx + 2) % PRODUCTS.length;
      preloadProductFaces(PRODUCTS[n1], "auto");
      idle(() => preloadProductFaces(PRODUCTS[n2], "auto"), 400);
    }, 250);
    return cleanup;
  }, [idx]);

  /* Next product (click/tap or auto-rotate) */
  const next = useCallback(async () => {
    const targetIdx = (idx + 1) % PRODUCTS.length;
    const target = PRODUCTS[targetIdx];
    const decodePromise = preloadProductFaces(target, "high");
    const timeout = new Promise<void>((r) => setTimeout(r, 150));
    await Promise.race([decodePromise, timeout]);
    setIdx(targetIdx);
  }, [idx]);

  // Auto-advance products every 3 seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      void next();
    }, 3000);
    return () => window.clearInterval(id);
  }, [next]);

  /* Keyboard & pointer */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dismissHints();
        void next();
      }
    },
    [next, dismissHints]
  );

  const drag = useRef<{ down: boolean; moved: boolean }>({ down: false, moved: false });
  const onHeroPointerDown = useCallback(() => {
    drag.current = { down: true, moved: false };
    dismissHints();
  }, [dismissHints]);
  const onHeroPointerMove = useCallback(() => {
    if (drag.current.down) drag.current.moved = true;
  }, []);
  const onHeroPointerUp = useCallback(() => {
    const wasDrag = drag.current.down && drag.current.moved;
    drag.current = { down: false, moved: false };
    if (!wasDrag) void next();
  }, [next]);

  // Optimized banners
  const desktopBanner = cld(toSrc(current.banner), { w: 1920 });
  const mobileBanner = cld(toSrc(current.bannerMobile), { w: 1080 });

  return (
    <section
      className="relative min-h-[60vh] md:h-[80vh] text-white overflow-hidden"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onHeroPointerDown}
      onPointerMove={onHeroPointerMove}
      onPointerUp={onHeroPointerUp}
      aria-label={`Hero — ${current.name}. Click or press Space/Enter to view next product. Drag to rotate.`}
    >
      <Head>
        {!!canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

        {/* Preload banners (with proper camelCase attributes) */}
        <link
          rel="preload"
          as="image"
          href={desktopBanner}
          imageSrcSet={`${cld(toSrc(current.banner), { w: 1280 })} 1280w, ${desktopBanner} 1920w`}
          imageSizes="(min-width:1024px) 90vw, 100vw"
        />
        <link
          rel="preload"
          as="image"
          href={mobileBanner}
          media="(max-width: 768px)"
          imageSrcSet={`${cld(toSrc(current.bannerMobile), { w: 720 })} 720w, ${mobileBanner} 1080w`}
          imageSizes="100vw"
        />
        {Object.values(facesOptimized).map((u) => (
          <link key={u} rel="preload" as="image" href={u} />
        ))}
      </Head>

      {/* FULL-BLEED BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        {/* Desktop */}
        <Image
          src={desktopBanner}
          alt={`${current.name} banner background`}
          fill
          priority
          sizes="(min-width:1024px) 100vw, 100vw"
          fetchPriority="high"
          className="hidden md:block object-cover object-center"
        />
        {/* Mobile */}
        <Image
          src={mobileBanner}
          alt={`${current.name} banner background`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 100vw"
          fetchPriority="high"
          className="md:hidden object-cover object-center"
        />
      </div>

      {/* FLOATING TEXT */}
      <div className="absolute inset-0 z-10 flex items-start justify-center pt-30 md:pt-30 lg:pt-30 pointer-events-none">
        <div className="wnr-container w-full flex justify-center">
          {/* <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-bold text-center px-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {currentTitle}
          </h1> */}
        </div>
      </div>

      {/* CENTER CONTENT */}
      <div className="relative z-10 wnr-container flex flex-col md:flex-row items-center justify-center md:justify-start min-h-[inherit] pt-8 md:pt-2 md:-mt-4 gap-0">
        <div
          className={`relative w-full max-w-[1020px] max-h-[800px] overflow-visible select-none md:-ml-60 lg:-ml-70 xl:-ml-80 ${
            grabbing ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerEnter={() => {
            setHovering(true);
            startRAF();
          }}
          onPointerLeave={() => {
            setHovering(false);
            setGrabbing(false);
            stopRAF();
          }}
          onPointerMove={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            targetPos.current = { x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 };
          }}
          onPointerDownCapture={() => setGrabbing(true)}
          onPointerUpCapture={() => setGrabbing(false)}
          aria-describedby="hero-rotate-hint"
        >
          {/* cursor-follow tooltip (desktop) */}
          <div
            ref={tooltipRef}
            className={`pointer-events-none hidden md:flex items-center gap-2 absolute top-0 left-0 z-20 will-change-transform transition-opacity duration-150 ${
              hovering ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden="true"
          >
            <span className="rounded-full bg-black/55 backdrop-blur px-3 py-1 text-xs">Drag to rotate</span>
          </div>

          {/* 3D Stage */}
          <div className="relative z-10">
            <SingleBoxStage
              faces={facesOptimized}
              size={[3.8, 2.9, 2.5]}
              scale={0.87}
              minHeight={320}
              maxHeight={560}
              minWidth={260}
              maxWidth={820}
              safeMargin={{ x: 1.35, y: 1.25 }}
              intro={{
                enabled: true,
                duration: 1.1,
                from: { scale: 0.86, y: 0.25, z: -0.8, rot: [-0.6, 0.12, -0.18] },
                to: { scale: 1.0, y: 0, z: 0, rot: (current.finalRot ?? [-0.22, Math.PI / 6, 0.1]) },
              }}
              controlsRotate
              autoRotate
              rotateSpeed={0.48}
              theme="studio"
            />
          </div>

          {/* hints (auto-hide) */}
         {hintsVisible && (
  <>
    {/* Mobile hint */}
    <div className="md:hidden pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-5 z-20">
      <div className="rounded-full bg-black/55 backdrop-blur px-3 py-1.5 text-[12px] leading-tight whitespace-nowrap">
        Tap anywhere to view next • Drag to rotate
      </div>
    </div>

    {/* Desktop hint */}
    <div className="hidden md:flex pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-12 z-20">
      <div className="rounded-full bg-black/45 backdrop-blur px-4 py-2 text-sm">
        Click anywhere to view next • Press Space/Enter • Drag to rotate
      </div>
    </div>
  </>
)}

        </div>

        {/* MOBILE TEXT - Below 3D box */}
        <div className="w-full pb-6 text-center text-white md:hidden -mt-2">
          {(() => {
            const bannerText = BANNER_TEXTS[current.id];
            const isSlim = current.id === "slim";
            return (
              <>
                {/* Decorative squares */}
                <div className="flex justify-center mb-0.5">
                  <div className="relative w-4 h-4">
                    <span className={`absolute w-2 h-2 ${isSlim ? "bg-[var(--wnr-berry)]/40" : "bg-white/40"} left-0 bottom-0`}></span>
                    <span className={`absolute w-2 h-2 ${isSlim ? "bg-[var(--wnr-berry)]/40" : "bg-white/40"} right-0 top-0`}></span>
                  </div>
                </div>

                {/* Eyebrow */}
                <p className={`!text-[24px] font-medium tracking-wide leading-none ${isSlim ? "text-[var(--wnr-berry)] opacity-100" : "text-white opacity-90"}`}>
                  {bannerText.topLine}
                </p>

                {/* Main heading */}
                <h1 className={`mt-0 w-full !text-[24px] font-medium tracking-wide leading-[0.6] whitespace-nowrap ${isSlim ? "text-[var(--wnr-berry)]" : "text-white"}`}>
                  {bannerText.mainHeading}
                </h1>

                {/* Subheading */}
                <p className={`mt-0 !text-[18px] font-medium leading-none ${isSlim ? "text-[var(--wnr-berry)]" : "text-white"}`}>
                  {bannerText.subheading}
                </p>

                {/* Description */}
                <p className={`mt-0 !text-[10px] leading-tight line-clamp-3 ${isSlim ? "text-[var(--wnr-berry)] opacity-100" : "text-white opacity-90"} max-w-[160px] mx-auto`}>
                  {bannerText.description}
                </p>
              </>
            );
          })()}
        </div>
      </div>

        {/* DESKTOP TEXT OVERLAY */}
        <div className="absolute inset-0 z-10 pointer-events-none hidden md:flex wnr-container h-full items-center justify-end px-4">
          <div className="max-w-[600px] w-full text-right">
            {(() => {
              const bannerText = BANNER_TEXTS[current.id];
              const isSlim = current.id === "slim";
              const textColorClass = isSlim ? "text-[var(--wnr-berry)]" : "text-white";
              return (
                <>
                  <p className={`!text-[48px] tracking-wide leading-none font-medium ${isSlim ? "opacity-100" : "opacity-90"} ${textColorClass}`}>
                    {bannerText.topLine}
                  </p>

                  <h1 className={`mt-0 !text-[52px] font-medium tracking-wide leading-[0.9] whitespace-nowrap ${textColorClass}`}>
                    {bannerText.mainHeading}
                  </h1>

                  <p className={`mt-1 !text-[38px] font-medium leading-none ${textColorClass}`}>
                    {bannerText.subheading}
                  </p>

                  <p className={`-mt-2 !text-[19px] leading-[0.8] ${isSlim ? "opacity-100" : "opacity-90"} max-w-md ml-auto ${textColorClass}`}>
                    {bannerText.description}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
    </section>
  );
}
