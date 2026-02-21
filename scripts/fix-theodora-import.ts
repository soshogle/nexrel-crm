/**
 * Fix Theodora's website import: set navConfig to match her real pages,
 * ensure vercelDeploymentUrl is set, clear stale builds, and trigger import-all.
 *
 * Run: npx tsx scripts/fix-theodora-import.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/fix-theodora-import.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';
const DEFAULT_VERCEL_URL = 'https://theodora-stavropoulos-remax.vercel.app';
const dryRun = process.env.DRY_RUN === '1';

/**
 * navConfig matching Theodora's actual routes in App.tsx.
 * Includes pages the DEFAULT_NAV was missing: /videos, /podcasts, /testimonials, /awards, /sold.
 */
const THEODORA_NAV_CONFIG = {
  navItems: [
    {
      label: 'Selling',
      href: '/selling',
      children: [
        { label: 'For Sale', href: '/for-sale' },
        { label: 'Sold Properties', href: '/sold' },
        { label: 'Property Concierge', href: '/property-concierge' },
        { label: 'Market Appraisal', href: '/market-appraisal' },
      ],
    },
    {
      label: 'Buying',
      href: '/buying',
      children: [
        { label: 'For Sale', href: '/for-sale' },
        { label: 'Prestige Properties', href: '/prestige' },
        { label: 'Secret Properties', href: '/secret-properties' },
      ],
    },
    {
      label: 'Renting',
      href: '/renting',
      children: [{ label: 'For Lease', href: '/for-lease' }],
    },
    { label: 'About', href: '/about', children: undefined },
    {
      label: 'News & Media',
      href: '/news',
      children: [
        { label: 'Blog', href: '/blog' },
        { label: 'Videos', href: '/videos' },
        { label: 'Podcasts', href: '/podcasts' },
      ],
    },
  ],
  topLinks: [
    { label: 'Home', href: '/' },
    { label: 'Properties', href: '/properties' },
    { label: 'Get A Quote', href: '/get-a-quote' },
    { label: 'Contact', href: '/contact' },
    { label: 'Testimonials', href: '/testimonials' },
  ],
  footerLinks: [
    { label: 'Properties', href: '/properties' },
    { label: 'Buying', href: '/buying' },
    { label: 'Selling', href: '/selling' },
    { label: 'Renting', href: '/renting' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Awards', href: '/awards' },
    { label: 'Testimonials', href: '/testimonials' },
  ],
};

async function main() {
  console.log(dryRun ? '🔍 DRY RUN — no changes will be saved\n' : '');
  console.log('🔧 Fixing Theodora\'s website import\n');

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  if (!theodora) {
    console.error('❌ User not found:', THEODORA_EMAIL);
    return;
  }

  console.log('✅ Found user:', theodora.name);

  const website = theodora.websites[0];
  if (!website) {
    console.error('❌ No website found for Theodora. Run create-theodora-website.ts first.');
    return;
  }

  console.log('✅ Found website:', website.name, `(${website.id})`);

  // 1. Set navConfig
  const currentNav = website.navConfig as Record<string, unknown> | null;
  const hasCustomNav = currentNav && Object.keys(currentNav).length > 0;
  console.log(`\n📋 navConfig: ${hasCustomNav ? 'Custom (overwriting)' : 'Empty/null (setting)'}`);

  const allPaths = new Set<string>();
  for (const item of THEODORA_NAV_CONFIG.topLinks) allPaths.add(item.href);
  for (const item of THEODORA_NAV_CONFIG.navItems) {
    allPaths.add(item.href);
    for (const child of item.children || []) allPaths.add(child.href);
  }
  for (const item of THEODORA_NAV_CONFIG.footerLinks) allPaths.add(item.href);
  console.log(`   ${allPaths.size} unique pages:`, [...allPaths].sort().join(', '));

  // 2. Check vercelDeploymentUrl
  const vercelUrl = process.env.NEW_VERCEL_URL || website.vercelDeploymentUrl || DEFAULT_VERCEL_URL;
  console.log(`\n🌐 vercelDeploymentUrl: ${website.vercelDeploymentUrl || '(not set)'}`);
  console.log(`   Will set to: ${vercelUrl}`);

  // 3. Check structure
  const structure = (website.structure || {}) as any;
  const existingPages = Array.isArray(structure.pages) ? structure.pages.length : 0;
  console.log(`\n📄 Current structure: ${existingPages} pages`);
  if (existingPages > 0) {
    for (const p of structure.pages) {
      const compCount = Array.isArray(p.components) ? p.components.length : 0;
      console.log(`   ${p.path} (${p.name}) — ${compCount} components`);
    }
  }

  // 4. Clear stale IN_PROGRESS builds
  const staleBuilds = await prisma.websiteBuild.findMany({
    where: { websiteId: website.id, status: 'IN_PROGRESS' },
  });
  if (staleBuilds.length > 0) {
    console.log(`\n🧹 Clearing ${staleBuilds.length} stale IN_PROGRESS builds`);
    if (!dryRun) {
      await prisma.websiteBuild.updateMany({
        where: { websiteId: website.id, status: 'IN_PROGRESS' },
        data: { status: 'FAILED', error: 'Cleared by fix script', completedAt: new Date() },
      });
    }
  }

  // 5. Apply changes
  if (!dryRun) {
    await prisma.website.update({
      where: { id: website.id },
      data: {
        navConfig: THEODORA_NAV_CONFIG,
        vercelDeploymentUrl: vercelUrl,
      },
    });
    console.log('\n✅ navConfig and vercelDeploymentUrl updated');
  } else {
    console.log('\n⏭️  Skipped DB update (dry run)');
  }

  // 6. Trigger import-all via API
  const crmUrl = process.env.NEXREL_CRM_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  console.log(`\n🚀 Triggering import-all via ${crmUrl}/api/websites/${website.id}/import-all-pages`);
  console.log(`   Base URL: ${vercelUrl}`);

  if (!dryRun) {
    try {
      const res = await fetch(`${crmUrl}/api/websites/${website.id}/import-all-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-website-secret': process.env.WEBSITE_VOICE_CONFIG_SECRET || '',
        },
        body: JSON.stringify({ baseUrl: vercelUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        console.log('✅ Import started:', data.message);
        console.log('   Build ID:', data.buildId);
      } else {
        console.warn('⚠️  Import API returned:', data.error || JSON.stringify(data));
        console.log('   You can trigger manually from the Page Editor tab in the CRM dashboard.');
      }
    } catch (err: any) {
      console.warn('⚠️  Could not reach CRM API:', err.message);
      console.log('   Make sure the CRM is running, then trigger import from the Page Editor tab.');
      console.log('   Or run: curl -X POST', `${crmUrl}/api/websites/${website.id}/import-all-pages`,
        '-H "Content-Type: application/json"',
        `-d '{"baseUrl":"${vercelUrl}"}'`);
    }
  } else {
    console.log('   ⏭️  Skipped (dry run)');
  }

  console.log('\n✅ Done. Check the Page Editor tab for imported content.');
  console.log('   If pages appear empty, ensure ENABLE_JS_SCRAPING=true is set (it is in .env).');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
