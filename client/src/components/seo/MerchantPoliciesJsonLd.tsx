"use client";
import Script from "next/script";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wildnroot.com";

/**
 * Site-wide Merchant return policy JSON-LD.
 * Adjust RETURN_WINDOW_DAYS / fields to match your policy.
 */
const RETURN_WINDOW_DAYS = 7;

export default function MerchantPoliciesJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wild n' Root",
    url: SITE,
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: RETURN_WINDOW_DAYS,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      inStoreReturnsOffered: false
    }
  };

  return (
    <Script
      id="ld-merchant-policies"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
