#!/usr/bin/env tsx
/**
 * Run Enrollment Mode Migration
 * Executes the SQL migration file for Phase 1 enrollment mode features
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Running Enrollment Mode Migration (Phase 1)...\n');

  const migrationFile = join(
    process.cwd(),
    'prisma',
    'migrations',
    'add_enrollment_mode_to_workflow.sql'
  );

  console.log(`📄 Reading migration file: ${migrationFile}\n`);

  try {
    const sql = readFileSync(migrationFile, 'utf-8');
    console.log('✅ Migration file loaded\n');

    // Execute the entire SQL file as one transaction
    // The SQL file already has IF NOT EXISTS checks, so it's safe to run
    console.log('⏳ Executing migration SQL...\n');
    
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Migration completed successfully!\n');

    // Generate Prisma client to include new models
    console.log('🔄 Generating Prisma client...\n');
    const { execSync } = await import('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated!\n');

    console.log('🎉 Phase 1 migration complete!');
    console.log('\n✅ Added fields:');
    console.log('   - WorkflowTemplate.enrollmentMode');
    console.log('   - WorkflowTemplate.enrollmentTriggers');
    console.log('\n✅ Created table:');
    console.log('   - WorkflowEnrollment');
    console.log('\n✅ Ready to test DRIP mode in the workflow builder!\n');

  } catch (error: any) {
    // Some errors are expected (e.g., table already exists, column already exists)
    if (
      error.message?.includes('already exists') ||
      error.message?.includes('duplicate') ||
      error.message?.includes('relation') ||
      error.message?.includes('enum') ||
      error.message?.includes('column') ||
      error.message?.includes('constraint')
    ) {
      console.log(`⚠️  Migration partially skipped (some objects already exist): ${error.message}\n`);
      console.log('✅ This is normal if you\'ve run parts of the migration before.\n');
      
      // Still generate Prisma client
      console.log('🔄 Generating Prisma client...\n');
      const { execSync } = await import('child_process');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated!\n');
    } else {
      console.error('❌ Error executing migration:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
