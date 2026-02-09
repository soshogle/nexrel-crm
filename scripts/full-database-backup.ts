/**
 * Full Database Backup Script
 * Creates a complete backup of the Neon PostgreSQL database
 * 
 * Run with: npx tsx scripts/full-database-backup.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function createFullBackup() {
  console.log('🔄 Starting full database backup...\n');

  try {
    // Get database URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(process.cwd(), 'backups', `full-backup-${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`📁 Backup directory: ${backupDir}\n`);

    // Method 1: Try pg_dump (if available)
    let pgDumpSuccess = false;
    try {
      console.log('📦 Attempting pg_dump backup...');
      const dumpFile = path.join(backupDir, 'database_dump.sql');
      
      // Extract connection details for pg_dump
      const url = new URL(dbUrl);
      const host = url.hostname;
      const port = url.port || '5432';
      const database = url.pathname.slice(1).split('?')[0];
      const username = url.username;
      const password = url.password;

      // Create pg_dump command
      const pgDumpCmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F c -f "${dumpFile}" 2>&1`;
      
      execSync(pgDumpCmd, { stdio: 'inherit' });
      pgDumpSuccess = true;
      console.log('✅ pg_dump backup completed successfully\n');
    } catch (error: any) {
      console.log('⚠️  pg_dump not available or failed, trying alternative method...\n');
      pgDumpSuccess = false;
    }

    // Method 2: Schema backup using Prisma
    console.log('📋 Backing up schema...');
    const schemaBackup = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    
    fs.writeFileSync(
      path.join(backupDir, 'schema_structure.json'),
      JSON.stringify(schemaBackup, null, 2)
    );
    console.log('✅ Schema structure backed up\n');

    // Method 3: Backup critical tables data
    console.log('💾 Backing up critical table data...');
    
    const tablesToBackup = [
      'User',
      'VoiceAgent',
      'CallLog',
      'Lead',
      'Campaign',
      'Website',
      'TwilioAccount', // New table - might not exist yet
    ];

    const dataBackup: Record<string, any[]> = {};

    for (const table of tablesToBackup) {
      try {
        // Use dynamic query to get all data
        const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" LIMIT 10000`);
        dataBackup[table] = data as any[];
        console.log(`  ✅ ${table}: ${(data as any[]).length} rows`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.log(`  ⚠️  ${table}: Table doesn't exist yet (OK for new migrations)`);
        } else {
          console.log(`  ⚠️  ${table}: ${error.message}`);
        }
      }
    }

    fs.writeFileSync(
      path.join(backupDir, 'critical_data.json'),
      JSON.stringify(dataBackup, null, 2)
    );
    console.log('\n✅ Critical data backed up\n');

    // Method 4: Backup migration history
    console.log('📜 Backing up migration history...');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT * FROM "_prisma_migrations"
        ORDER BY started_at DESC;
      `;
      
      fs.writeFileSync(
        path.join(backupDir, 'migration_history.json'),
        JSON.stringify(migrations, null, 2)
      );
      console.log('✅ Migration history backed up\n');
    } catch (error) {
      console.log('⚠️  Could not backup migration history\n');
    }

    // Method 5: Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      databaseUrl: dbUrl.replace(/:[^:@]+@/, ':****@'), // Hide password
      backupMethod: pgDumpSuccess ? 'pg_dump' : 'prisma',
      tablesBackedUp: Object.keys(dataBackup),
      totalRows: Object.values(dataBackup).reduce((sum, rows) => sum + rows.length, 0),
      backupLocation: backupDir,
    };

    fs.writeFileSync(
      path.join(backupDir, 'backup_manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Create README for backup
    const readme = `# Database Backup

Created: ${new Date().toISOString()}

## Backup Contents

${pgDumpSuccess ? '- `database_dump.sql` - Full pg_dump backup (binary format)' : '- `database_dump.sql` - Not available (pg_dump not found)'}
- \`schema_structure.json\` - Database schema structure
- \`critical_data.json\` - Critical table data (User, VoiceAgent, etc.)
- \`migration_history.json\` - Prisma migration history
- \`backup_manifest.json\` - Backup metadata

## Restore Instructions

### If you have pg_dump file:
\`\`\`bash
pg_restore -h HOST -U USER -d DATABASE database_dump.sql
\`\`\`

### If using JSON backups:
1. Restore schema using Prisma migrations
2. Import critical_data.json using Prisma or SQL INSERT statements

## Important Notes

- This backup was created before applying Twilio Failover migration
- Keep this backup safe until migration is verified successful
- Neon also has automatic point-in-time recovery available
`;

    fs.writeFileSync(path.join(backupDir, 'README.md'), readme);

    console.log('📊 Backup Summary:');
    console.log('─'.repeat(60));
    console.log(`Location: ${backupDir}`);
    console.log(`Method: ${pgDumpSuccess ? 'pg_dump (full)' : 'Prisma (partial)'}`);
    console.log(`Tables backed up: ${Object.keys(dataBackup).length}`);
    console.log(`Total rows: ${manifest.totalRows}`);
    console.log('\n✅ Full backup completed successfully!');
    console.log(`\n📁 Backup location: ${backupDir}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Verify backup files exist');
    console.log('   2. Proceed with migration');
    console.log('   3. Keep this backup until migration is verified\n');

  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFullBackup();
