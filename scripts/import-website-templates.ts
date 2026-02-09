#!/usr/bin/env tsx
/**
 * Import Website Templates from URLs
 * Usage: npx tsx scripts/import-website-templates.ts <service_url> <product_url>
 */

import { websiteTemplateImporter } from '../lib/website-builder/template-importer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/import-website-templates.ts <service_url> <product_url>');
    console.log('\nExample:');
    console.log('  npx tsx scripts/import-website-templates.ts https://example-service.com https://example-product.com');
    process.exit(1);
  }

  const [serviceUrl, productUrl] = args;

  console.log('🚀 Importing Website Templates\n');
  console.log(`Service Template URL: ${serviceUrl}`);
  console.log(`Product Template URL: ${productUrl}\n`);

  try {
    // Import Service Template
    console.log('📥 Importing Service Template...');
    const serviceTemplate = await websiteTemplateImporter.importTemplateFromUrl(
      serviceUrl,
      'SERVICE',
      'Service Template',
      `Template imported from ${serviceUrl}`,
      'Imported'
    );
    console.log(`✅ Service Template created: ${serviceTemplate.id}\n`);

    // Set as default
    await websiteTemplateImporter.setDefaultTemplate(serviceTemplate.id);
    console.log('✅ Service Template set as default\n');

    // Import Product Template
    console.log('📥 Importing Product Template...');
    const productTemplate = await websiteTemplateImporter.importTemplateFromUrl(
      productUrl,
      'PRODUCT',
      'Product Template',
      `Template imported from ${productUrl}`,
      'Imported'
    );
    console.log(`✅ Product Template created: ${productTemplate.id}\n`);

    // Set as default
    await websiteTemplateImporter.setDefaultTemplate(productTemplate.id);
    console.log('✅ Product Template set as default\n');

    console.log('🎉 All templates imported successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Service Template ID: ${serviceTemplate.id}`);
    console.log(`   Product Template ID: ${productTemplate.id}`);
    console.log('\n✅ Templates are now available for users to select when creating websites.');
  } catch (error: any) {
    console.error('❌ Error importing templates:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
