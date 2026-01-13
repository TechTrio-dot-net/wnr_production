// src/components/seo/ItemListJsonLd.tsx
"use client";
import Script from "next/script";

type Item = { id: string; name: string; url: string; image?: string; };

export default function ItemListJsonLd({ items, id = "default" }: { items: Item[]; id?: string }) {
  const element = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: it.url,
      item: {
        "@type": "Product",
        name: it.name,
        image: it.image,
        productID: it.id,
      }
    }))
  };

  return <Script id={`ld-itemlist-${id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(element) }} />;
}
