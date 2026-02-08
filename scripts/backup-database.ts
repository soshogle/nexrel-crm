#!/usr/bin/env tsx
/**
 * Database Backup Script
 * Creates a comprehensive backup before running migrations
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const BACKUP_DATE = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + 
  new Date().toTimeString().split(' ')[0].replace(/:/g, '');
const BACKUP_DIR = join(process.cwd(), 'backups', `pre-migration-${BACKUP_DATE}`);

async function main() {
  console.log('🔄 Starting database backup...\n');
  console.log(`📅 Backup Date: ${BACKUP_DATE}`);

  // Get git info
  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    // Git not available, continue
  }
  console.log(`📍 Git Commit: ${gitCommit}`);
  console.log(`🌿 Git Branch: ${gitBranch}\n`);

  // Check DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('Please set DATABASE_URL in .env.local or .env');
    process.exit(1);
  }

  console.log('✅ DATABASE_URL found\n');

  // Create backup directory
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
  console.log(`📁 Created backup directory: ${BACKUP_DIR}\n`);

  // Backup 1: pg_dump (if available)
  if (commandExists('pg_dump')) {
    console.log('💾 Creating pg_dump backup...');
    try {
      const dumpFile = join(BACKUP_DIR, 'database.sql');
      execSync(`pg_dump "${databaseUrl}" --no-owner --no-acl -f "${dumpFile}"`, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: extractPassword(databaseUrl) },
      });
      
      if (existsSync(dumpFile)) {
        const stats = require('fs').statSync(dumpFile);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ pg_dump backup created: ${dumpFile}`);
        console.log(`   File size: ${fileSizeMB} MB\n`);
      }
    } catch (error: any) {
      console.warn('⚠️  pg_dump had issues:', error.message);
      console.log('   Continuing with other backup methods...\n');
    }
  } else {
    console.log('⚠️  pg_dump not found, skipping SQL backup\n');
  }

  // Backup 2: Prisma schema
  console.log('📄 Backing up Prisma schema...');
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const schemaBackup = join(BACKUP_DIR, 'schema.prisma.backup');
  if (existsSync(schemaPath)) {
    copyFileSync(schemaPath, schemaBackup);
    console.log(`✅ Schema backed up: ${schemaBackup}\n`);
  } else {
    console.warn('⚠️  Schema file not found\n');
  }

  // Backup 3: Prisma JSON export
  console.log('📦 Creating Prisma JSON export...');
  const exportScript = join(process.cwd(), 'scripts', 'backup', 'export-database.mjs');
  if (existsSync(exportScript)) {
    try {
      execSync(`tsx ${exportScript}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Prisma JSON export completed\n');
    } catch (error: any) {
      console.warn('⚠️  Prisma export had issues:', error.message);
      console.log('   Continuing...\n');
    }
  } else {
    console.log('⚠️  Export script not found, skipping JSON export\n');
  }

  // Create manifest
  const manifestPath = join(BACKUP_DIR, 'BACKUP_MANIFEST.md');
  const dbInfo = parseDatabaseUrl(databaseUrl);
  const manifest = `# Database Backup Manifest

**Date:** ${new Date().toISOString()}
**Backup ID:** ${BACKUP_DATE}
**Git Commit:** ${gitCommit}
**Git Branch:** ${gitBranch}

## Backup Contents

1. **SQL Dump:** \`database.sql\` (pg_dump output, if available)
2. **Prisma Schema:** \`schema.prisma.backup\`
3. **JSON Export:** Table-specific JSON files (if export script ran)

## Database Info

- **Host:** ${dbInfo.host || 'from DATABASE_URL'}
- **Database:** ${dbInfo.database || 'from DATABASE_URL'}
- **Port:** ${dbInfo.port || 'from DATABASE_URL'}

## How to Restore

### Restore SQL Dump:
\`\`\`bash
psql \$DATABASE_URL < ${BACKUP_DIR}/database.sql
\`\`\`

### Restore Schema:
\`\`\`bash
cp ${BACKUP_DIR}/schema.prisma.backup prisma/schema.prisma
npx prisma generate
\`\`\`

### Restore from JSON (if needed):
Use the Prisma import scripts or manually restore JSON files.
`;

  writeFileSync(manifestPath, manifest);
  console.log(`📋 Backup manifest created: ${manifestPath}\n`);

  console.log('✅ Backup completed successfully!');
  console.log(`📁 Backup location: ${BACKUP_DIR}\n`);
}

function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function extractPassword(url: string): string {
  const match = url.match(/postgresql:\/\/[^:]+:([^@]+)@/);
  return match ? match[1] : '';
}

function parseDatabaseUrl(url: string): { host?: string; database?: string; port?: string } {
  const match = url.match(/postgresql:\/\/[^:]+:[^@]+@([^:]+):([^/]+)\/([^?]+)/);
  if (match) {
    return {
      host: match[1],
      port: match[2],
      database: match[3],
    };
  }
  return {};
}

main().catch((error) => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});
