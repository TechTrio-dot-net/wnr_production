// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.wildnroot.com").replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],

        // Disallow only the stuff that shouldn't be crawled
        disallow: [
          // APIs / admin
          "/api/",
          "/admin",

          // Account / auth / transactional
          "/login",
          "/register",
          "/profile",
          "/account",        // if you use /account as a hub
          "/account/",
          "/orders",
          "/orders/",
          "/wishlist",
          "/wishlist/",
          "/cart",
          "/checkout",
          "/buy-now",
          "/payment/",
          "/thank-you",      // still add meta noindex on the page

          // Internal search
          "/search",

          // Common duplicate-making querystrings (any path with these)
          "/*?*utm_",        // UTM
          "/*?*gclid",
          "/*?*fbclid",
          "/*?*page=",
          "/*?*sort=",
          "/*?*filter=",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
