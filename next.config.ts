import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static exports for Netlify
  output: 'standalone',
  
  // Disable server-side image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Handle environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Ensure proper handling of API routes
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
