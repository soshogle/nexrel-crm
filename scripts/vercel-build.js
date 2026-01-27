const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Force Prisma to regenerate by clearing cache
const prismaPath = path.join(__dirname, '..', 'node_modules', '.prisma');
if (fs.existsSync(prismaPath)) {
  console.log('🗑️ Clearing Prisma cache for fresh generation...');
  fs.rmSync(prismaPath, { recursive: true, force: true });
  console.log('✅ Prisma cache cleared');
}

// Run prisma generate
console.log('🔄 Running prisma generate...');
try {
  execSync('npx prisma generate', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.error('❌ Prisma generate failed:', error.message);
  process.exit(1);
}
