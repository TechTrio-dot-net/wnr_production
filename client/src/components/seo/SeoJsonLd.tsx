// src/components/seo/SeoJsonLd.tsx
"use client";
import Script from "next/script";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wildnroot.com";

export default function SeoJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wild n' Root",
    url: SITE,
    logo: `${SITE}/og/og-default.jpg`,
    sameAs: [
      "https://www.facebook.com/profile.php?id=61577858951456#",
      "https://www.instagram.com/wildnroot/",
      "https://www.linkedin.com/company/wild-n-root/posts/",
      "https://share.google/7FszdvfKqFwuzKI1t"
    ],
    brand: {
      "@type": "Brand",
      name: "Wild n' Root",
      url: SITE
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-0000000000",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["en", "hi"]
      }
    ]
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Wild n' Root",
    url: SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <Script id="ld-org" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <Script id="ld-website" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  );
}
