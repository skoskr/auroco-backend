// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  serverExternalPackages: ['@prisma/client', 'bcrypt'],

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
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // HSTS header for production
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }] : [])
        ]
      }
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    if (process.env.NODE_ENV !== 'production') return [];
    
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://your-domain.com/:path*',
        permanent: true
      }
    ];
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY
  },

  // Image optimization
  images: {
    domains: [], // Add your image domains here
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

  // Compression
  compress: true,

  // Power by header removal
  poweredByHeader: false
};

export default nextConfig;