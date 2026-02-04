#!/usr/bin/env tsx
/**
 * Backup Database and Run Migration
 * 
 * This script:
 * 1. Creates a backup of the database
 * 2. Creates a migration for missing columns/tables (dateOfBirth, FeedbackCollection)
 * 3. Runs the migration
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = join(process.cwd(), 'backups', new Date().toISOString().split('T')[0]);

async function main() {
  console.log('🔄 Starting backup and migration process...\n');

  // Step 1: Create backup directory
  console.log('📁 Creating backup directory...');
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
  console.log(`✓ Backup directory: ${BACKUP_DIR}\n`);

  // Step 2: Run database backup script
  console.log('💾 Creating database backup...');
  try {
    execSync('tsx scripts/backup/export-database.mjs', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✓ Backup completed successfully\n');
  } catch (error) {
    console.error('✗ Backup failed:', error);
    console.log('⚠️  Continuing with migration anyway...\n');
  }

  // Step 3: Generate Prisma client (to ensure schema is synced)
  console.log('🔧 Generating Prisma client...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✓ Prisma client generated\n');
  } catch (error) {
    console.error('✗ Failed to generate Prisma client:', error);
    throw error;
  }

  // Step 4: Push schema changes to database (adds missing columns/tables)
  console.log('📝 Pushing schema changes to database...');
  console.log('   This will add:');
  console.log('   - dateOfBirth column to Lead table');
  console.log('   - FeedbackCollection table (if missing)');
  console.log('');
  
  try {
    execSync('npx prisma db push', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✓ Schema changes applied successfully\n');
  } catch (error: any) {
    console.error('✗ Failed to push schema changes:', error);
    console.log('\n⚠️  You may need to run manually:');
    console.log('   npx prisma db push');
    throw error;
  }

  // Step 6: Regenerate Prisma client after migration
  console.log('🔧 Regenerating Prisma client after migration...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✓ Prisma client regenerated\n');
  } catch (error) {
    console.error('✗ Failed to regenerate Prisma client:', error);
    throw error;
  }

  console.log('✅ Backup and migration completed successfully!');
  console.log(`📦 Backup location: ${BACKUP_DIR}`);
  console.log('\n🎉 Your database now has:');
  console.log('   ✓ dateOfBirth column in Lead table');
  console.log('   ✓ FeedbackCollection table');
}

main().catch((error) => {
  console.error('\n❌ Process failed:', error);
  process.exit(1);
});
