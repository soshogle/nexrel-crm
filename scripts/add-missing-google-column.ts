#!/usr/bin/env tsx
/**
 * Add Missing Google Search Console Column
 * Adds googleSearchConsoleVerified column if it doesn't exist
 */

import { prisma } from '@/lib/db';

async function addMissingColumn() {
  console.log('🔧 Checking for missing googleSearchConsoleVerified column...\n');

  try {
    // Try to query the column to see if it exists
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Website' 
      AND column_name = 'googleSearchConsoleVerified'
    `;

    if (result.length > 0) {
      console.log('✅ Column googleSearchConsoleVerified already exists!');
      return;
    }

    console.log('⚠️  Column not found. Adding googleSearchConsoleVerified column...');

    // Add the column
    await prisma.$executeRaw`
      ALTER TABLE "Website" 
      ADD COLUMN IF NOT EXISTS "googleSearchConsoleVerified" BOOLEAN NOT NULL DEFAULT false
    `;

    console.log('✅ Successfully added googleSearchConsoleVerified column!');

    // Verify it was added
    const verify = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Website' 
      AND column_name = 'googleSearchConsoleVerified'
    `;

    if (verify.length > 0) {
      console.log('✅ Verification: Column exists in database');
    } else {
      console.log('❌ Warning: Column may not have been added correctly');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    // Try alternative approach using direct SQL
    console.log('\n🔄 Trying alternative approach...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Website' 
            AND column_name = 'googleSearchConsoleVerified'
          ) THEN
            ALTER TABLE "Website" ADD COLUMN "googleSearchConsoleVerified" BOOLEAN NOT NULL DEFAULT false;
          END IF;
        END $$;
      `);
      console.log('✅ Column added using alternative method!');
    } catch (altError: any) {
      console.error('❌ Alternative method also failed:', altError.message);
      throw altError;
    }
  }
}

addMissingColumn()
  .then(() => {
    console.log('\n✅ Column check/add completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
