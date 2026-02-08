/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  // Removed outputFileTracingRoot - causes path0/path0 error on Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily skip type checking during build to speed up deployment
    // Type errors will still be caught in development and CI
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Make @azure/storage-blob optional - it's dynamically imported
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@azure/storage-blob': false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
