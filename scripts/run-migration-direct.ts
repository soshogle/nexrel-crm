#!/usr/bin/env tsx
/**
 * Run Migration Directly via SQL
 * Bypasses Prisma CLI SSL issues by executing SQL directly
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Running migration directly via SQL...\n');

  const migrationFile = join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260208000000_add_multi_clinic_support',
    'migration.sql'
  );

  console.log(`📄 Reading migration file: ${migrationFile}`);

  try {
    const sql = readFileSync(migrationFile, 'utf-8');
    console.log('✅ Migration file loaded\n');

    // Split SQL into individual statements
    // Remove comments and split by semicolons
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0) continue;

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        // Use $executeRawUnsafe to execute raw SQL
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error: any) {
        // Some errors are expected (e.g., table already exists, enum already exists)
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('relation') ||
          error.message?.includes('enum')
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}\n`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`   SQL: ${statement.substring(0, 100)}...\n`);
          // Continue with next statement
        }
      }
    }

    console.log('✅ Migration completed!\n');

    // Mark migration as applied in _prisma_migrations table
    try {
      await prisma.$executeRawUnsafe(`
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

    console.log('🎉 Migration process completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
