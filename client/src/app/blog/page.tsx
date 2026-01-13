// src/app/blog/page.tsx
"use client";

/**
 * BLOG — Wild n' Root
 * ---------------------------------------------------------------------------
 * Data source (for now):
 *   import { blogPosts } from "@/data/Blog";
 *   Expected shape (minimum):
 *   {
 *     id: string;
 *     title: string;
 *     excerpt: string;
 *     image: string;     // hero/cover image path
 *     date?: string;     // e.g. "12 Feb 2025" or ISO
 *     href?: string;     // optional custom link, else we'll build /blog/<id>
 *     tags?: string[];   // optional
 *     author?: string;   // optional
 *   }
 *
 * Features:
 *   - Featured post (first item after sort desc by date)
 *   - Search (title + excerpt) with debounce
 *   - Tag filter chips (auto from data)
 *   - Client-side pagination (Load more)
 *   - Modern card UI with subtle animations (no layout shift)
 *   - Accessible, keyboard-friendly
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IoSearchOutline, IoPricetagOutline, IoTimeOutline } from "react-icons/io5";
import { fetchBlogs, type BlogPost } from "@/lib/blog";

// ----------------------------- Types & Utils --------------------------------
type Blog = BlogPost;

// Try to parse any human date; fallback to 0
const toTime = (d?: string) => {
  if (!d) return 0;
  // Support: "12 Feb 2025", "05 Mar 2025", ISO, etc.
  const parsed = Date.parse(d);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// Basic reading-time estimate from excerpt length (placeholder)
const readingTime = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  // ~200 wpm; min 1 minute
  return Math.max(1, Math.round(words / 200));
};

// Debounce hook (to avoid filtering on every keystroke)
function useDebounced<T>(value: T, delay = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ----------------------------- Page Component -------------------------------
export default function BlogIndexPage() {
  // Local state
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState(9); // initial cards
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedQuery = useDebounced(query, 220);

  // Fetch blogs from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchBlogs({ limit: 100 });
        if (!cancelled) {
          const normalized = data.items.map((b) => ({
            ...b,
            href: b.href || `/blog/${b.id}`,
            tags: b.tags || [],
            image: b.image || b.featuredImage || "",
          }));
          setBlogs(normalized);
        }
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
        if (!cancelled) setBlogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize + sort data by date desc (latest first)
  const normalized: Blog[] = useMemo(() => {
    if (loading) return [];
    // sort by date desc (unknown date goes last)
    return [...blogs].sort((a, b) => toTime(b.date) - toTime(a.date));
  }, [blogs, loading]);

  // Build a unique tag set
  const tags = useMemo(() => {
    const set = new Set<string>();
    normalized.forEach((p) => p.tags?.forEach((t) => set.add(t)));
    return ["All", ...Array.from(set)];
  }, [normalized]);

  // Filter by tag + search
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return normalized.filter((p) => {
      const okTag = activeTag === "All" || p.tags?.includes(activeTag);
      const hay = (p.title + " " + p.excerpt).toLowerCase();
      const okQ = !q || hay.includes(q);
      return okTag && okQ;
    });
  }, [normalized, activeTag, debouncedQuery]);

  // Featured post = first item in filtered list (if any)
  const [featured, ...rest] = filtered;

  // Pagination chunk
  const visible = rest.slice(0, visibleCount);

  // Reset pagination when filters/search change
  useEffect(() => setVisibleCount(9), [activeTag, debouncedQuery]);

  // Scroll-to-list when loading more (nice UX)
  const listRef = useRef<HTMLDivElement>(null);
  const loadMore = () => {
    setVisibleCount((n) => n + 9);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  if (loading) {
    return (
      <main className="bg-[var(--wnr-cream)] text-[var(--wnr-text)]">
        <section className="pt-20 md:pt-28 pb-8 mt-[calc(5rem+var(--offer-strip-height,0px))]">
          <div className="wnr-container">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-neutral-200 rounded w-1/3 mx-auto" />
              <div className="h-6 bg-neutral-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[var(--wnr-cream)] text-[var(--wnr-text)]">
      {/* HERO / CONTROLS */}
      <section className="pt-20 md:pt-28 pb-8 mt-20">
        <div className="wnr-container">
          <h1 className="text-center font-semibold tracking-tight text-[34px] md:text-5xl lg:text-6xl leading-[1.1]">
            Rooted Reads
          </h1>
          <p className="mt-3 text-center max-w-2xl mx-auto text-[15px] md:text-lg text-neutral-700">
            Rituals, herbs, and everyday calm—curated stories from the Wild n&apos; Root journal.
          </p>

          {/* Search + Tag chips */}
          <div className="mt-6 md:mt-8 grid gap-3">
            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles…"
                className="w-full pl-11 pr-4 h-11 rounded-full ring-1 ring-black/10 bg-white outline-none focus:ring-[var(--wnr-berry)]/40"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {tags.map((t) => {
                const active = activeTag === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTag(t)}
                    className={`h-9 px-4 rounded-full ring-1 ring-black/10 transition ${
                      active ? "bg-[var(--wnr-berry)] text-white" : "bg-white hover:bg-black/5"
                    }`}
                    aria-pressed={active}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="pb-10 md:pb-14">
          <div className="wnr-container">
            <Link
              href={featured.href || `/blog/${featured.id}`}
              className="group grid md:grid-cols-2 gap-6 md:gap-8 items-stretch rounded-2xl overflow-hidden bg-white ring-1 ring-black/5 shadow-soft"
              prefetch={true}
            >
              {/* Image */}
              <div className="relative min-h-[220px] md:min-h-[360px]">
                  {featured.image && (
                    <Image
                      src={featured.image}
                      alt={featured.title}
                      fill
                      priority
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  )}
              </div>

              {/* Text */}
              <div className="p-5 md:p-8 flex flex-col">
                <div className="text-[11px] tracking-[0.18em] text-[var(--wnr-berry)] font-semibold">
                  FEATURED
                </div>
                <h2 className="mt-2 text-2xl md:text-4xl font-semibold leading-tight">
                  {featured.title}
                </h2>
                <p className="mt-3 text-neutral-700 text-[15px] md:text-base">
                  {featured.excerpt}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                  {featured.date && <span>{featured.date}</span>}
                  <span className="inline-flex items-center gap-1">
                    <IoTimeOutline /> {readingTime(featured.excerpt)} min read
                  </span>
                  {featured.tags && featured.tags.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <IoPricetagOutline /> {featured.tags.slice(0, 2).join(", ")}
                      {featured.tags.length > 2 ? "…" : ""}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-5">
                  <span className="inline-flex items-center gap-2 text-[var(--wnr-berry)] font-semibold">
                    Read article
                    <svg width="16" height="16" viewBox="0 0 24 24" className="transition -rotate-45 group-hover:rotate-0">
                      <path fill="currentColor" d="M14 3l7 7-7 7v-4H3v-6h11V3z" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* GRID */}
      <section className="pb-14 md:pb-20">
        <div className="wnr-container">
          <div ref={listRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {visible.length === 0 && !featured && (
              <div className="col-span-full text-center text-neutral-600 py-10">
                No posts match your filters.
              </div>
            )}

            {visible.map((p) => (
              <ArticleCard key={p.id} post={p} />
            ))}
          </div>

          {/* LOAD MORE */}
          {visible.length < rest.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                className="h-11 px-6 rounded-full bg-[var(--wnr-berry)] text-white hover:opacity-90 transition"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ----------------------------- Card Component -------------------------------
function ArticleCard({ post }: { post: Blog }) {
  // Use ID for URLs
  const href = post.href || `/blog/${post.id}`;
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl bg-white ring-1 ring-black/5 shadow-soft overflow-hidden"
      prefetch={true}
    >
      {post.image && (
        <div className="relative aspect-[16/10]">
          <Image
            src={post.image}
            alt={post.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          />
        </div>
      )}

      <div className="p-4 md:p-5 flex flex-col gap-2">
        {post.date && (
          <time
            dateTime={post.date}
            className="block text-[10px] md:text-xs tracking-wide uppercase text-neutral-500"
          >
            {post.date}
          </time>
        )}

        <h3 className="text-base md:text-lg font-semibold leading-snug line-clamp-2 group-hover:text-[var(--wnr-berry)] transition-colors">
          {post.title}
        </h3>

        <p className="text-sm text-neutral-700 line-clamp-3">{post.excerpt}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
            <IoTimeOutline /> {readingTime(post.excerpt)} min
          </span>
          {post.tags?.slice(0, 2).map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-neutral-700">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
