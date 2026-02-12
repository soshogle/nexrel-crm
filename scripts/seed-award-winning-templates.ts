#!/usr/bin/env tsx
/**
 * Seed Award-Winning Website Templates
 * Adds Awwwards, CSS Design Awards, and other recognized sites as templates
 * for users to clone when building or rebuilding their websites.
 */

import { websiteTemplateImporter } from '@/lib/website-builder/template-importer';
import { prisma } from '@/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const AWARD_WINNING_TEMPLATES = [
  // SERVICE - Agencies, consulting, architecture (Awwwards, CSS Design Awards)
  {
    url: 'https://www.stewartpartners.studio/',
    type: 'SERVICE' as const,
    name: 'Stewart & Partners - Architecture Studio',
    description: 'Awwwards Site of the Day Aug 2024. Minimal architecture studio with clean typography, black and white design. Perfect for design studios.',
    category: 'Award-Winning / Architecture',
  },
  {
    url: 'https://watson.la/',
    type: 'SERVICE' as const,
    name: 'Watson Design Group - Creative Agency',
    description: 'Awwwards Site of the Day Sep 2024. Design agency with rich history, expertise showcase, and sophisticated branding.',
    category: 'Award-Winning / Agency',
  },
  {
    url: 'https://immersive-g.com/',
    type: 'SERVICE' as const,
    name: 'Immersive Garden - Digital Studio',
    description: 'CSS Design Awards Website of the Year 2024 nominee. Paris-based digital experiences studio for luxury brands.',
    category: 'Award-Winning / Agency',
  },
  {
    url: 'https://www.zebracat.ai/',
    type: 'SERVICE' as const,
    name: 'Zebracat - AI Video Platform',
    description: 'Modern AI video creation platform with hero sections, feature showcases. Ideal for SaaS and tech companies.',
    category: 'Award-Winning / SaaS',
  },
  {
    url: 'https://www.clay.com/',
    type: 'SERVICE' as const,
    name: 'Clay - GTM Data Platform',
    description: 'Professional B2B platform with data visualization, testimonials, clear value propositions.',
    category: 'Award-Winning / B2B',
  },
  {
    url: 'https://www.starcloud.com/',
    type: 'SERVICE' as const,
    name: 'Starcloud - Space Data',
    description: 'Futuristic tech design with bold visuals and mission-focused content. Great for deep-tech companies.',
    category: 'Award-Winning / Tech',
  },
  {
    url: 'https://www.neoculturalcouture.com/',
    type: 'SERVICE' as const,
    name: 'NeoCultural Couture - Fashion',
    description: 'Creative fashion platform with immersive visuals and artistic presentation.',
    category: 'Award-Winning / Creative',
  },
  {
    url: 'https://www.little-lagniappe.com/',
    type: 'SERVICE' as const,
    name: 'Little Lagniappe - Baby Food',
    description: 'Warm, family-focused design with subscription features. Ideal for family and subscription services.',
    category: 'Award-Winning / E-commerce',
  },

  // PRODUCT - E-commerce, product-focused (Awwwards, UX awards)
  {
    url: 'https://gufram.it/',
    type: 'PRODUCT' as const,
    name: 'Gufram - Design Furniture',
    description: 'Awwwards Site of the Day Feb 2025. Italian design furniture with bold visuals and product showcase.',
    category: 'Award-Winning / Furniture',
  },
  {
    url: 'https://davidprotein.com/',
    type: 'PRODUCT' as const,
    name: 'David Protein - Protein Bars',
    description: 'Modern e-commerce with product showcase, clean design. Perfect for food and beverage brands.',
    category: 'Award-Winning / Food',
  },
  {
    url: 'https://matelibre.com/',
    type: 'PRODUCT' as const,
    name: 'Mate Libre - Yerba Mate',
    description: 'Beverage product site with organic focus and heritage storytelling.',
    category: 'Award-Winning / Beverage',
  },
  {
    url: 'https://white-coffee.com/',
    type: 'PRODUCT' as const,
    name: 'White Coffee - Coffee Brand',
    description: 'Minimalist coffee brand with product focus and premium positioning.',
    category: 'Award-Winning / Food',
  },
  {
    url: 'https://marcopanconesi.com/',
    type: 'PRODUCT' as const,
    name: 'Marco Panconesi - Jewelry',
    description: 'Luxury jewelry e-commerce with elegant product display.',
    category: 'Award-Winning / Jewelry',
  },
  {
    url: 'https://vaara.com/',
    type: 'PRODUCT' as const,
    name: 'Vaara - Activewear',
    description: 'Premium activewear brand with product collections and lifestyle imagery.',
    category: 'Award-Winning / Fashion',
  },
  {
    url: 'https://bedouinsdaughter.com/',
    type: 'PRODUCT' as const,
    name: 'Bedouins Daughter - Beauty',
    description: 'Beauty product brand with elegant product showcase.',
    category: 'Award-Winning / Beauty',
  },
];

async function main() {
  console.log('🏆 Seeding Award-Winning Website Templates\n');
  console.log(`📋 Total templates: ${AWARD_WINNING_TEMPLATES.length}\n`);

  const results = { success: [] as any[], failed: [] as any[] };

  for (let i = 0; i < AWARD_WINNING_TEMPLATES.length; i++) {
    const t = AWARD_WINNING_TEMPLATES[i];
    console.log(`[${i + 1}/${AWARD_WINNING_TEMPLATES.length}] ${t.name}`);
    console.log(`   URL: ${t.url} | Type: ${t.type}`);

    try {
      // Check if template with same name already exists
      const existing = await prisma.websiteTemplate.findFirst({
        where: { name: t.name },
      });
      if (existing) {
        console.log(`   ⏭️  Skipped (already exists)\n`);
        continue;
      }

      const imported = await websiteTemplateImporter.importTemplateFromUrl(
        t.url,
        t.type,
        t.name,
        t.description,
        t.category
      );

      console.log(`   ✅ Imported (ID: ${imported.id})\n`);
      results.success.push({ ...t, id: imported.id });
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      results.failed.push({ ...t, error: error.message });
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  // Set defaults if none exist
  const [serviceDefault, productDefault] = await Promise.all([
    prisma.websiteTemplate.findFirst({
      where: { type: 'SERVICE', isDefault: true },
    }),
    prisma.websiteTemplate.findFirst({
      where: { type: 'PRODUCT', isDefault: true },
    }),
  ]);

  if (!serviceDefault && results.success.some((r) => r.type === 'SERVICE')) {
    const first = results.success.find((r) => r.type === 'SERVICE');
    if (first?.id) {
      await websiteTemplateImporter.setDefaultTemplate(first.id);
      console.log(`📌 Set default SERVICE: ${first.name}`);
    }
  }
  if (!productDefault && results.success.some((r) => r.type === 'PRODUCT')) {
    const first = results.success.find((r) => r.type === 'PRODUCT');
    if (first?.id) {
      await websiteTemplateImporter.setDefaultTemplate(first.id);
      console.log(`📌 Set default PRODUCT: ${first.name}`);
    }
  }

  console.log('\n📊 Summary');
  console.log('─'.repeat(50));
  console.log(`✅ Imported: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
  }
  console.log('\n🎉 Done. Templates available in /api/admin/website-templates');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
