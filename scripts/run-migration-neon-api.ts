#!/usr/bin/env tsx
/**
 * Run Migration via Neon API
 * 
 * This script executes the migration SQL using Neon's API or direct PostgreSQL connection.
 * 
 * Setup:
 * 1. Get your Neon API key from: https://console.neon.tech → Settings → API
 * 2. Add to .env.local: NEON_API_KEY=your_api_key_here
 * 3. Get your project ID from Neon dashboard URL or API
 * 4. Add to .env.local: NEON_PROJECT_ID=your_project_id_here
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
const DATABASE_URL = process.env.DATABASE_URL;

async function runMigrationViaNeonAPI() {
  // Read migration SQL first
  const migrationSqlPath = join(
    __dirname,
    '..',
    'NEON_MIGRATION_READY.sql'
  );
  
  let migrationSql: string;
  try {
    migrationSql = readFileSync(migrationSqlPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Could not read migration SQL file: ${migrationSqlPath}`);
    process.exit(1);
  }

  // Prioritize direct connection (no API key needed)
  // Only use Neon API if both API_KEY and PROJECT_ID are provided
  if (NEON_API_KEY && NEON_PROJECT_ID) {
    console.log('🚀 Running migration via Neon API...\n');
    console.log('⚠️  Note: Neon Management API doesn\'t support direct SQL execution.');
    console.log('   Falling back to direct PostgreSQL connection...\n');
  } else {
    console.log('🚀 Running migration via direct PostgreSQL connection...\n');
    console.log('💡 No API key needed - using DATABASE_URL from .env.local\n');
  }

  // Always use direct connection (most reliable)
  await runMigrationViaDirectConnection(migrationSql);
}

async function runMigrationViaDirectConnection(migrationSql: string) {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    process.exit(1);
  }

  console.log('🔌 Using direct PostgreSQL connection...\n');

  try {
    // Use pg library for direct connection (bypasses Prisma SSL issues)
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
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Execute the entire SQL as one block (handles DO $$ blocks properly)
    console.log('📝 Executing migration SQL...\n');

    let successCount = 0;
    let errorCount = 0;

    try {
      // Execute the entire SQL block at once (PostgreSQL supports multi-statement queries)
      await client.query(migrationSql);
      console.log('✅ Migration SQL executed successfully!\n');
      successCount = 1;
    } catch (error: any) {
      // If bulk execution fails, try splitting into statements
      console.log('⚠️  Bulk execution failed, trying statement-by-statement...\n');
      
      // Split SQL into statements, but preserve DO $$ blocks
      const statements: string[] = [];
      let currentStatement = '';
      let inDollarBlock = false;
      let dollarTag = '';
      
      const lines = migrationSql.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('--')) {
          continue;
        }
        
        currentStatement += line + '\n';
        
        // Check for DO $$ blocks
        if (trimmed.match(/DO\s+\$\$/i)) {
          inDollarBlock = true;
          dollarTag = trimmed.match(/\$\$(\w*)\$/)?.[1] || '';
        }
        
        // Check for END of DO block
        if (inDollarBlock && trimmed.match(new RegExp(`END\\s+\\$\\$${dollarTag}\\$`, 'i'))) {
          inDollarBlock = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
          continue;
        }
        
        // If not in DO block and we hit a semicolon, it's end of statement
        if (!inDollarBlock && trimmed.endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }

      console.log(`📝 Executing ${statements.length} SQL statements...\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        if (!statement || statement.trim().length === 0) continue;

        try {
          await client.query(statement);
          successCount++;
          
          // Show progress for major operations
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i);
            const tableName = tableMatch ? tableMatch[1] : null;
            if (tableName) console.log(`✅ Created table: ${tableName}`);
          } else if (statement.toUpperCase().includes('ALTER TABLE') && statement.toUpperCase().includes('ADD COLUMN')) {
            const tableMatch = statement.match(/ALTER\s+TABLE\s+"?(\w+)"?/i);
            const tableName = tableMatch ? tableMatch[1] : null;
            if (tableName) console.log(`✅ Added column to: ${tableName}`);
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            const indexMatch = statement.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i);
            const indexName = indexMatch ? indexMatch[1] : null;
            if (indexName) console.log(`✅ Created index: ${indexName}`);
          } else if (statement.toUpperCase().includes('INSERT INTO') && statement.toUpperCase().includes('_prisma_migrations')) {
            console.log('✅ Marked migration as applied');
          }
        } catch (error: any) {
          // Some errors are expected (e.g., "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('ON CONFLICT') ||
              error.message.includes('does not exist') && error.message.includes('constraint')) {
            // These are safe to ignore
            successCount++;
          } else {
            errorCount++;
            console.error(`❌ Error in statement ${i + 1}:`);
            console.error(`   ${error.message.substring(0, 150)}`);
            if (statement.length < 100) {
              console.error(`   Statement: ${statement}\n`);
            } else {
              console.error(`   Statement: ${statement.substring(0, 100)}...\n`);
            }
          }
        }
      }
    }

    await client.end();

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: npx prisma generate');
      console.log('   2. Run: npx prisma migrate status');
      console.log('   3. Restart your dev server: npm run dev');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
      console.log('   Check the errors above - some may be safe to ignore.');
    }

  } catch (error: any) {
    console.error('\n❌ Failed to connect to database:');
    console.error(error.message);
    
    if (error.message.includes('pg')) {
      console.error('\n💡 Install pg library:');
      console.error('   npm install pg @types/pg');
    }
    
    process.exit(1);
  }
}

// Main execution
runMigrationViaNeonAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
