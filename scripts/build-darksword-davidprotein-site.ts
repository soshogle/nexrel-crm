#!/usr/bin/env tsx
/**
 * Build a website with David Protein's layout + Darksword Armory's content
 *
 * Usage:
 *   npx tsx scripts/build-darksword-davidprotein-site.ts
 *   npx tsx scripts/build-darksword-davidprotein-site.ts --create  # Create website in DB (requires userId)
 *   npx tsx scripts/build-darksword-davidprotein-site.ts --userId=clxxx  # Specify user for --create
 *
 * Output: darksword-davidprotein-structure.json (merged structure)
 * With --create: Also creates a Website record and prints the URL
 */

import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// David Protein template structure (from TEMPLATE_IMPORT_SQL)
const DAVID_PROTEIN_STRUCTURE = {
  pages: [
    {
      id: 'home',
      path: '/',
      title: 'David Protein',
      name: 'Home',
      components: [
        {
          id: 'hero',
          type: 'Hero',
          props: {
            title: 'David Protein',
            subtitle:
              '28g protein. 150 calories. 0g sugar. More protein and fewer calories help you increase muscle and decrease body fat. ~50% more protein per calorie (CFP) than any bar.',
            image: 'https://davidprotein.com/cdn/shop/files/Layer_1_9.svg?format=webp&v=1720877953&width=100',
            imageUrl: 'https://davidprotein.com/cdn/shop/files/Layer_1_9.svg?format=webp&v=1720877953&width=100',
            ctaText: 'Shop Now',
            ctaLink: '#products',
          },
        },
        {
          id: 'contact-form',
          type: 'ContactForm',
          props: {
            fields: [
              { name: 'name', type: 'text', label: 'Name', required: true },
              { name: 'email', type: 'email', label: 'Email', required: true },
              { name: 'message', type: 'textarea', label: 'Message', required: true },
            ],
          },
        },
      ],
      seo: {
        title: 'David Protein',
        description:
          '28g protein. 150 calories. 0g sugar. More protein and fewer calories help you increase muscle and decrease body fat.',
        keywords: [],
        ogTitle: 'David Protein',
        ogDescription: '28g protein. 150 calories. 0g sugar.',
        ogImage: 'http://davidprotein.com/cdn/shop/files/iMac_-_1_2.png?v=1764616319',
        twitterCard: 'summary_large_image',
        canonicalUrl: 'https://davidprotein.com/',
      },
    },
  ],
  globalStyles: {
    colors: {
      primary: '#3A3A3A',
      secondary: '#333333',
      accent: '#275ea8',
      background: '#FFFFFF',
      text: '#1F2937',
    },
    fonts: {
      heading: 'Instrument Serif, serif',
      body: 'Suisse International, sans-serif',
    },
    layout: 'responsive',
  },
  navigation: {},
  footer: {},
};

function loadDarkswordData(): any {
  const p = path.join(process.cwd(), 'darksword-armory-scraped.json');
  if (!fs.existsSync(p)) {
    throw new Error(
      'darksword-armory-scraped.json not found. Run: npx tsx scripts/scrape-darksword-armory.ts first.'
    );
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function mergeStructure(davidProtein: any, darksword: any): any {
  const ts = Date.now();
  const merged = JSON.parse(JSON.stringify(davidProtein));

  // Pick best hero image from Darksword (skip flags, logos, tiny images)
  const heroImageCandidates = (darksword.images || [])
    .filter((img: any) => {
      const u = (img.url || img).toLowerCase();
      return (
        !u.includes('flag') &&
        !u.includes('logo') &&
        !u.includes('dummy') &&
        (u.includes('banner') || u.includes('sword') || u.includes('shield') || u.includes('elite') || u.includes('home'))
      );
    })
    .map((img: any) => img.url || img);
  const heroImage = heroImageCandidates[0] || darksword.images?.[5]?.url || darksword.images?.[0]?.url;

  const homePage = merged.pages.find((p: any) => p.path === '/' || p.id === 'home') || merged.pages[0];
  if (!homePage) throw new Error('No home page in template');

  // Replace Hero with Darksword content
  const hero = homePage.components.find((c: any) => c.type === 'Hero');
  if (hero) {
    hero.props = {
      ...hero.props,
      title: darksword.seo?.title || 'Darksword Armory',
      subtitle:
        darksword.seo?.description ||
        'Battle Ready Medieval swords, daggers and medieval weapons hand forged in Canada.',
      image: heroImage,
      imageUrl: heroImage,
      ctaText: 'Shop Swords',
      ctaLink: '#contact',
    };
  }

  // Add About section with Darksword paragraphs (David Protein layout is minimal, we add one section)
  const aboutParagraph = (darksword.paragraphs || [])[0]?.replace(/&nbsp;/g, ' ') || darksword.seo?.description;
  if (aboutParagraph) {
    const aboutIdx = homePage.components.findIndex((c: any) => c.type === 'ContactForm');
    const insertAt = aboutIdx >= 0 ? aboutIdx : homePage.components.length;
    homePage.components.splice(insertAt, 0, {
      id: `about-${ts}`,
      type: 'AboutSection',
      props: {
        title: 'Hand Forged in Canada',
        description: aboutParagraph,
        ctaText: 'View Collection',
        ctaLink: '#contact',
      },
    });
  }

  // Update page SEO
  homePage.seo = {
    title: darksword.seo?.title || 'Darksword Armory',
    description: darksword.seo?.description || '',
    keywords: ['medieval swords', 'battle ready', 'hand forged', 'armor', 'daggers'],
    ogTitle: darksword.seo?.title,
    ogDescription: darksword.seo?.description,
    ogImage: heroImage,
    twitterCard: 'summary_large_image',
    canonicalUrl: 'https://www.darksword-armory.com/',
  };
  homePage.title = darksword.seo?.title;

  // Top-level SEO
  merged.seo = homePage.seo;

  return merged;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldCreate = args.includes('--create');
  const userIdArg = args.find((a) => a.startsWith('--userId='));
  const userId = userIdArg?.split('=')[1];

  console.log('Loading Darksword scraped data...');
  const darksword = loadDarkswordData();

  console.log('Merging David Protein layout + Darksword content...');
  const structure = mergeStructure(DAVID_PROTEIN_STRUCTURE, darksword);

  const outPath = path.join(process.cwd(), 'darksword-davidprotein-structure.json');
  fs.writeFileSync(outPath, JSON.stringify(structure, null, 2));
  console.log(`\nSaved structure to ${outPath}\n`);

  if (shouldCreate) {
    const targetUserId = userId || (await prisma.user.findFirst({ select: { id: true } }))?.id;
    if (!targetUserId) {
      console.error('No userId. Pass --userId=YOUR_USER_ID or ensure at least one user exists in DB.');
      process.exit(1);
    }

    const existing = await prisma.website.count({ where: { userId: targetUserId } });
    if (existing >= 1) {
      console.error('User already has a website. Delete it first or use a different user.');
      process.exit(1);
    }

    const website = await prisma.website.create({
      data: {
        userId: targetUserId,
        name: 'Darksword Armory (David Protein Layout)',
        type: 'PRODUCT_TEMPLATE',
        templateType: 'PRODUCT',
        status: 'READY',
        buildProgress: 100,
        structure,
        seoData: structure.seo || {},
      },
    });

    console.log('Website created!');
    console.log(`  ID: ${website.id}`);
    console.log(`  Dashboard: /dashboard/websites/${website.id}`);
    console.log(`  Full URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/websites/${website.id}`);
  } else {
    console.log('To create the website in your DB, run:');
    console.log('  npx tsx scripts/build-darksword-davidprotein-site.ts --create');
    console.log('Or with a specific user:');
    console.log('  npx tsx scripts/build-darksword-davidprotein-site.ts --create --userId=YOUR_USER_ID');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
