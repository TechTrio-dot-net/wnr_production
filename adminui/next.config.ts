// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons', '@heroicons/react'],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    // Optimize images by default
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async rewrites() {
    // Use environment variable if set, otherwise default to localhost in dev
    // In production, NEXT_PUBLIC_API_BASE should be set to your backend URL
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE ||
      (process.env.NODE_ENV === "production"
        ? "https://api.wildnroot.com" // Default production URL - override with env var
        : "http://localhost:5001");
    
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
