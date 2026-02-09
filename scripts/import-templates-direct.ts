#!/usr/bin/env tsx
/**
 * Import Website Templates Directly via SQL
 * Reads TEMPLATE_IMPORT_SQL.sql and executes it locally
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Importing website templates directly via SQL...\n');

  const sqlFile = join(process.cwd(), 'TEMPLATE_IMPORT_SQL.sql');

  console.log(`📄 Reading SQL file: ${sqlFile}`);

  try {
    const sql = readFileSync(sqlFile, 'utf-8');
    console.log('✅ SQL file loaded\n');

    // Split SQL into individual statements
    // Handle multi-line INSERT statements properly
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s.length > 10);

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
        // Some errors are expected (e.g., template already exists)
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('unique constraint') ||
          error.message?.includes('violates unique constraint')
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}\n`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`   SQL preview: ${statement.substring(0, 150)}...\n`);
          // Continue with next statement
        }
      }
    }

    console.log('✅ Template import completed!\n');

    // Verify templates were imported
    const templates = await prisma.websiteTemplate.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        isDefault: true,
      },
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    console.log(`📊 Total templates in database: ${templates.length}\n`);
    
    if (templates.length > 0) {
      console.log('✅ Imported Templates:');
      templates.forEach(t => {
        console.log(`   - ${t.name} (${t.type})${t.isDefault ? ' [DEFAULT]' : ''}`);
      });
    }

    console.log('\n🎉 Template import process completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Templates are now available in the database');
    console.log('   2. Users can select them when creating websites');
    console.log('   3. Test by creating a new website at /dashboard/websites/new\n');
  } catch (error: any) {
    console.error('❌ Template import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
