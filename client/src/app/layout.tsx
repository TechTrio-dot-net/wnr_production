// app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientToaster from "@/components/common/ClientToaster";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import CookieConsent from "@/components/common/CookieConsent";
import { WishlistProvider } from "@/context/WishlistContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { Analytics } from "@vercel/analytics/next";
import GoBackButton from "@/components/common/GoBackButton";
import HideOnLogin from "@/components/layout/HideOnLogin";

import SeoJsonLd from "@/components/seo/SeoJsonLd";
import MerchantPoliciesJsonLd from "@/components/seo/MerchantPoliciesJsonLd";
import GTM from "@/components/seo/GTM";
import GA4 from "@/components/seo/GA4";
import MetaPixel from "@/components/seo/MetaPixel";
import ScrollToTopButton from "@/components/common/ScrollToTopButton";
import AuthSync from "@/components/auth/AuthSync";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wildnroot.com";

const sahet = localFont({
  src: [{ path: "./fonts/AraHamahSahetAlAssi-Regular.ttf", weight: "200", style: "normal" }],
  variable: "--font-sahet",
  display: "swap",
  preload: true,
});

const zanki = localFont({
  src: [{ path: "./fonts/AraHamahZanki-Regular.ttf", weight: "600", style: "normal" }],
  variable: "--font-zanki",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Wild n' Root", template: "%s | Wild n' Root" },
  description:
    "Wild n' Root crafts wellness brews and rituals rooted in nature—herbal dip bags, copperware, and mindful essentials for a good habit.",
  applicationName: "Wild n' Root",
  keywords: [
    "Wild n Root","wildnroot","herbal brew","herbal dip bags","ayurvedic","wellness",
    "natural wellness","power brew","slim brew","good habit","A Good Habit"
  ],
  authors: [{ name: "Wild n Root" }],
  creator: "Wild n' Root",
  publisher: "Wild n' Root",
  alternates: { canonical: "/", languages: { "en-IN": "/" } },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Wild n' Root",
    title: "Wild n' Root",
    description: "Wellness brews and mindful rituals rooted in nature. Wild n' Root — A Good Habit.",
    locale: "en_IN",
    images: [{ url: "/og/og-default.jpg", width: 1200, height: 630, alt: "Wild n' Root" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@wildnroot",
    creator: "@wildnroot",
    title: "Wild n' Root",
    description: "Wellness brews and mindful rituals rooted in nature. Wild n' Root — A Good Habit.",
    images: ["/og/og-default.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#5b2d2c" }],
  },
  manifest: "/manifest.webmanifest",
  category: "Health & Wellness",
  formatDetection: { telephone: true, address: true, email: false },
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sahet.variable} ${zanki.variable}`}>
      <body className="min-h-screen bg-[var(--wnr-cream)] text-[var(--wnr-text)] antialiased">
        {/* Tags for Ads/Analytics */}
        <GTM />
        <GA4 />
        <MetaPixel />

        {/* Site-wide JSON-LD */}
        <SeoJsonLd />
        <MerchantPoliciesJsonLd />

        {/* App */}
        <QueryProvider>
          <UserProvider>
            <CartProvider>
              <WishlistProvider>
                {/* ✅ Sync localStorage token with presence cookie for middleware */}
                <AuthSync />
                
                <HideOnLogin>
                  
                  <Navbar />
                </HideOnLogin>

                <main id="main-content" className="min-h-[60vh]">
                  <GoBackButton />
                  {children}
                  <Analytics />
                </main>

                <HideOnLogin>
                  <Footer />
                </HideOnLogin>

                <CookieConsent />
                <ClientToaster />
                <ScrollToTopButton />
              </WishlistProvider>
            </CartProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
