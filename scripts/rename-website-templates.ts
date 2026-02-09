/**
 * Rename Website Templates to "Nexrel - [Descriptive Name]" format
 * This script updates all existing templates with new naming convention
 */

import { prisma } from '../lib/db';

// Template rename mapping
const templateRenames: Record<string, string> = {
  // Real Estate / Service Templates
  'Keri White - Real Estate': 'Nexrel - Modern Real Estate',
  'Jennifer Ferland - Real Estate': 'Nexrel - Luxury Real Estate',
  'True Homes Property Group': 'Nexrel - Property Group',
  'Calcagno & Hamilton - Real Estate': 'Nexrel - Real Estate Professionals',
  
  // Product / E-commerce Templates
  'David Protein': 'Nexrel - E-commerce Showcase',
  'Mate Libre': 'Nexrel - Organic Products',
  'White Coffee': 'Nexrel - Coffee Shop',
  'Marco Panconesi': 'Nexrel - Jewelry Store',
  'Vaara': 'Nexrel - Activewear Store',
  'Bedouins Daughter': 'Nexrel - Beauty Products',
};

async function renameTemplates() {
  console.log('🔄 Starting template renaming...\n');

  try {
    const templates = await prisma.websiteTemplate.findMany({
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    console.log(`Found ${templates.length} templates to process\n`);

    let renamed = 0;
    let skipped = 0;

    for (const template of templates) {
      const newName = templateRenames[template.name];

      if (newName) {
        await prisma.websiteTemplate.update({
          where: { id: template.id },
          data: { name: newName },
        });

        console.log(`✅ Renamed: "${template.name}" → "${newName}"`);
        renamed++;
      } else {
        // If template name doesn't match, check if it already starts with "Nexrel -"
        if (!template.name.startsWith('Nexrel -')) {
          // Generate a generic name based on type
          const typeLabel = template.type === 'SERVICE' ? 'Service' : 'Product';
          const newName = `Nexrel - ${typeLabel} Template`;
          
          await prisma.websiteTemplate.update({
            where: { id: template.id },
            data: { name: newName },
          });

          console.log(`✅ Renamed: "${template.name}" → "${newName}"`);
          renamed++;
        } else {
          console.log(`⏭️  Skipped: "${template.name}" (already renamed)`);
          skipped++;
        }
      }
    }

    console.log(`\n✨ Renaming complete!`);
    console.log(`   - Renamed: ${renamed} templates`);
    console.log(`   - Skipped: ${skipped} templates`);
  } catch (error: any) {
    console.error('❌ Error renaming templates:', error);
    throw error;
  }
}

// Run the script
renameTemplates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
