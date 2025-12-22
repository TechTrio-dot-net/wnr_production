// src/components/seo/BreadcrumbsJsonLd.tsx
"use client";
import Script from "next/script";

export default function BreadcrumbsJsonLd({ items, id = "default" }: {
  items: Array<{ name: string; url: string }>;
  id?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
  return <Script id={`ld-breadcrumbs-${id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
