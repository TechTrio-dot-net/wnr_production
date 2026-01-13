// src/app/stories/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, Variants, useReducedMotion } from "framer-motion";

/**
 * STORIES — Wild n Root
 * Sections:
 *  1) Hero: headline + subcopy
 *  2) Featured Stories: 3-card editorial grid
 *  3) Our Journey (timeline strip)
 *  4) Voices (quotes) + CTA
 *
 * Notes:
 *  - Minimal, modern layout using your brand tokens (cream / sand / berry)
 *  - Animations run once per section; TS-safe Variants + cubic-bezier easing
 *  - Replace placeholder images and links with your own when ready
 */

// ---------------- Anim helpers (TS-safe) ----------------
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const makeFadeUp = (distance = 20): Variants => ({
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

// ---------------- Mock data (replace later with DB) ----------------
const stories = [
  {
    slug: "kavya-focus-ritual",
    title: "How Kavya built a calming focus ritual for long study days",
    excerpt:
      "A small morning habit with herbs and adaptogens helped her swap jitters for gentle clarity.",
    image: "/images/stories/story-1.jpg",
    tag: "Focus",
  },
  {
    slug: "arjun-gut-comfort",
    title: "Arjun’s evening brew for gut comfort after late dinners",
    excerpt:
      "Warm spices and roots become a nightly, easy-to-love routine that supports digestion.",
    image: "/images/stories/story-2.jpg",
    tag: "Digestive",
  },
  {
    slug: "mira-wind-down",
    title: "Mira’s 3-step wind-down ritual for deeper sleep",
    excerpt:
      "A simple evening cadence: unplug, slow brew, a few breaths—done consistently.",
    image: "/images/stories/story-3.jpg",
    tag: "Calm",
  },
];

export default function StoriesPage() {
  const reduce = useReducedMotion();

  return (
    <main className="bg-[var(--wnr-cream)] text-[var(--wnr-text)]">
      {/* 1) HERO */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16 mt-[calc(5rem+var(--offer-strip-height,0px))]">
        <div className="wnr-container">
          <SectionReveal>
            <motion.h1
              className="!text-[42px] md:!text-[64px] lg:!text-[82px] !leading-[1.06] font-semibold text-center tracking-tight"
              variants={
                reduce
                  ? ({ hidden: { opacity: 0 }, visible: { opacity: 1 } } as Variants)
                  : {
                      hidden: { opacity: 0, y: 32, scale: 0.98 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.9, ease: EASE },
                      },
                    }
              }
            >
              Everyday rituals, real stories
            </motion.h1>

            <motion.p
              className="mt-5 md:mt-7 max-w-3xl mx-auto text-center text-[15px] md:text-lg leading-relaxed text-neutral-700"
              variants={makeFadeUp(14)}
            >
              Meet the people behind the cups—students, creators, new parents—each crafting
              a small practice that makes their days calmer, clearer, and a little more joyful.
            </motion.p>
          </SectionReveal>
        </div>
      </section>

      {/* 2) FEATURED STORIES GRID */}
      <section className="pb-14 md:pb-20 ">
        <div className="wnr-container">
          <SectionReveal className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((s, i) => (
              <motion.article
                key={s.slug}
                variants={fadeIn}
                className="group rounded-2xl bg-white ring-1 ring-black/5 shadow-soft overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                    priority={i === 0}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[var(--wnr-berry)]/90 text-white text-[10px] px-2 py-1 tracking-wide">
                    {s.tag}
                  </span>
                </div>

                <div className="p-4 md:p-5 flex-1 flex flex-col">
                  <h3 className="text-base md:text-lg font-semibold leading-tight line-clamp-2">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600 line-clamp-3">{s.excerpt}</p>

                  <div className="mt-4 md:mt-5">
                    <Link
                      href={`/stories/${s.slug}`}
                      className="inline-flex items-center h-10 px-4 rounded-full text-white bg-[var(--wnr-berry)] hover:opacity-90 transition"
                    >
                      Read Story
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </SectionReveal>
        </div>
      </section>

      {/* 3) JOURNEY STRIP (Timeline) */}
      <section className="py-14 md:py-20 bg-[var(--wnr-sand)]/70">
        <div className="wnr-container">
          <SectionReveal>
            <motion.h2
              variants={makeFadeUp(14)}
              className="text-2xl md:text-3xl font-semibold text-center"
            >
              A small ritual, a kinder rhythm
            </motion.h2>

            <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  title: "Notice",
                  body: "A moment of stress, a late dinner, or foggy focus—start by noticing.",
                },
                {
                  title: "Choose",
                  body: "Pick a simple brew: digestif after meals, calm at night, focus in AM.",
                },
                {
                  title: "Repeat",
                  body: "Keep it tiny and consistent. 5–10 minutes beats perfection.",
                },
                {
                  title: "Feel",
                  body: "Less noise, more ease. When it’s simple, it sticks.",
                },
              ].map((step, idx) => (
                <motion.div
                  key={step.title}
                  variants={makeSlide(idx % 2 ? 18 : -18)}
                  className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5"
                >
                  <div className="text-[11px] tracking-[0.18em] text-[var(--wnr-berry)] font-semibold">
                    STEP {idx + 1}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{step.title}</div>
                  <p className="mt-2 text-sm text-neutral-700">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* 4) QUOTES + CTA */}
      <section className="py-14 md:py-20">
        <div className="wnr-container">
          <SectionReveal>
            <motion.div
              variants={fadeIn}
              className="grid md:grid-cols-3 gap-6 md:gap-8 items-stretch"
            >
              {[
                {
                  quote:
                    "Ten minutes with a warm cup, and my brain finally stops racing. It’s become my favorite part of the day.",
                  author: "Kavya • Grad Student",
                },
                {
                  quote:
                    "After dinner I don’t feel heavy anymore. It’s such a small change—now I look forward to it every evening.",
                  author: "Arjun • New Dad",
                },
                {
                  quote:
                    "I used to chase a dozen hacks. Now it’s just one ritual—slow, consistent, kind.",
                  author: "Mira • Designer",
                },
              ].map((q) => (
                <div
                  key={q.author}
                  className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-6 flex flex-col justify-between"
                >
                  <p className="text-[15px] md:text-base leading-relaxed">“{q.quote}”</p>
                  <div className="mt-4 text-xs tracking-wide uppercase text-neutral-500">
                    {q.author}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              variants={makeFadeUp(20)}
              className="mt-[calc(5rem+var(--offer-strip-height,0px))] md:mt-12 text-center"
            >
              <Link
                href="/products"
                className="inline-flex items-center h-11 px-6 rounded-full text-white bg-[var(--wnr-berry)] hover:opacity-90 transition"
              >
                Explore Functional Brews
              </Link>
            </motion.div>
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
