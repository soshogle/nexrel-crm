const fs = require('fs');
const path = require('path');

// Clean next.config.js for Vercel
const configPath = path.join(__dirname, '..', 'next.config.js');
const cleanConfig = `/** @type {import("next").NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
`;

console.log('🔧 Fixing next.config.js for Vercel...');
fs.writeFileSync(configPath, cleanConfig);
console.log('✅ next.config.js cleaned for Vercel build');
