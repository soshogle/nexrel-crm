#!/usr/bin/env node
/**
 * Generate extension icons using sharp
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Run from project root: npx sharp (or npm install sharp)');
    process.exit(1);
  }

  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  // Create simple purple square with white N
  const sizes = [16, 48, 128];
  const svg = `
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" fill="#7c3aed" rx="16"/>
      <text x="64" y="86" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">N</text>
    </svg>
  `;

  for (const size of sizes) {
    const buffer = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    const outPath = path.join(assetsDir, `icon-${size}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log('Created:', outPath);
  }
}

main().catch(console.error);
