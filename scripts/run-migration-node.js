#!/usr/bin/env node

/**
 * Run Prisma Migration with proper environment variable loading
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  }
  
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.log('⚠️  .env.local not found, using system environment variables');
}

// Check DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment!');
  console.error('Please set DATABASE_URL in .env.local or .env');
  process.exit(1);
}

// Convert pooler URL to direct connection for migrations (Neon requirement)
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl.includes('-pooler.')) {
  console.log('🔄 Converting pooler connection to direct connection for migrations...');
  databaseUrl = databaseUrl.replace('-pooler.', '.');
}

// Use sslmode=prefer for migrations (more lenient SSL handling)
if (databaseUrl.includes('sslmode=require')) {
  console.log('🔄 Changing sslmode from require to prefer for migration compatibility...');
  databaseUrl = databaseUrl.replace('sslmode=require', 'sslmode=prefer');
} else if (!databaseUrl.includes('sslmode=')) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=prefer';
}

process.env.DATABASE_URL = databaseUrl;

console.log(`✅ DATABASE_URL found: ${databaseUrl.substring(0, 30)}...`);
console.log('');

// Run migration
console.log('🚀 Running Prisma migration...');
console.log('');

try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..'),
  });
  
  console.log('');
  console.log('✅ Migration completed successfully!');
  console.log('');
  
  // Generate Prisma Client
  console.log('🔧 Generating Prisma Client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..'),
  });
  
  console.log('');
  console.log('✅ Prisma Client generated!');
  console.log('');
  console.log('🎉 Migration and setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Test VNA configurations via Admin Dashboard');
  console.log('3. Create routing rules');
  console.log('4. Test workflow actions');
  
} catch (error) {
  console.error('');
  console.error('❌ Migration failed!');
  console.error(error.message);
  process.exit(1);
}
