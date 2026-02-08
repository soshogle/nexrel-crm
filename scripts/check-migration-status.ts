#!/usr/bin/env tsx
/**
 * Check Migration Status
 * 
 * Verifies if the migration was properly recorded in the database
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function checkMigrationStatus() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    process.exit(1);
  }

  // Convert pooler to direct connection
  let connectionString = DATABASE_URL;
  if (connectionString.includes('-pooler.')) {
    connectionString = connectionString.replace('-pooler.', '.');
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('📡 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected!\n');

    // Check if migration is recorded in _prisma_migrations
    console.log('🔍 Checking Prisma migrations table...\n');
    
    const migrationCheck = await client.query(`
      SELECT 
        migration_name,
        finished_at,
        started_at,
        applied_steps_count
      FROM "_prisma_migrations"
      WHERE migration_name = '20260208000000_add_multi_clinic_support'
      ORDER BY finished_at DESC
      LIMIT 1;
    `);

    if (migrationCheck.rows.length > 0) {
      const migration = migrationCheck.rows[0];
      console.log('✅ Migration found in _prisma_migrations table:');
      console.log(`   Migration Name: ${migration.migration_name}`);
      console.log(`   Started At: ${migration.started_at}`);
      console.log(`   Finished At: ${migration.finished_at}`);
      console.log(`   Applied Steps: ${migration.applied_steps_count}\n`);
    } else {
      console.log('⚠️  Migration NOT found in _prisma_migrations table');
      console.log('   This means the migration SQL ran, but wasn\'t marked as applied.\n');
    }

    // Check if tables exist
    console.log('🔍 Checking if new tables exist...\n');
    
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Clinic', 'UserClinic')
      ORDER BY table_name;
    `);

    if (tablesCheck.rows.length > 0) {
      console.log('✅ New tables found:');
      tablesCheck.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('❌ New tables NOT found!\n');
    }

    // Check if clinicId columns exist
    console.log('🔍 Checking if clinicId columns were added...\n');
    
    const columnsCheck = await client.query(`
      SELECT 
        table_name,
        column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_name = 'clinicId'
      AND table_name LIKE 'Dental%'
      ORDER BY table_name;
    `);

    if (columnsCheck.rows.length > 0) {
      console.log(`✅ Found clinicId column in ${columnsCheck.rows.length} tables:`);
      columnsCheck.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No clinicId columns found in Dental tables\n');
    }

    // Check all migrations
    console.log('📋 All migrations in database:\n');
    const allMigrations = await client.query(`
      SELECT 
        migration_name,
        finished_at,
        applied_steps_count
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC
      LIMIT 10;
    `);

    if (allMigrations.rows.length > 0) {
      allMigrations.rows.forEach((migration: any, index: number) => {
        const status = migration.finished_at ? '✅ Applied' : '⏳ Pending';
        console.log(`${index + 1}. ${migration.migration_name} - ${status}`);
        if (migration.finished_at) {
          console.log(`   Finished: ${migration.finished_at}`);
        }
      });
    } else {
      console.log('   No migrations found in database');
    }

    await client.end();

    console.log('\n✅ Check complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error checking migration status:');
    console.error(error.message);
    await client.end();
    process.exit(1);
  }
}

checkMigrationStatus().catch(console.error);
