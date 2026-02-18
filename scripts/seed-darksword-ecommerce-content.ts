#!/usr/bin/env tsx
/**
 * Seed ecommerceContent for Darksword Armory website.
 * Run after: npx tsx owner-websites/eyal-darksword/scripts/export-ecommerce-data.ts
 * Or: npx tsx scripts/seed-darksword-ecommerce-content.ts
 *
 * This script:
 * 1. Loads products and pages from owner-websites/eyal-darksword/data/ecommerce-export.json
 * 2. Extracts videos (YouTube URLs) from the Videos page
 * 3. Extracts policies (shipping, privacy, terms) from pages
 * 4. Finds Darksword website (by name or user email) and updates ecommerceContent
 */

import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_PATH = path.join(
  process.cwd(),
  'owner-websites/eyal-darksword/data/ecommerce-export.json'
);

function extractYouTubeUrls(content: string): { url: string; title?: string }[] {
  const videos: { url: string; title?: string }[] = [];
  // Match vc_video link="https://youtu.be/xxx" or link="https://www.youtube.com/watch?v=xxx"
  const linkRegex = /vc_video\s+link="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)[^"]*)"[^>]*>/g;
  const titleRegex = /<h1[^>]*>([^<]+)<\/h1>/g;
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    const fullUrl = m[1];
    const videoId = m[2];
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
    if (!videos.some((v) => v.url.includes(videoId))) {
      videos.push({ url: cleanUrl });
    }
  }
  return videos;
}

function loadAndTransformData(): {
  products: unknown[];
  pages: { id: string; title: string; slug: string; content: string }[];
  videos: { url: string; title?: string }[];
  policies: Record<string, { title: string; slug: string; content: string }>;
} {
  if (!fs.existsSync(EXPORT_PATH)) {
    throw new Error(
      `Export file not found: ${EXPORT_PATH}\nRun first: npx tsx owner-websites/eyal-darksword/scripts/export-ecommerce-data.ts`
    );
  }
  const raw = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf-8'));
  const products = raw.products || [];
  const pages = raw.pages || [];

  // Extract videos from Videos page
  const videosPage = pages.find((p: { slug: string }) => p.slug === 'videos');
  const videos = videosPage ? extractYouTubeUrls(videosPage.content) : [];

  // Extract policy pages
  const policySlugs = ['shipping-and-returns', 'privacy-policy', 'terms-and-conditions'];
  const policies: Record<string, { title: string; slug: string; content: string }> = {};
  for (const slug of policySlugs) {
    const page = pages.find((p: { slug: string }) => p.slug === slug);
    if (page) {
      policies[slug] = { title: page.title, slug: page.slug, content: page.content };
    }
  }

  return { products, pages, videos, policies };
}

async function main() {
  console.log('Seeding Darksword ecommerce content...\n');

  const { products, pages, videos, policies } = loadAndTransformData();
  console.log(`Loaded: ${products.length} products, ${pages.length} pages, ${videos.length} videos`);

  // Find Eyal's Darksword Armory website (eyal@darksword-armory.com) — not the orthodontist's "darksword"
  const website = await prisma.website.findFirst({
    where: {
      user: {
        email: { equals: 'eyal@darksword-armory.com', mode: 'insensitive' },
      },
    },
    include: { user: { select: { email: true } } },
  });

  if (!website) {
    console.error('\n❌ No Darksword website found in the database.');
    console.error('   Create one first: npx tsx scripts/create-darksword-admin-and-website.ts');
    console.error('   (Requires: npx tsx scripts/build-darksword-davidprotein-site.ts)');
    process.exit(1);
  }

  const ecommerceContent = {
    products,
    pages,
    videos,
    policies,
    categories: [...new Set(products.flatMap((p: { categories?: string[] }) => p.categories || []))],
    siteConfig: {},
  };

  await prisma.website.update({
    where: { id: website.id },
    data: { ecommerceContent },
  });

  console.log('\n✅ Done!');
  console.log('   Website ID:', website.id);
  console.log('   Website:', website.name);
  console.log('   User:', website.user?.email);
  console.log('\n   E-commerce content API:');
  console.log(`   GET /api/websites/${website.id}/ecommerce-content`);
  console.log('\n   Set in deployed site .env:');
  console.log(`   NEXREL_CRM_URL=<crm_url>`);
  console.log(`   NEXREL_WEBSITE_ID=${website.id}`);
  console.log(`   WEBSITE_VOICE_CONFIG_SECRET=<same as CRM>`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
