#!/usr/bin/env tsx
/**
 * Verify Google Search Console Columns Migration
 * Checks if all Google Search Console columns exist in the Website table
 */

import { prisma } from '@/lib/db';

async function verifyColumns() {
  console.log('🔍 Verifying Google Search Console columns migration...\n');

  const requiredColumns = [
    'googleSearchConsoleAccessToken',
    'googleSearchConsoleRefreshToken',
    'googleSearchConsoleTokenExpiry',
    'googleSearchConsoleSiteUrl',
    'googleSearchConsoleVerified',
  ];

  try {
    const results = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Website' 
      AND column_name IN (
        'googleSearchConsoleAccessToken',
        'googleSearchConsoleRefreshToken',
        'googleSearchConsoleTokenExpiry',
        'googleSearchConsoleSiteUrl',
        'googleSearchConsoleVerified'
      )
      ORDER BY column_name;
    `;

    console.log(`Found ${results.length} of ${requiredColumns.length} required columns:\n`);

    const foundColumns = results.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));

    results.forEach(col => {
      console.log(`✅ ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}\n`);
    });

    if (missingColumns.length > 0) {
      console.log(`\n❌ Missing columns:`);
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log('\n⚠️  Migration may not have been applied. Please run the migration SQL manually in Neon SQL Editor.');
      process.exit(1);
    } else {
      console.log('✅ All Google Search Console columns are present!');
      console.log('✅ Migration appears to be successful.\n');
    }

  } catch (error: any) {
    console.error('❌ Error checking columns:', error.message);
    console.error('\nThis might indicate:');
    console.error('1. Database connection issue');
    console.error('2. Migration has not been applied');
    console.error('3. Table name might be different\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyColumns()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
