// next.config.ts - Basitleştirilmiş CMS için
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client'],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options', 
            value: 'SAMEORIGIN' // 3D modeller için DENY yerine SAMEORIGIN
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Image optimization
  images: {
    domains: ['localhost'], // Yerel development için
    formats: ['image/webp', 'image/avif']
  },

  // TypeScript config
  typescript: {
    ignoreBuildErrors: false
  },

  // ESLint config
  eslint: {
    ignoreDuringBuilds: false
  },

  compress: true,
  poweredByHeader: false
};

export default nextConfig;