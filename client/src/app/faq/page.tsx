// src/app/faq/page.tsx
"use client";

/**
 * FAQ — Wild n' Root
 * ---------------------------------------------------------------------------
 * + Search filter
 * + Category chips
 * + Accessible accordion
 * + Deep-linking via #slug
 * + SEO JSON-LD
 * + NEW: Support section with "Contact us" & "Call us" cards
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { IoSearchOutline, IoChevronDown, IoCallOutline, IoMailOutline } from "react-icons/io5";

// ----------------------------- Data -----------------------------------------
const ALL_FAQS = [
  {
    id: "how-to-brew",
    q: "How do I brew your blends for best taste?",
    a: (
      <>
        Add <strong>1 dip bag</strong> to 100–150 ml hot water (not boiling),
        stir well, and let it sit for <strong>2–3 minutes</strong>. Sweeten if you like.
        </>
    ),
    category: "Brewing",
  },
  {
    id: "caffeine-free",
    q: "Are your brews caffeine-free?",
    a: (
      <>
        All blends are <strong>naturally caffeine-free</strong>. If a blend contains tea/coffee,
        we label it clearly on the product page. For evenings, try our calming, caffeine-free options.
      </>
    ),
    category: "Ingredients",
  },
  {
    id: "daily-use",
    q: "Can I drink them every day?",
    a: (
      <>
        Yes — our blends are created for <strong>gentle daily use</strong>. Start with one cup a day and
        notice how you feel. If you have a medical condition or are pregnant, consult your practitioner first.
      </>
    ),
    category: "Wellness",
  },
  {
    id: "shipping-times",
    q: "How long does shipping take?",
    a: (
      <>
        Orders typically ship in <strong>24–48 hours</strong>. Delivery takes <strong>2–6 business days </strong>
        depending on your location. You’ll receive tracking via email/SMS.
      </>
    ),
    category: "Orders & Shipping",
  },

  {
    id: "storage",
    q: "How should I store the blends?",
    a: (
      <>
        Keep them <strong>airtight</strong>, away from heat, light, and moisture. Always close the pouch tightly
        or transfer to a jar. Best before dates are on the pack.
      </>
    ),
    category: "Ingredients",
  },
  {
    id: "allergens",
    q: "Do you handle any common allergens?",
    a: (
      <>
        We blend in a facility that may handle <strong>nuts, sesame, soy</strong>. Check each product page for
        specific allergen notes. If you have severe allergies, consult your doctor first.
      </>
    ),
    category: "Ingredients",
  },
  {
    id: "subscriptions",
    q: "Do you offer subscriptions or bulk orders?",
    a: (
      <>
        Yes — you can set up a recurring order or request a bulk quote. Drop us a note at{" "}
        <a href="mailto:info@wildnroot.com" className="text-[var(--wnr-berry)] underline underline-offset-4">
          info@wildnroot.com
        </a>{" "}
        with your requirements.
      </>
    ),
    category: "Orders & Shipping",
  },
] as const;

const uniqueCategories = ["All", ...Array.from(new Set(ALL_FAQS.map((f) => f.category)))];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ----------------------------- Component ------------------------------------
export default function FAQPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  // Deep link: /faq#how-to-brew
  useEffect(() => {
    const hash = (typeof window !== "undefined" && window.location.hash.replace("#", "")) || "";
    if (!hash) return;
    const matched = ALL_FAQS.find((f) => f.id === hash || slugify(f.q) === hash);
    if (matched) {
      setOpenId(matched.id);
      setTimeout(() => {
        const el = document.getElementById(matched.id);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, []);

  // Filter logic
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_FAQS.filter((f) => {
      const okCat = cat === "All" || f.category === cat;
      const okQ = !q || f.q.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [query, cat]);

  // JSON-LD (rendered once after mount to include plain text answers)
  const serializerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!serializerRef.current) return;
    const map = new Map<string, string>();
    serializerRef.current.querySelectorAll("[data-faq-ans]").forEach((n) => {
      const id = n.getAttribute("data-faq-ans") || "";
      map.set(id, n.textContent || "");
    });
    const asText = (id: string) => map.get(id) || "";
    const faqsForSeo = (filtered.length ? filtered : ALL_FAQS).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: asText(f.id) },
    }));
    const payload = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqsForSeo,
    };
    const el = document.getElementById("faq-jsonld");
    if (el) el.textContent = JSON.stringify(payload);
  }, [filtered]);

  return (
    <main className="bg-[var(--wnr-cream)] text-[var(--wnr-text)]">
      {/* HERO */}
      <section className="pt-20 md:pt-28 pb-8 mt-[calc(5rem+var(--offer-strip-height,0px))]">
        <div className="wnr-container">
          <h1 className="text-center font-semibold tracking-tight text-[34px] md:text-5xl lg:text-6xl leading-[1.1]">
            Frequently asked questions
          </h1>
          <p className="mt-3 text-center max-w-2xl mx-auto text-[15px] md:text-lg text-neutral-700">
            Answers about brewing, ingredients, orders, and more. Can’t find it?{" "}
            <a href="/contact" className="text-[var(--wnr-berry)] underline underline-offset-4">Contact us</a>.
          </p>

          {/* Search + Category chips */}
          <div className="mt-6 md:mt-8 grid gap-3">
            <div className="relative max-w-2xl mx-auto">
              <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions…"
                className="w-full pl-11 pr-4 h-11 rounded-full ring-1 ring-black/10 bg-white outline-none focus:ring-[var(--wnr-berry)]/40"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {uniqueCategories.map((c) => {
                const active = cat === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`h-9 px-4 rounded-full ring-1 ring-black/10 transition ${
                      active
                        ? "bg-[var(--wnr-berry)] text-white"
                        : "bg-white hover:bg-black/5"
                    }`}
                    aria-pressed={active}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ LIST */}
      <section className="pb-10 md:pb-16">
        <div className="wnr-container">
          <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-2 md:p-4">
            <ul className="space-y-0">
              {filtered.length === 0 && (
                <li className="p-6 text-center text-neutral-600">No questions match your search.</li>
              )}

              {filtered.map((f) => {
                const isOpen = openId === f.id;
                return (
                  <li key={f.id} id={f.id} className="relative border-b border-black/5 last:border-b-0">
                    <button
                      className="w-full text-left px-4 py-4 md:py-5 flex items-center gap-3 hover:bg-black/2.5 transition-colors"
                      aria-expanded={isOpen}
                      aria-controls={`${f.id}-panel`}
                      onClick={() => setOpenId((v) => (v === f.id ? null : f.id))}
                    >
                      <span className="flex-1 font-semibold pr-2">{f.q}</span>
                      <IoChevronDown
                        className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden
                        size={20}
                      />
                    </button>

                    <div
                      id={`${f.id}-panel`}
                      role="region"
                      aria-labelledby={f.id}
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="px-4 pb-5 pt-0 text-neutral-700 leading-relaxed">
                        <div data-faq-ans={f.id}>{f.a}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Hidden serializer root for JSON-LD text extraction */}
          <div ref={serializerRef} className="sr-only" aria-hidden />
        </div>
      </section>

      {/* SUPPORT SECTION (NEW) */}
      <section className="pb-20">
        <div className="wnr-container">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">Need more help?</h2>
            <p className="mt-2 text-neutral-700">
              Our team is happy to guide you with orders, brewing tips, or anything else.
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Contact card */}
            <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5 md:p-6 flex items-start gap-4">
              <div className="grid place-items-center h-11 w-11 rounded-xl bg-[var(--wnr-berry)] text-white shrink-0">
                <IoMailOutline size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Contact us</h3>
                <p className="text-neutral-700 mt-1">
                  Email our support team and we’ll get back within 24 hours.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="/contact"
                    className="h-10 px-4 rounded-full bg-[var(--wnr-berry)] text-white hover:opacity-90 transition inline-flex items-center justify-center"
                  >
                    Go to contact form
                  </a>
                  <a
                    href="mailto:info@wildnroot.com"
                    className="h-10 px-4 rounded-full ring-1 ring-black/10 bg-white hover:bg-black/5 transition inline-flex items-center justify-center"
                  >
                    info@wildnroot.com
                  </a>
                </div>
              </div>
            </div>

            {/* Call card */}
            <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5 md:p-6 flex items-start gap-4">
              <div className="grid place-items-center h-11 w-11 rounded-xl bg-[var(--wnr-berry)] text-white shrink-0">
                <IoCallOutline size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Call us</h3>
                <p className="text-neutral-700 mt-1">
                  Speak to a real human Mon–Fri, 10:00–18:00 IST.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href="tel:+919824440330"   // ← replace with your real number
                    className="h-10 px-4 rounded-full bg-[var(--wnr-berry)] text-white hover:opacity-90 transition inline-flex items-center justify-center"
                  >
                    +91 9824440330
                  </a>
                  <span className="h-10 px-4 rounded-full ring-1 ring-black/10 bg-white inline-flex items-center">
                    Avg. response: <span className="ml-1 font-medium">~2–4 min</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional small print */}
          <p className="mt-4 text-center text-xs text-neutral-500">
            By contacting us you agree to our{" "}
            <a href="/privacy" className="underline underline-offset-4">Privacy Policy</a>.
          </p>
        </div>
      </section>

      {/* JSON-LD (mutated in useEffect for accurate text content) */}
      <script id="faq-jsonld" type="application/ld+json" />
    </main>
  );
}
