// src/components/seo/ArticleJsonLd.tsx
"use client";
import Script from "next/script";

type ArticleProps = {
  headline: string;
  description?: string;
  image?: string;
  author?: { name: string };
  datePublished?: string; // ISO
  dateModified?: string; // ISO
  url: string;
};

export default function ArticleJsonLd({ headline, description, image, author, datePublished, dateModified, url }: ArticleProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: image ? [image] : undefined,
    author: author || { name: "Wild n' Root" },
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: url,
    url,
    publisher: {
      "@type": "Organization",
      name: "Wild n' Root",
    },
  } as const;

  return <Script id={`ld-article-${encodeURIComponent(url)}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}


