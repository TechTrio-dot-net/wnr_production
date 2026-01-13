"use client";

import React from "react";
import Image from "next/image";

export type TestimonialCard = {
  _id: string;
  name: string;
  headline: string;
  quote: string;
  rating: number; // 1-5
  productImageUrl?: string;
  countryCode?: string; // e.g., "US", "IN"
};

interface TestimonialCardProps {
  testimonial: TestimonialCard;
}

// Country flag emoji mapping
const getCountryFlag = (code?: string): string => {
  if (!code) return "🌍";
  const flagMap: Record<string, string> = {
    US: "🇺🇸",
    IN: "🇮🇳",
    GB: "🇬🇧",
    CA: "🇨🇦",
    AU: "🇦🇺",
  };
  return flagMap[code.toUpperCase()] || "🌍";
};

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const { name, headline, quote, rating, productImageUrl, countryCode } = testimonial;
  const stars = Array.from({ length: 5 }, (_, i) => i < rating);

  return (
    <article className="relative w-full max-w-[420px] rounded-2xl border border-black/10 bg-white shadow-lg overflow-hidden">
      <div className="px-6 pt-6 pb-20 relative z-10">
        {/* Rating Stars */}
        <div className="flex items-center gap-1 mb-3">
          {stars.map((filled, i) => (
            <svg
              key={i}
              className={`w-5 h-5 ${filled ? "text-orange-500" : "text-gray-300"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        {/* Headline */}
        <h3 className="text-xl font-bold text-black mb-3">{headline}</h3>

        {/* Quote */}
        <p className="text-[15px] leading-7 text-black/80 mb-4">{quote}</p>

        {/* Reviewer Name with Flag */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-black/70">-{name.toUpperCase()}</span>
          {countryCode && (
            <span className="text-lg" role="img" aria-label={`Flag of ${countryCode}`}>
              {getCountryFlag(countryCode)}
            </span>
          )}
        </div>
      </div>

      {/* Product Image in Bottom Corner */}
      {productImageUrl && (
        <div className="absolute bottom-0 right-0 w-32 h-32 md:w-40 md:h-40 pointer-events-none">
          <div className="relative w-full h-full">
            <Image
              src={productImageUrl}
              alt="Product"
              fill
              className="object-contain object-bottom-right"
              sizes="(max-width: 768px) 128px, 160px"
              unoptimized
            />
          </div>
        </div>
      )}
    </article>
  );
}
