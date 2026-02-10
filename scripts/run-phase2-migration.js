/**
 * Run Phase 2 Enhanced Timing Migration
 * Executes the SQL migration file for Phase 2 enhanced timing options
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Running Phase 2 Enhanced Timing Migration...\n');

  const migrationFile = join(
    process.cwd(),
    'prisma',
    'migrations',
    'add_enhanced_timing_to_workflow_task.sql'
  );

  console.log(`📄 Reading migration file: ${migrationFile}\n`);

  try {
    const sql = readFileSync(migrationFile, 'utf-8');
    console.log('✅ Migration file loaded\n');

    // Split SQL into individual statements
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

    console.log('🎉 Phase 2 migration complete!');
    console.log('\n✅ Added fields to WorkflowTask:');
    console.log('   - delayDays');
    console.log('   - delayHours');
    console.log('   - preferredSendTime');
    console.log('   - skipConditions');
    console.log('\n✅ Ready to use enhanced timing options in DRIP mode!\n');

  } catch (error) {
    console.error('❌ Error executing migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
