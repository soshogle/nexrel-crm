const { withSentryConfig } = require('@sentry/nextjs');

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
  webpack: (config, { isServer, dev }) => {
    // Use polling in dev to avoid EMFILE "too many open files" on macOS
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    // Make @azure/storage-blob optional - it's dynamically imported
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@azure/storage-blob': false,
    };
    
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'soshogle',
  project: process.env.SENTRY_PROJECT || 'nexrel-crm',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring',
});
