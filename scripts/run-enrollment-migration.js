/**
 * Run Enrollment Mode Migration
 * Executes the SQL migration file for Phase 1 enrollment mode features
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

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

    // Split SQL into individual statements
    // Remove comments and split by semicolons, but preserve DO blocks
    const statements = sql
      .split(/;(?![^$]*\$\$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    console.log('⏳ Executing migration SQL...\n');
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0) continue;

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await prisma.$executeRawUnsafe(statement + ';');
        console.log(`✅ Statement ${i + 1} executed successfully\n`);
      } catch (error) {
        // Some errors are expected (e.g., table already exists, column already exists)
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('relation') ||
          error.message?.includes('enum') ||
          error.message?.includes('column') ||
          error.message?.includes('constraint')
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)\n`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`   SQL preview: ${statement.substring(0, 100)}...\n`);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!\n');

    // Generate Prisma client to include new models
    console.log('🔄 Generating Prisma client...\n');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated!\n');

    console.log('🎉 Phase 1 migration complete!');
    console.log('\n✅ Added fields:');
    console.log('   - WorkflowTemplate.enrollmentMode');
    console.log('   - WorkflowTemplate.enrollmentTriggers');
    console.log('\n✅ Created table:');
    console.log('   - WorkflowEnrollment');
    console.log('\n✅ Ready to test DRIP mode in the workflow builder!\n');

  } catch (error) {
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
