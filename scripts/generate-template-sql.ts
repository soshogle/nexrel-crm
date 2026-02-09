#!/usr/bin/env tsx
/**
 * Generate SQL INSERT statements for templates
 * Scrapes websites and generates SQL that can be run manually
 */

import { websiteScraper } from '../lib/website-builder/scraper';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Template definitions
const templates = [
  // PRODUCT Templates
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
  
  // SERVICE Templates
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

function convertScrapedDataToTemplate(scrapedData: any): any {
  const structure: any = {
    pages: [],
    globalStyles: scrapedData.styles || {},
    navigation: scrapedData.navigation || {},
    footer: scrapedData.footer || {},
    seo: scrapedData.seo || {},
  };

  // Create default page structure from scraped content
  const components: any[] = [];

  // Add hero section if available
  if (scrapedData.seo?.title) {
    components.push({
      id: 'hero',
      type: 'Hero',
      props: {
        title: scrapedData.seo.title,
        subtitle: scrapedData.seo.description || '',
        image: scrapedData.images?.[0]?.url || null,
      },
    });
  }

  // Add content sections
  if (scrapedData.structure?.sections) {
    scrapedData.structure.sections.forEach((section: any, index: number) => {
      components.push({
        id: `section-${index}`,
        type: 'ContentSection',
        props: {
          title: section.title || '',
          content: section.content || '',
          images: section.images || [],
        },
      });
    });
  }

  // Add products if available
  if (scrapedData.products && scrapedData.products.length > 0) {
    components.push({
      id: 'products',
      type: 'Products',
      props: {
        items: scrapedData.products.slice(0, 6).map((p: any) => ({
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
        })),
      },
    });
  }

  // Add forms if available
  if (scrapedData.forms && scrapedData.forms.length > 0) {
    components.push({
      id: 'contact-form',
      type: 'ContactForm',
      props: {
        fields: scrapedData.forms[0].fields || [],
      },
    });
  }

  structure.pages = [
    {
      id: 'home',
      path: '/',
      title: scrapedData.seo?.title || 'Home',
      components,
      seo: scrapedData.seo || {},
    },
  ];

  return structure;
}

function extractPreviewImage(scrapedData: any): string | null {
  if (scrapedData.images && scrapedData.images.length > 0) {
    const largeImage = scrapedData.images.find((img: any) => 
      img.width > 500 || img.height > 500
    );
    if (largeImage) return largeImage.url;
    return scrapedData.images[0].url;
  }
  return null;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function generateSQL(template: any, structure: any, previewImage: string | null): string {
  const id = `template_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const structureJson = JSON.stringify(structure).replace(/'/g, "''");
  const previewImageSql = previewImage ? `'${escapeSQL(previewImage)}'` : 'NULL';
  
  return `INSERT INTO "WebsiteTemplate" ("id", "name", "type", "category", "previewImage", "structure", "description", "isDefault", "createdAt", "updatedAt")
VALUES (
  '${id}',
  '${escapeSQL(template.name)}',
  '${template.type}',
  '${escapeSQL(template.category)}',
  ${previewImageSql},
  '${structureJson}'::jsonb,
  '${escapeSQL(template.description)}',
  false,
  NOW(),
  NOW()
);`;
}

async function main() {
  console.log('🚀 Generating Template SQL\n');
  console.log(`📋 Total templates to process: ${templates.length}\n`);

  const sqlStatements: string[] = [];
  const results: any[] = [];

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    console.log(`[${i + 1}/${templates.length}] Processing: ${template.name}`);
    console.log(`   URL: ${template.url}`);

    try {
      // Scrape the website
      const scrapedData = await websiteScraper.scrapeWebsite(template.url);
      
      if (!scrapedData) {
        throw new Error('Failed to scrape website');
      }

      // Convert to template structure
      const templateStructure = convertScrapedDataToTemplate(scrapedData);
      const previewImage = extractPreviewImage(scrapedData);

      // Generate SQL
      const sql = generateSQL(template, templateStructure, previewImage);
      sqlStatements.push(sql);
      
      results.push({
        ...template,
        success: true,
        previewImage,
      });

      console.log(`   ✅ Scraped successfully`);
      console.log(`   📸 Preview image: ${previewImage || 'None'}`);
      console.log(`   📄 Components: ${templateStructure.pages[0]?.components?.length || 0}\n`);

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      results.push({
        ...template,
        success: false,
        error: error.message,
      });
    }
  }

  // Generate SQL file
  const sqlContent = `-- Website Template Import SQL
-- Generated: ${new Date().toISOString()}
-- Run this in Neon SQL Editor to import all templates

${sqlStatements.join('\n\n')}

-- Set default templates
UPDATE "WebsiteTemplate" 
SET "isDefault" = true 
WHERE "id" IN (
  SELECT "id" FROM "WebsiteTemplate" 
  WHERE "type" = 'PRODUCT' 
  ORDER BY "createdAt" DESC 
  LIMIT 1
);

UPDATE "WebsiteTemplate" 
SET "isDefault" = true 
WHERE "id" IN (
  SELECT "id" FROM "WebsiteTemplate" 
  WHERE "type" = 'SERVICE' 
  ORDER BY "createdAt" DESC 
  LIMIT 1
);
`;

  const outputPath = join(process.cwd(), 'TEMPLATE_IMPORT_SQL.sql');
  writeFileSync(outputPath, sqlContent);

  console.log('\n📊 Summary\n');
  console.log(`✅ Successfully scraped: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
  console.log(`\n📄 SQL file generated: ${outputPath}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Open TEMPLATE_IMPORT_SQL.sql');
  console.log('   2. Copy all SQL');
  console.log('   3. Paste into Neon SQL Editor');
  console.log('   4. Run to import all templates');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
