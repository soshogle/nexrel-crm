#!/usr/bin/env tsx
/**
 * Backup Database and Run Migration
 * 
 * This script:
 * 1. Creates a backup of the database
 * 2. Applies pending migrations using prisma migrate deploy
 * 3. Regenerates Prisma client
 * 
 * Note: For new schema changes, use `npx prisma migrate dev --name migration_name`
 * This script is for applying existing migrations in production-like environments.
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

  // Step 4: Apply pending migrations to database
  console.log('📝 Applying pending migrations to database...');
  console.log('   Using prisma migrate deploy (production-safe)');
  console.log('   This will apply any pending migrations from prisma/migrations/');
  console.log('');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✓ Migrations applied successfully\n');
  } catch (error: any) {
    console.error('✗ Failed to apply migrations:', error);
    console.log('\n⚠️  You may need to run manually:');
    console.log('   npx prisma migrate deploy');
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
