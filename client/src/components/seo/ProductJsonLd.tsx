// src/components/seo/ProductJsonLd.tsx
"use client";
import Script from "next/script";

type OfferIn = {
  price: number;
  priceCurrency?: string; // default INR
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  url: string;
  seller?: { name: string };
  shippingRate?: number; // 0 for free
  shippingCountry?: string; // default IN
};

export default function ProductJsonLd(props: {
  id: string;            // product id/slug
  name: string;
  description?: string;
  images: string[];      // absolute or root-relative
  brand?: string;        // default Wild n Root
  sku?: string;
  gtin?: string;
  category?: string;     // Google product category optional
  aggregateRating?: { ratingValue: number; reviewCount: number };
  offer: OfferIn;
}) {
  const {
    id, name, description, images,
    brand = "Wild n' Root",
    sku, gtin, category, aggregateRating, offer
  } = props;

  const imageUrls = images.map((u) => (u.startsWith("http") ? u : `${location.origin}${u}`));

  const json: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    productID: id,
    name,
    description,
    image: imageUrls,
    brand: { "@type": "Brand", name: brand },
    sku,
    gtin13: gtin,
    category,
    offers: {
      "@type": "Offer",
      price: offer.price,
      priceCurrency: offer.priceCurrency || "INR",
      url: offer.url,
      availability: `https://schema.org/${offer.availability || "InStock"}`,
      seller: { "@type": "Organization", name: offer?.seller?.name || "Wild n' Root" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: typeof offer.shippingRate === "number" ? offer.shippingRate : 0,
          currency: offer.priceCurrency || "INR"
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: offer.shippingCountry || "IN"
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6, unitCode: "DAY" }
        }
      }
    }
  };

  if (aggregateRating && aggregateRating.ratingValue > 0 && aggregateRating.reviewCount > 0) {
    json.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount
    };
  }

  return <Script id={`ld-product-${id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
