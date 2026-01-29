const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Clear Prisma cache to force regeneration with new models
const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma');
if (fs.existsSync(prismaClientPath)) {
  console.log('Clearing Prisma client cache...');
  fs.rmSync(prismaClientPath, { recursive: true, force: true });
  console.log('Prisma client cache cleared');
}

// Regenerate Prisma client
console.log('Regenerating Prisma client...');
try {
  execSync('npx prisma generate', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('Prisma client regenerated successfully');
} catch (error) {
  console.error('Failed to regenerate Prisma client:', error.message);
  process.exit(1);
}

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
// Build trigger: 1769610000 - Clear Prisma cache and regenerate
