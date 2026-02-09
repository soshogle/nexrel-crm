#!/usr/bin/env tsx
/**
 * Verify and Fix Template Defaults
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying templates and setting defaults...\n');

  // Get all templates
  const templates = await prisma.websiteTemplate.findMany({
    orderBy: [
      { type: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  console.log(`📊 Total templates: ${templates.length}\n`);

  const productTemplates = templates.filter(t => t.type === 'PRODUCT');
  const serviceTemplates = templates.filter(t => t.type === 'SERVICE');

  console.log(`PRODUCT templates: ${productTemplates.length}`);
  productTemplates.forEach(t => {
    console.log(`   - ${t.name}${t.isDefault ? ' [DEFAULT]' : ''}`);
  });

  console.log(`\nSERVICE templates: ${serviceTemplates.length}`);
  serviceTemplates.forEach(t => {
    console.log(`   - ${t.name}${t.isDefault ? ' [DEFAULT]' : ''}`);
  });

  // Set defaults if not set
  console.log('\n\n📌 Setting Default Templates...\n');

  // Set PRODUCT default
  const productDefault = productTemplates.find(t => t.isDefault);
  if (!productDefault && productTemplates.length > 0) {
    await prisma.websiteTemplate.update({
      where: { id: productTemplates[0].id },
      data: { isDefault: true },
    });
    console.log(`✅ Set PRODUCT default: ${productTemplates[0].name}`);
  } else if (productDefault) {
    console.log(`✅ PRODUCT default already set: ${productDefault.name}`);
  }

  // Set SERVICE default
  const serviceDefault = serviceTemplates.find(t => t.isDefault);
  if (!serviceDefault && serviceTemplates.length > 0) {
    await prisma.websiteTemplate.update({
      where: { id: serviceTemplates[0].id },
      data: { isDefault: true },
    });
    console.log(`✅ Set SERVICE default: ${serviceTemplates[0].name}`);
  } else if (serviceDefault) {
    console.log(`✅ SERVICE default already set: ${serviceDefault.name}`);
  }

  console.log('\n🎉 Template verification completed!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
