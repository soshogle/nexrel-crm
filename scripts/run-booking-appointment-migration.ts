#!/usr/bin/env tsx
/**
 * Run BookingAppointment clinicId migration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    process.exit(1);
  }

  const migrationSqlPath = join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    '20260208110000_add_clinic_id_to_booking_appointment',
    'migration.sql'
  );

  let migrationSql: string;
  try {
    migrationSql = readFileSync(migrationSqlPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Could not read migration SQL file: ${migrationSqlPath}`);
    process.exit(1);
  }

  console.log('🔌 Using direct PostgreSQL connection...\n');

  try {
    const { Client } = await import('pg');

    // Parse DATABASE_URL and convert pooler to direct connection
    let connectionString = DATABASE_URL;
    if (connectionString.includes('-pooler.')) {
      console.log('🔄 Converting pooler connection to direct connection...');
      connectionString = connectionString.replace('-pooler.', '.');
    }

    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Executing migration SQL...\n');
    await client.query(migrationSql);
    console.log('✅ Migration SQL executed successfully!\n');

    await client.end();

    console.log('🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Test the build: npm run build');

  } catch (error: any) {
    console.error('\n❌ Failed to run migration:');
    console.error(error.message);
    process.exit(1);
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
