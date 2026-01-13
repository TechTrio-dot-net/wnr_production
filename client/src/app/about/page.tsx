"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

/**
 * ABOUT — Wild n Root (Animated, TS-safe)
 * - Cross-fade carousel (looping autoplay, no UI)
 * - Once-per-view section reveals
 * - Respects prefers-reduced-motion
 */

/* --------------------------------- EASING --------------------------------- */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // easeOut-like

/* ------------------------------- VARIANTS --------------------------------- */
const makeFadeUp = (distance = 24): Variants => ({
  hidden: { opacity: 0, y: distance },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
});

const makeSlide = (xFrom = -24): Variants => ({
  hidden: { opacity: 0, x: xFrom },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
});

const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

const heroH1Variants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
};

/* -------------------------- SECTION REVEAL WRAPPER ------------------------ */
function SectionReveal({
  children,
  stagger = 0.08,
  className = "",
}: {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
}) {
  const variants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------- MINIMAL CROSSFADE CAROUSEL -------------------- */
const CAROUSEL_IMAGES = [
  "/images/about/carousel-1.jpg",
  "/images/about/carousel-2.jpg",
  "/images/about/carousel-3.jpg",
  "/images/about/carousel-4.jpg",
  "/images/about/carousel-5.jpg",
];

/* -------------------------- CERTIFICATE CAROUSEL -------------------- */
const CERTIFICATES = [
  { 
    number: "DIPP136785",
    logoUrl: "/images/about/certificate-1.png"
  },
  { 
    number: "20725038002230",
    logoUrl: "/images/about/certificate-2.png"
  },
];

const DEFAULT_LOGO_URL = "/images/WNR-Logo.png";

function CertificateCarousel({
  certificates = CERTIFICATES,
  interval = 5000,
  fadeMs = 500,
}: {
  certificates?: Array<{ number: string; logoUrl?: string }>;
  interval?: number;
  fadeMs?: number;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = certificates.length;

  useEffect(() => {
    if (reduce || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [reduce, count, interval]);

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-soft bg-white p-8 md:p-12">
      <div className="flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px]">
        {certificates.map((cert, i) => {
          const isActive = i === index;
          return (
            <motion.div
              key={i}
              className="absolute inset-0 flex flex-col items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: isActive ? 1 : 0,
                y: isActive ? 0 : 20,
              }}
              transition={{ duration: fadeMs / 1000, ease: EASE }}
              style={{ pointerEvents: isActive ? "auto" : "none" }}
            >
              {/* Logo */}
              <div className="relative w-48 md:w-64 h-auto mb-6">
                <Image
                  src={cert.logoUrl || DEFAULT_LOGO_URL}
                  alt={`Certificate ${cert.number} Logo`}
                  width={256}
                  height={96}
                  className="w-full h-auto object-contain"
                  priority={i === 0}
                />
              </div>
              
              {/* Certificate Number */}
              <div className="text-center">
                <p className="text-sm md:text-base text-neutral-600 mb-2">Certificate Number</p>
                <p className="text-xl md:text-2xl font-semibold text-[var(--wnr-berry)]">
                  {cert.number}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Indicator dots */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {certificates.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? "bg-[var(--wnr-berry)] w-6" : "bg-neutral-300"
              }`}
              aria-label={`Go to certificate ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CrossfadeCarousel({
  images = CAROUSEL_IMAGES,
  interval = 1600, // faster loop
  fadeMs = 360,    // quick cross-fade
}: {
  images?: string[];
  interval?: number;
  fadeMs?: number;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = images.length;

  useEffect(() => {
    if (reduce || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [reduce, count, interval]);

  return (
    <div className="relative overflow-hidden rounded-xl shadow-soft ring-1 ring-black/5 bg-white">
      {/* 16:9 stage */}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        {images.map((src, i) => {
          const isActive = i === index;
          return (
            <motion.div
              key={i}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ duration: fadeMs / 1000, ease: EASE }}
              style={{ pointerEvents: isActive ? "auto" : "none" }}
            >
              <Image
                src={src}
                alt={`Slide ${i + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 900px, 100vw"
                priority={i === 0}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================= */

export default function AboutPage() {
  const reduce = useReducedMotion();
  const vidRef = useRef<HTMLVideoElement>(null); // kept for future if you re-add video

  return (
    <main className="bg-white text-[var(--wnr-text)]">
      {/* 1) HERO — white */}
      <section className="pt-16 md:pt-24 mt-[calc(5rem+var(--offer-strip-height,0px))] bg-[var(--wnr-sand)]/60">
        <div className="wnr-container">
          <SectionReveal>
            <motion.h1
              variants={
                reduce
                  ? ({ hidden: { opacity: 0 }, visible: { opacity: 1 } } as Variants)
                  : heroH1Variants
              }
              className="!text-[42px] md:!text-[64px] lg:!text-[88px] !leading-[1.06] font-semibold text-center tracking-tight"
            >
              Good Habit Start Here
            </motion.h1>

            <motion.p
              className="mt-6 md:mt-8 max-w-3xl mx-auto text-center text-[15px] md:text-lg leading-relaxed text-neutral-700"
              variants={makeFadeUp(16)}
            >
              At Wild n' Root, we introduce a family of brews crafted from natural ingredients
              designed to nurture both body and soul. From boosting energy to aiding digestion,
              every blend is created with a purpose—helping you feel lighter, clearer, and more in
              tune with yourself. Rooted in nature and enriched with modern science, Wild n' Root is
              more than brew—it’s a lifestyle.
            </motion.p>
          </SectionReveal>
        </div>
      </section>

      {/* 2) ROOTED READS — minimal cross-fade carousel (no UI, fast loop) */}
      <section className="py-10 md:py-14 bg-[var(--wnr-sand)]/60">
        <div className="wnr-container">
          <div className="mx-auto max-w-4xl">
            <SectionReveal>
              <motion.div variants={fadeIn}>
                <CrossfadeCarousel images={CAROUSEL_IMAGES} interval={1600} fadeMs={360} />
              </motion.div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* 2.5) CERTIFICATE — white (logo carousel with certificate numbers) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="wnr-container">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
            {/* Left copy */}
            <SectionReveal>
              <motion.div variants={makeFadeUp(16)}>
                <h2 className="text-3xl md:text-5xl font-semibold leading-tight">
                  Wild n' Root Certificate
                </h2>
                <p className="mt-4 text-neutral-700 leading-relaxed">
                  At Wild n' Root, we take pride in ensuring our brews meet the highest quality
                  standards. Our certification stands as a testament to our commitment to purity,
                  authenticity, and mindful wellness. Every cup you sip is backed by care, trust,
                  and tradition.
                </p>
              </motion.div>
            </SectionReveal>

            {/* Right: certificate carousel */}
            <SectionReveal>
              <motion.div variants={fadeIn}>
                <CertificateCarousel 
                  certificates={CERTIFICATES}
                  interval={3000}
                  fadeMs={500}
                />
              </motion.div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* 4) LITTLE HISTORY — white */}
      <section className="py-14 md:py-20 bg-white">
        <div className="wnr-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 items-start">
            {/* Col 1: Left rail */}
            <SectionReveal>
            <motion.aside variants={makeSlide(-20)} className="space-y-6 lg:sticky lg:top-24">
  <div>
    <div className="text-[11px] tracking-[0.18em] text-[color:var(--wnr-berry,#5A1D3D)] font-semibold">
      A LITTLE HISTORY
    </div>
    <div className="mt-2 text-xl md:text-2xl font-semibold">Rooted in the family kitchen</div>
    <p className="mt-3 text-sm text-neutral-700">
      Born from simple home recipes, Wild n' Root turns time-tested herbs, roots and spices into
      easy, everyday brews you can trust—without caffeine or compromise.
    </p>
  </div>

  <div>
    <div className="text-xl md:text-2xl font-semibold">Still crafting mindful moments</div>
    <ul className="mt-3 space-y-2 text-sm text-neutral-700">
     
      <li>• Balanced for taste and daily wellness</li>
      <li>• Small-batch blends, consistent quality</li>
    </ul>
  </div>

  <Link
    href="/products"
    aria-label="Shop all Wild n' Root brews"
    className="inline-flex items-center justify-center mt-2 h-10 px-5 rounded-full ring-1 ring-black/10 bg-white hover:bg-black/5 transition"
  >
    Explore All Brews
  </Link>
</motion.aside>

            </SectionReveal>

            {/* Col 2: Image */}
            <SectionReveal>
              <motion.div
                variants={fadeIn}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-soft"
              >
                <Image
                  src="/images/about/history-image.jpg"
                  alt="Pouring a warm Wild n' Root brew"
                  fill
                  className="object-cover"
                  sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                />
              </motion.div>
            </SectionReveal>

            {/* Col 3: Copy */}
            <SectionReveal>
             <motion.div variants={makeFadeUp(16)} className="md:pl-2">
  <h3 className="text-2xl md:text-3xl font-semibold leading-tight">
    Every brew is crafted with hand-picked herbs, roots & spices.
  </h3>
  <p className="mt-3 text-neutral-700">
    At Wild n' Root, we blend nature’s finest botanicals to bring you balance, focus and calm —
    without caffeine or compromise. Each cup is a simple ritual of wellness, made to energize your
    body and refresh your mind, naturally.
  </p>
</motion.div>

            </SectionReveal>
          </div>
        </div>
      </section>

      {/* 5) MISSION — sand */}
      <section className="py-16 md:py-24 bg-[var(--wnr-sand)]/60">
        <div className="wnr-container">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <SectionReveal>
              <motion.div
                variants={makeSlide(-22)}
                className="relative h-[240px] md:h-[360px] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-soft"
              >
                <Image
                  src="/images/about/mission-image.jpg"
                  alt="Sharing a warm brew outdoors"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </motion.div>
            </SectionReveal>

            <SectionReveal>
              <motion.div variants={makeSlide(22)}>
                <h3 className="text-3xl md:text-4xl font-semibold">Our mission</h3>
                <p className="mt-4 text-neutral-700 leading-relaxed">
                  At Wild n’ Root, our mission is to empower individuals to embrace health and
                  wellness. We believe health does not have to be complicated, it can start with a
                  good habit that makes you feel good from the inside out. Guided by the wisdom of
                  traditional herbs and supported by modern wellness science, we craft products that
                  are both functional and flavorful, making healthy living accessible and enjoyable.
                  We exist to remind everyone that wellness can be simple, natural and deeply
                  rooted. An everyday practice that grows from within and connects us back to
                  nature’s healing power.
                </p>

                <div className="mt-6 flex gap-3">
                  <Link
                    href="/faq"
                    className="h-10 px-5 rounded-full ring-1 ring-black/10 bg-white hover:bg-black/5 transition inline-flex items-center justify-center"
                  >
                    Learn More
                  </Link>
                  <Link
                    href="/contact"
                    className="h-10 px-5 rounded-full text-white bg-[var(--wnr-berry)] hover:opacity-90 transition inline-flex items-center justify-center"
                  >
                    Get in Touch
                  </Link>
                </div>
              </motion.div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* 6) JOIN OUR TEAM — white */}
      <section className="py-16 md:py-24 bg-white">
  <div className="wnr-container">
    <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
      <SectionReveal>
        <motion.div variants={makeSlide(-22)}>
          <h3 className="text-4xl md:text-5xl font-semibold">Join Our Team</h3>
          <p className="mt-6 text-[15px] md:text-lg leading-relaxed text-neutral-700">
            We’re a collective of curious minds — creators, explorers, nature lovers, and wellness
            enthusiasts — united by a shared purpose: to make mindful living simple and joyful.
            At Wild n' Root, every idea, sip, and story connects us closer to nature’s rhythm and
            to each other. If you believe in blending creativity with conscious living, you’ll fit
            right in.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:info@wildnroot.com"
              className="h-11 px-6 rounded-full ring-1 ring-black/10 bg-white hover:bg-black/5 transition inline-flex items-center justify-center"
            >
              Send Your Resume
            </a>
          </div>
        </motion.div>
      </SectionReveal>

      <SectionReveal>
        <motion.div
          variants={makeSlide(22)}
          className="relative h-[260px] md:h-[420px] rounded-3xl overflow-hidden ring-1 ring-black/5 shadow-soft"
        >
          <Image
            src="/images/about/team-image.jpg"
            alt="Wild n' Root Team"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </motion.div>
      </SectionReveal>
    </div>
  </div>
</section>

    </main>
  );
}
