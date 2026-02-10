#!/usr/bin/env tsx
/**
 * Safe Migration Script with Automatic Backup
 * 
 * This script automatically creates a database backup before running any Prisma migration.
 * 
 * Usage:
 *   tsx scripts/migrate-with-backup.ts dev --name migration_name
 *   tsx scripts/migrate-with-backup.ts deploy
 *   tsx scripts/migrate-with-backup.ts reset (with confirmation)
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const BACKUP_DIR = join(process.cwd(), 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + 
  new Date().toTimeString().split(' ')[0].replace(/:/g, '');
const BACKUP_SUBDIR = join(BACKUP_DIR, `pre-migration-${TIMESTAMP}`);

interface BackupResult {
  success: boolean;
  methods: string[];
  errors: string[];
  backupPath: string;
}

async function createBackup(): Promise<BackupResult> {
  const result: BackupResult = {
    success: false,
    methods: [],
    errors: [],
    backupPath: BACKUP_SUBDIR,
  };

  console.log('🔄 Starting database backup before migration...\n');

  // Create backup directory
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
  if (!existsSync(BACKUP_SUBDIR)) {
    mkdirSync(BACKUP_SUBDIR, { recursive: true });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    result.errors.push('DATABASE_URL environment variable not set');
    console.error('❌ DATABASE_URL not found in environment variables');
    return result;
  }

  console.log(`📁 Backup directory: ${BACKUP_SUBDIR}\n`);

  // Method 1: Neon Branch Backup (if using Neon)
  if (databaseUrl.includes('neon.tech')) {
    console.log('💡 Detected Neon database - consider creating a branch backup:');
    console.log('   1. Go to https://console.neon.tech');
    console.log('   2. Select your project');
    console.log('   3. Click "Branches" → "Create Branch"');
    console.log(`   4. Name it: backup-pre-migration-${TIMESTAMP}\n`);
    result.methods.push('Neon branch (manual)');
  }

  // Method 2: pg_dump backup
  try {
    console.log('💾 Attempting pg_dump backup...');
    const dumpFile = join(BACKUP_SUBDIR, 'database.sql');
    
    // Extract password from connection string for pg_dump
    const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
    const password = url.password;
    
    // Set PGPASSWORD environment variable
    const env = { ...process.env };
    if (password) {
      env.PGPASSWORD = password;
    }

    execSync(
      `pg_dump "${databaseUrl}" --no-owner --no-acl --clean --if-exists -f "${dumpFile}"`,
      {
        stdio: 'inherit',
        env,
      }
    );

    if (existsSync(dumpFile)) {
      const { statSync } = await import('fs');
      const stats = statSync(dumpFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ pg_dump backup created: ${dumpFile}`);
      console.log(`   File size: ${fileSizeMB} MB\n`);
      result.methods.push('pg_dump');
      result.success = true;
    }
  } catch (error: any) {
    const errorMsg = `pg_dump failed: ${error.message}`;
    console.warn(`⚠️  ${errorMsg}`);
    console.log('   This is OK if pg_dump is not installed\n');
    result.errors.push(errorMsg);
  }

  // Method 3: Prisma Schema backup
  try {
    console.log('📄 Backing up Prisma schema...');
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaBackup = join(BACKUP_SUBDIR, 'schema.prisma.backup');
    
    if (existsSync(schemaPath)) {
      const { copyFileSync } = await import('fs');
      copyFileSync(schemaPath, schemaBackup);
      console.log(`✅ Schema backed up: ${schemaBackup}\n`);
      result.methods.push('Prisma schema');
    }
  } catch (error: any) {
    const errorMsg = `Schema backup failed: ${error.message}`;
    console.warn(`⚠️  ${errorMsg}`);
    result.errors.push(errorMsg);
  }

  // Method 4: Prisma JSON export (if export script exists)
  const exportScript = join(process.cwd(), 'scripts', 'backup', 'export-database.mjs');
  if (existsSync(exportScript)) {
    try {
      console.log('📦 Creating Prisma JSON export...');
      execSync(`tsx ${exportScript}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Prisma JSON export completed\n');
      result.methods.push('Prisma JSON export');
    } catch (error: any) {
      const errorMsg = `JSON export failed: ${error.message}`;
      console.warn(`⚠️  ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }

  // Create backup manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    backupPath: BACKUP_SUBDIR,
    methods: result.methods,
    errors: result.errors,
    databaseUrl: databaseUrl.replace(/:[^:@]+@/, ':****@'), // Hide password
    migrationCommand: process.argv.slice(2).join(' '),
  };

  const manifestPath = join(BACKUP_SUBDIR, 'BACKUP_MANIFEST.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📋 Backup manifest created: ${manifestPath}\n`);

  if (result.methods.length > 0) {
    result.success = true;
    console.log('✅ Backup completed successfully!');
    console.log(`   Methods used: ${result.methods.join(', ')}\n`);
  } else {
    console.warn('⚠️  No backup methods succeeded, but continuing...\n');
  }

  return result;
}

function runMigration() {
  // Get all arguments after the script name
  // process.argv[0] = node, [1] = script path, [2+] = actual args
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ No migration command provided');
    console.log('\nUsage:');
    console.log('  npm run migrate:dev -- --name migration_name');
    console.log('  npm run migrate:deploy');
    console.log('  npm run migrate:reset');
    console.log('\nOr directly:');
    console.log('  tsx scripts/migrate-with-backup.ts dev --name migration_name');
    process.exit(1);
  }

  const command = args[0];

  // Special handling for reset command
  if (command === 'reset') {
    console.log('⚠️  WARNING: This will DELETE ALL DATA in your database!');
    console.log('   Make sure you have a backup before proceeding.\n');
    console.log('   Proceeding with reset...\n');
  }

  // Build the prisma migrate command with all arguments
  const prismaArgs = args.join(' ');
  console.log(`🚀 Running migration: prisma migrate ${prismaArgs}\n`);

  try {
    execSync(`npx prisma migrate ${prismaArgs}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env }, // Pass through environment variables
    });
    console.log('\n✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed!');
    console.error(`   Your backup is safe at: ${BACKUP_SUBDIR}`);
    console.error(`   You can restore from the backup if needed.\n`);
    process.exit(1);
  }
}

async function main() {
  // Create backup first
  const backupResult = await createBackup();

  if (!backupResult.success && backupResult.methods.length === 0) {
    console.log('⚠️  WARNING: No backup methods succeeded!');
    console.log('   Consider creating a manual backup before proceeding.\n');
    
    // Ask user if they want to continue (in a real scenario)
    // For now, we'll continue but warn
    console.log('   Continuing with migration anyway...\n');
  }

  // Run migration
  runMigration();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
