const fs = require('fs');
const path = require('path');

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

fs.writeFileSync(configPath, cleanConfig);
console.log('next.config.js fixed');
// Build trigger: 1769601000 - Force fresh install with RE Workflow models
