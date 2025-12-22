"use client";

import { useEffect, useRef, useState } from "react";
import Section from "../../components/common/Section";
import Image from "next/image";
import Link from "next/link";
import { fetchBlogs, type BlogPost } from "@/lib/blog";

type BlogCard = {
  id: string;
  slug?: string;
  title: string;
  image: string;
  date: string;
  excerpt: string;
  href?: string;
};

/** ===== Carousel images ===== */
// Place your carousel images in: public/images/carousel/
// Expected filenames: carousel-1.jpg, carousel-2.jpg, carousel-3.jpg, carousel-4.jpg, carousel-5.jpg
const CAROUSEL_IMAGES = [
  "/images/carousel/carousel-1.jpg",
  "/images/carousel/carousel-2.jpg",
  "/images/carousel/carousel-3.jpg",
  "/images/carousel/carousel-4.jpg",
  "/images/carousel/carousel-5.jpg",
];

export default function RootedReads() {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [homeItems, setHomeItems] = useState<BlogCard[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<number | null>(null);

  // Fetch blogs from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBlogs({ limit: 4 });
        if (!cancelled) {
          const items: BlogCard[] = data.items.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            image: a.image || a.featuredImage || "",
            date: a.date || "",
            excerpt: a.excerpt,
            href: a.href ?? (a.id ? `/blog/${a.id}` : "#"),
          }));
          setHomeItems(items);
        }
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
        if (!cancelled) setHomeItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Note: Next.js Image component handles preloading automatically
  // No manual preloading needed - this reduces storage usage

  // autoplay rotation
  useEffect(() => {
    const start = () => {
      if (timerRef.current) return;
      timerRef.current = window.setInterval(() => {
        setActive((i) => (i + 1) % CAROUSEL_IMAGES.length);
      }, 2800);
    };
    const stop = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    if (!hovering) start();
    else stop();
    return stop;
  }, [hovering]);

  return (
    <Section>
      {/* 1) Title */}
      <div className="wnr-container">
        <h3 className="section-title text-center text-[var(--wnr-berry)] mb-20">
          ROOTED READS
        </h3>
      </div>

      {/* 2) Blog grid */}
      <div className="relative mt-4">
        <div className="absolute inset-x-0 -z-10 top-[120px] md:top-[140px] bottom-0 bg-[var(--wnr-sand)]" />

        <div className="wnr-container">
         <div className="-mt-6 md:-mt-10 relative z-10">
    <div className="mx-auto max-w-3xl">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl bg-white ring-1 ring-black/5 shadow-soft h-64"
            />
          ))}
        </div>
      ) : homeItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {homeItems.map((a) =>
            a.href && a.image ? (
              <Link
                key={a.id}
                href={a.href || `/blog/${a.id}`}
                className="group flex h-full flex-col rounded-xl bg-white ring-1 ring-black/5 shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition"
                prefetch={true}
              >
                {/* Image */}
                <div className="p-3 md:p-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden ring-1 ring-black/5">
                    <Image
                      src={a.image}
                      alt={a.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="px-4 pb-4 pt-0 flex-1 flex flex-col">
                  {a.date && (
                    <time
                      dateTime={a.date}
                      className="block text-[10px] md:text-xs tracking-wide uppercase text-neutral-500"
                    >
                      {a.date}
                    </time>
                  )}
                  <h4 className="mt-1 text-sm md:text-[15px] font-semibold line-clamp-2 transition-colors group-hover:text-[var(--wnr-berry)]">
                    {a.title}
                  </h4>
                  <p className="mt-2 text-xs md:text-[13px] text-neutral-600 line-clamp-3">
                    {a.excerpt}
                  </p>
                </div>
              </Link>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  </div>

          {/* ==== Carousel ==== */}
          <div className="mt-6 md:mt-16" />
          <div className="mx-auto max-w-5xl">
            <div
              className="relative rounded-xl overflow-hidden shadow-soft ring-1 ring-black/5 bg-black/5 aspect-[16/9]"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              aria-label="Featured moments carousel"
            >
              {CAROUSEL_IMAGES.map((src, i) => (
                <div
                  key={src}
                  className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
                    active === i ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Carousel ${i + 1}`}
                    fill
                    priority={i === 0 || i === 1}
                    loading={i < 2 ? "eager" : "lazy"}
                    sizes="(min-width: 1024px) 900px, (min-width: 768px) 100vw, 100vw"
                    quality={85}
                    className={`object-cover transition-transform duration-[4000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      active === i ? "scale-100" : "scale-[1.06]"
                    }`}
                  />
                </div>
              ))}

              {/* Gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/10" />
            </div>
          </div>

          <div className="mt-10 md:mt-12 md:pb-10" />
        </div>
      </div>
    </Section>
  );
}
