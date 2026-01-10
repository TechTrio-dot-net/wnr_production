// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },

  // Enable standalone output for Docker
  output: 'standalone',

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons', 'framer-motion'],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dob666wa0/**", // your Cloudinary cloud name
      },
    ],
    // Optimize images by default - reduces storage significantly
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year cache for optimized images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Configure image qualities (required in Next.js 16+)
    qualities: [75, 85, 100],
    // Enable compression to reduce storage
    dangerouslyAllowSVG: false,
  },

  async rewrites() {
    // Use NEXT_PUBLIC_API_BASE if set, otherwise default to localhost in dev or Railway in prod
    const backendBase = 
      process.env.NEXT_PUBLIC_API_BASE ||
      (isDev
        ? "http://localhost:5001"
        : "https://api.wildnroot.com"); // Change this to your production backend URL

    return [
      {
        // 👇 Everything under /api/* on the frontend
        // will proxy to your backend on Railway
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
      {
        // 👇 Public routes (like /public/blogs) also need to proxy to backend
        source: "/public/:path*",
        destination: `${backendBase}/public/:path*`,
      },
    ];
  },
};

export default nextConfig;
