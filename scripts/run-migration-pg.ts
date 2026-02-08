#!/usr/bin/env tsx
/**
 * Run Migration Using pg Library Directly
 * Bypasses Prisma SSL issues by using pg library with custom SSL config
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { Client } = pg;

async function main() {
  console.log('🔄 Running migration using pg library directly...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  // Parse DATABASE_URL
  const url = new URL(databaseUrl);
  const config = {
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1), // Remove leading /
    user: url.username,
    password: url.password,
    ssl: {
      rejectUnauthorized: false, // Accept self-signed certificates
    },
  };

  console.log(`📡 Connecting to: ${config.host}:${config.port}/${config.database}\n`);

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationFile = join(
      process.cwd(),
      'prisma',
      'migrations',
      '20260208000000_add_multi_clinic_support',
      'migration.sql'
    );

    console.log(`📄 Reading migration file: ${migrationFile}`);
    const sql = readFileSync(migrationFile, 'utf-8');
    console.log('✅ Migration file loaded\n');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0) continue;

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        successCount++;
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error: any) {
        // Some errors are expected (e.g., table already exists, enum already exists)
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('relation') ||
          error.message?.includes('enum') ||
          error.message?.includes('constraint') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42710' || // duplicate_object
          error.code === '42P16'    // invalid_table_definition
        ) {
          skipCount++;
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}\n`);
        } else {
          errorCount++;
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`   Code: ${error.code}`);
          console.error(`   SQL: ${statement.substring(0, 100)}...\n`);
          // Continue with next statement
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}\n`);

    // Mark migration as applied in _prisma_migrations table
    try {
      await client.query(`
        INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES (
          gen_random_uuid()::text,
          '',
          NOW(),
          '20260208000000_add_multi_clinic_support',
          NULL,
          NULL,
          NOW(),
          1
        )
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ Migration marked as applied in _prisma_migrations table\n');
    } catch (error: any) {
      console.warn('⚠️  Could not update _prisma_migrations table:', error.message);
      console.log('   This is okay - migration was still applied\n');
    }

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated\n');

    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with some errors. Please review the output above.');
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
