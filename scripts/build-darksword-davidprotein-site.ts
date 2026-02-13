#!/usr/bin/env tsx
/**
 * Build a website with David Protein's FULL layout + Darksword Armory's content
 *
 * Clones: Hero, promo banner, product tiers, product grid, image section,
 * testimonials, contact form. David Protein colors (dark theme, gold accents).
 *
 * Usage:
 *   npx tsx scripts/build-darksword-davidprotein-site.ts
 *   npx tsx scripts/build-darksword-davidprotein-site.ts --create
 *   npx tsx scripts/build-darksword-davidprotein-site.ts --create --userId=clxxx
 *
 * Output: darksword-davidprotein-structure.json
 */

import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// David Protein colors: dark theme, gold accents
const DAVID_PROTEIN_COLORS = {
  primary: '#1a1a1a',
  secondary: '#2d2d2d',
  accent: '#c9a227',
  background: '#0f0f0f',
  text: '#ffffff',
  textMuted: '#a3a3a3',
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

function getDarkswordImages(darksword: any): string[] {
  const skip = (u: string) =>
    u.includes('flag') ||
    u.includes('logo') ||
    u.includes('dummy') ||
    u.includes('polylang') ||
    u.endsWith('.svg');
  return (darksword.images || [])
    .filter((img: any) => {
      const u = (img.url || img).toLowerCase();
      return !skip(u);
    })
    .map((img: any) => img.url || img);
}

function buildFullStructure(darksword: any): any {
  const images = getDarkswordImages(darksword);
  const heroImg = images.find((u: string) => u.includes('banner') || u.includes('home')) || images[0];
  const pathHas = (url: string, term: string) => {
    try {
      return new URL(url).pathname.toLowerCase().includes(term);
    } catch {
      return url.toLowerCase().includes(term);
    }
  };
  const swordImgs = images.filter(
    (u: string) =>
      (pathHas(u, 'sword') && !pathHas(u, 'darksword')) ||
      /1317|1505|1305|1324|1332|1553/.test(u)
  );
  const shieldImgs = images.filter((u: string) => pathHas(u, 'shield'));
  const eliteImgs = images.filter((u: string) => pathHas(u, 'elite'));
  const productImgs = [...swordImgs, ...shieldImgs].slice(0, 6);
  const tierImg1 = eliteImgs[0] || swordImgs[0] || images[5];
  const tierImg2 = eliteImgs[1] || swordImgs[1] || images[6];
  const aboutImg = images.find((u: string) => u.includes('elite') || u.includes('banner')) || images[5];

  const products = (darksword.products || []).slice(0, 6).map((p: any, i: number) => ({
    name: p.name,
    description: `Hand-forged battle-ready ${(p.name || '').toLowerCase()}`,
    image: productImgs[i] || productImgs[0],
    price: '',
  }));

  // If we have fewer products from scrape, add from headings
  const headings = darksword.headings || [];
  while (products.length < 6 && headings[products.length]) {
    products.push({
      name: headings[products.length],
      description: 'Hand-forged in Canada',
      image: productImgs[products.length] || productImgs[0],
      price: '',
    });
  }

  const aboutParagraph = (darksword.paragraphs || [])[0]?.replace(/&nbsp;/g, ' ') || darksword.seo?.description;

  const structure = {
    pages: [
      {
        id: 'home',
        path: '/',
        title: 'Darksword Armory',
        name: 'Home',
        components: [
          // 1. Hero (David Protein style: dark, premium, dual CTAs)
          {
            id: 'hero',
            type: 'Hero',
            props: {
              title: darksword.seo?.title || 'Medieval Swords, Daggers and Armors Hand Forged and Battle Ready',
              subtitle:
                darksword.seo?.description ||
                'Battle Ready Medieval swords, daggers and medieval weapons hand forged in Canada to look, feel and handle as the originals.',
              image: heroImg,
              imageUrl: heroImg,
              ctaText: 'Shop Best Sellers',
              ctaLink: '#products',
              ctaSecondaryText: 'Bundle & Save',
              ctaSecondaryLink: '#contact',
            },
          },
          // 2. Promo banner (David Protein: "Buy 4 get 1 free")
          {
            id: 'promo-banner',
            type: 'CTASection',
            props: {
              title: 'The most value.',
              description: 'Buy 3 swords, get 1 free. Bundle Darksword.',
              ctaText: 'Bundle & Save',
              ctaLink: '#contact',
              variant: 'promo',
            },
          },
          // 3. Image + copy section ("Bodies deserve David" → "Warriors deserve battle-ready steel")
          {
            id: 'image-section',
            type: 'ImageSection',
            props: {
              title: 'Warriors deserve battle-ready steel.',
              description: aboutParagraph?.slice(0, 200) + '...',
              imageUrl: aboutImg,
              image: aboutImg,
              alt: 'Hand-forged medieval weapons',
              layout: 'image-left',
            },
          },
          // 4. Product tiers (David Protein: Gold vs Bronze → Elite vs Herald)
          {
            id: 'product-tiers',
            type: 'ServicesGrid',
            props: {
              title: 'Designed for disciplined results.',
              services: [
                {
                  name: 'Elite Series',
                  description: 'Damascus steel swords. Premium craftsmanship for collectors and enthusiasts.',
                  image: tierImg1,
                },
                {
                  name: 'Herald Series',
                  description: 'Battle-ready medieval weapons. Faithful to historical weight, balance and feel.',
                  image: tierImg2,
                },
              ],
              ctaText: 'Shop All',
              ctaLink: '#products',
            },
          },
          // 5. Product grid ("Shop our best sellers")
          {
            id: 'products',
            type: 'ProductsGrid',
            props: {
              title: 'Shop our best sellers',
              products,
              ctaText: 'View All Products',
              ctaLink: '#contact',
            },
          },
          // 6. Testimonials placeholder (David Protein: "The David community")
          {
            id: 'testimonials',
            type: 'CTASection',
            props: {
              title: 'The Darksword community, unfiltered.',
              description: 'Collectors, HEMA practitioners, and enthusiasts trust Darksword Armory for battle-ready steel.',
              ctaText: 'Read Reviews',
              ctaLink: '#contact',
            },
          },
          // 7. Contact form
          {
            id: 'contact-form',
            type: 'ContactForm',
            props: {
              title: 'Get in touch',
              fields: [
                { name: 'name', type: 'text', label: 'Name', required: true },
                { name: 'email', type: 'email', label: 'Email', required: true },
                { name: 'message', type: 'textarea', label: 'Message', required: true },
              ],
            },
          },
        ],
        seo: {
          title: darksword.seo?.title || 'Darksword Armory',
          description: darksword.seo?.description || '',
          keywords: ['medieval swords', 'battle ready', 'hand forged', 'armor', 'daggers', 'viking swords'],
          ogTitle: darksword.seo?.title,
          ogDescription: darksword.seo?.description,
          ogImage: heroImg,
          twitterCard: 'summary_large_image',
          canonicalUrl: 'https://www.darksword-armory.com/',
        },
      },
    ],
    globalStyles: {
      colors: DAVID_PROTEIN_COLORS,
      fonts: {
        heading: 'Instrument Serif, Georgia, serif',
        body: 'Suisse International, system-ui, sans-serif',
      },
      layout: 'responsive',
    },
    navigation: {
      links: [
        { label: 'Swords', href: '#products' },
        { label: 'Armor', href: '#products' },
        { label: 'Collection', href: '#products' },
        { label: 'Contact', href: '#contact-form' },
      ],
    },
    footer: {
      text: '© Darksword Armory. Hand-forged in Canada.',
      links: [
        { label: 'Contact', href: '#contact-form' },
        { label: 'Privacy', href: '#' },
      ],
    },
    seo: {
      title: darksword.seo?.title || 'Darksword Armory',
      description: darksword.seo?.description || '',
      keywords: ['medieval swords', 'battle ready', 'hand forged', 'armor', 'daggers'],
      ogTitle: darksword.seo?.title,
      ogDescription: darksword.seo?.description,
      ogImage: heroImg,
      twitterCard: 'summary_large_image',
      canonicalUrl: 'https://www.darksword-armory.com/',
    },
  };

  return structure;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldCreate = args.includes('--create');
  const userIdArg = args.find((a) => a.startsWith('--userId='));
  const userId = userIdArg?.split('=')[1];

  console.log('Loading Darksword scraped data...');
  const darksword = loadDarkswordData();

  console.log('Building full David Protein clone with Darksword branding...');
  const structure = buildFullStructure(darksword);

  const outPath = path.join(process.cwd(), 'darksword-davidprotein-structure.json');
  fs.writeFileSync(outPath, JSON.stringify(structure, null, 2));
  console.log(`\nSaved structure to ${outPath}\n`);

  if (shouldCreate) {
    const targetUserId =
      userId || (await prisma.user.findFirst({ where: { email: 'eyal@darksword-armory.com' }, select: { id: true } }))?.id
        || (await prisma.user.findFirst({ select: { id: true } }))?.id;
    if (!targetUserId) {
      console.error('No userId. Pass --userId=YOUR_USER_ID or ensure at least one user exists in DB.');
      process.exit(1);
    }

    const existing = await prisma.website.findFirst({
      where: { userId: targetUserId },
    });

    let websiteId: string;
    if (existing) {
      await prisma.website.update({
        where: { id: existing.id },
        data: {
          name: 'Darksword Armory',
          structure,
          seoData: structure.seo || {},
        },
      });
      websiteId = existing.id;
      console.log('Website updated!');
    } else {
      const website = await prisma.website.create({
        data: {
          userId: targetUserId,
          name: 'Darksword Armory',
          type: 'PRODUCT_TEMPLATE',
          templateType: 'PRODUCT',
          status: 'READY',
          buildProgress: 100,
          structure,
          seoData: structure.seo || {},
        },
      });
      websiteId = website.id;
      console.log('Website created!');
    }
    console.log(`  ID: ${websiteId}`);
    console.log(`  Dashboard: /dashboard/websites/${websiteId}`);
    console.log(`  Full URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/websites/${websiteId}`);
  } else {
    console.log('To create/update the website in your DB, run:');
    console.log('  npx tsx scripts/build-darksword-davidprotein-site.ts --create');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
