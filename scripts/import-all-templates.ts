#!/usr/bin/env tsx
/**
 * Import All Website Templates from URLs
 * Imports multiple templates at once
 */

import { websiteTemplateImporter } from '../lib/website-builder/template-importer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Template definitions
const templates = [
  // PRODUCT Templates (E-commerce/Product-focused)
  {
    url: 'https://davidprotein.com/',
    type: 'PRODUCT' as const,
    name: 'David Protein - Product E-commerce',
    description: 'Modern protein bar e-commerce site with product showcase',
    category: 'E-commerce',
  },
  {
    url: 'https://matelibre.com/',
    type: 'PRODUCT' as const,
    name: 'Mate Libre - Beverage Products',
    description: 'Yerba mate beverage product site with organic focus',
    category: 'Beverage',
  },
  {
    url: 'https://white-coffee.com/',
    type: 'PRODUCT' as const,
    name: 'White Coffee - Coffee Shop',
    description: 'Minimalist coffee brand with product focus',
    category: 'Food & Beverage',
  },
  {
    url: 'https://marcopanconesi.com/',
    type: 'PRODUCT' as const,
    name: 'Marco Panconesi - Jewelry E-commerce',
    description: 'Luxury jewelry e-commerce with elegant product display',
    category: 'Jewelry',
  },
  {
    url: 'https://vaara.com/collections/new-in',
    type: 'PRODUCT' as const,
    name: 'Vaara - Activewear E-commerce',
    description: 'Premium activewear brand with product collections',
    category: 'Fashion',
  },
  {
    url: 'https://bedouinsdaughter.com/',
    type: 'PRODUCT' as const,
    name: 'Bedouins Daughter - Beauty Products',
    description: 'Beauty product brand with elegant product showcase',
    category: 'Beauty',
  },
  
  // SERVICE Templates (Real Estate/Service-focused)
  {
    url: 'https://homesinsantabarbara.com/',
    type: 'SERVICE' as const,
    name: 'Calcagno & Hamilton - Real Estate',
    description: 'Real estate service site with property listings and team focus',
    category: 'Real Estate',
  },
  {
    url: 'https://www.jenferland.com/',
    type: 'SERVICE' as const,
    name: 'Jennifer Ferland - Real Estate',
    description: 'Real estate agent site with portfolio and client resources',
    category: 'Real Estate',
  },
  {
    url: 'https://www.truehomespropertygroup.com/',
    type: 'SERVICE' as const,
    name: 'True Homes Property Group',
    description: 'Real estate solutions company with service offerings',
    category: 'Real Estate',
  },
  {
    url: 'https://keriwhite.com/',
    type: 'SERVICE' as const,
    name: 'Keri White - Real Estate',
    description: 'Top real estate agent site with testimonials and listings',
    category: 'Real Estate',
  },
];

async function main() {
  console.log('🚀 Importing Website Templates\n');
  console.log(`📋 Total templates to import: ${templates.length}\n`);

  const results = {
    success: [] as any[],
    failed: [] as any[],
  };

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    console.log(`\n[${i + 1}/${templates.length}] Importing: ${template.name}`);
    console.log(`   URL: ${template.url}`);
    console.log(`   Type: ${template.type}`);

    try {
      const imported = await websiteTemplateImporter.importTemplateFromUrl(
        template.url,
        template.type,
        template.name,
        template.description,
        template.category
      );

      console.log(`   ✅ Success! Template ID: ${imported.id}`);
      results.success.push({
        ...template,
        id: imported.id,
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.failed.push({
        ...template,
        error: error.message,
      });
    }
  }

  // Set defaults
  console.log('\n\n📌 Setting Default Templates...\n');
  
  const productTemplates = results.success.filter(t => t.type === 'PRODUCT');
  const serviceTemplates = results.success.filter(t => t.type === 'SERVICE');

  if (productTemplates.length > 0) {
    try {
      await websiteTemplateImporter.setDefaultTemplate(productTemplates[0].id);
      console.log(`✅ Set default PRODUCT template: ${productTemplates[0].name}`);
    } catch (error: any) {
      console.error(`❌ Failed to set PRODUCT default: ${error.message}`);
    }
  }

  if (serviceTemplates.length > 0) {
    try {
      await websiteTemplateImporter.setDefaultTemplate(serviceTemplates[0].id);
      console.log(`✅ Set default SERVICE template: ${serviceTemplates[0].name}`);
    } catch (error: any) {
      console.error(`❌ Failed to set SERVICE default: ${error.message}`);
    }
  }

  // Summary
  console.log('\n\n📊 Import Summary\n');
  console.log(`✅ Successfully imported: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}\n`);

  if (results.success.length > 0) {
    console.log('✅ Successfully Imported Templates:');
    results.success.forEach(t => {
      console.log(`   - ${t.name} (${t.type}) - ID: ${t.id}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Imports:');
    results.failed.forEach(t => {
      console.log(`   - ${t.name} (${t.type}): ${t.error}`);
    });
  }

  console.log('\n🎉 Template import process completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Templates are now available in the database');
  console.log('   2. Users can select them when creating websites');
  console.log('   3. View templates: GET /api/admin/website-templates');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
