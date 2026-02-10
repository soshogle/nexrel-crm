#!/usr/bin/env tsx
/**
 * Import Service Website Templates
 * Imports the specified websites as SERVICE templates
 */

import { websiteTemplateImporter } from '@/lib/website-builder/template-importer';
import { prisma } from '@/lib/db';

const templates = [
  {
    url: 'https://www.zebracat.ai/',
    name: 'Zebracat - AI Video Creation',
    description: 'Modern AI video creation platform with clean design, hero sections, and feature showcases. Perfect for SaaS and tech companies.',
    category: 'SaaS / Tech',
  },
  {
    url: 'https://www.clay.com/',
    name: 'Clay - GTM Data Platform',
    description: 'Professional B2B platform design with data visualization, customer testimonials, and clear value propositions. Ideal for data and marketing tools.',
    category: 'B2B / Marketing',
  },
  {
    url: 'https://www.starcloud.com/',
    name: 'Starcloud - Space Data Centers',
    description: 'Futuristic tech company design with bold visuals, mission-focused content, and innovative presentation. Great for deep-tech and space companies.',
    category: 'Deep Tech / Innovation',
  },
  {
    url: 'https://www.neoculturalcouture.com/',
    name: 'NeoCultural Couture - Fashion Innovation',
    description: 'Creative fashion platform with immersive visuals, cultural themes, and artistic presentation. Perfect for creative industries and fashion brands.',
    category: 'Creative / Fashion',
  },
  {
    url: 'https://www.little-lagniappe.com/',
    name: 'Little Lagniappe - Baby Food Subscription',
    description: 'Warm, family-focused design with product showcases, subscription features, and trust-building elements. Ideal for subscription services and family products.',
    category: 'E-commerce / Subscription',
  },
];

async function importTemplates() {
  console.log('🚀 Starting template import process...\n');

  const results = [];

  for (const template of templates) {
    try {
      console.log(`📥 Importing: ${template.name}`);
      console.log(`   URL: ${template.url}`);
      console.log(`   Category: ${template.category}\n`);

      const imported = await websiteTemplateImporter.importTemplateFromUrl(
        template.url,
        'SERVICE',
        template.name,
        template.description,
        template.category
      );

      results.push({
        success: true,
        name: template.name,
        id: imported.id,
      });

      console.log(`✅ Successfully imported: ${template.name} (ID: ${imported.id})\n`);
    } catch (error: any) {
      console.error(`❌ Failed to import ${template.name}:`, error.message);
      results.push({
        success: false,
        name: template.name,
        error: error.message,
      });
      console.log('');
    }

    // Small delay between imports to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n📊 Import Summary:');
  console.log('─'.repeat(50));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${result.name} - ID: ${result.id}`);
    } else {
      console.log(`❌ ${result.name} - Error: ${result.error}`);
    }
  });

  console.log('─'.repeat(50));
  console.log(`\n✅ Successfully imported: ${successful}/${templates.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${templates.length}`);
  }

  // List all SERVICE templates
  console.log('\n📋 All SERVICE templates in database:');
  const allTemplates = await prisma.websiteTemplate.findMany({
    where: { type: 'SERVICE' },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      isDefault: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  allTemplates.forEach((t) => {
    console.log(`  - ${t.name} (${t.category || 'Uncategorized'})${t.isDefault ? ' [DEFAULT]' : ''}`);
  });
}

importTemplates()
  .then(() => {
    console.log('\n✅ Template import process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
