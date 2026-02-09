/**
 * Safe Migration Application Script
 * Uses Prisma's programmatic API to apply migration
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔄 Applying Twilio Failover migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      process.cwd(),
      'prisma/migrations/20260209120000_add_twilio_failover/migration.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found. Please ensure it exists.');
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📋 Migration SQL loaded\n');
    console.log('⚠️  This will execute the migration SQL directly.\n');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds for user to cancel if needed
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      try {
        console.log(`[${i + 1}/${statements.length}] Executing statement...`);
        await prisma.$executeRawUnsafe(statement + ';');
        console.log(`✅ Statement ${i + 1} completed`);
      } catch (error: any) {
        // Some errors are OK (like "already exists")
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.message.includes('IF NOT EXISTS')
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\n📊 New tables created:');
    console.log('   - TwilioAccount');
    console.log('   - TwilioFailoverEvent');
    console.log('   - TwilioHealthCheck');
    console.log('   - TwilioBackupPhoneNumber');
    console.log('\n🔧 VoiceAgent table updated with new columns\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Alternative: Apply manually in Neon SQL Editor');
    console.error('   File: APPLY_TWILIO_FAILOVER_MIGRATION.sql\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
