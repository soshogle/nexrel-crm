#!/usr/bin/env tsx
/**
 * Test Vercel Blob Storage Setup
 * Verifies that Vercel Blob is configured correctly
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });
// Also try .env as fallback
config({ path: resolve(process.cwd(), '.env') });

import { put, list } from '@vercel/blob';

async function testVercelBlob() {
  console.log('🧪 Testing Vercel Blob Storage Setup...\n');

  // Check environment variables
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const provider = process.env.IMAGE_STORAGE_PROVIDER;

  console.log('📋 Configuration:');
  console.log(`   IMAGE_STORAGE_PROVIDER: ${provider || 'not set'}`);
  console.log(`   BLOB_READ_WRITE_TOKEN: ${token ? '✅ Set' : '❌ Not set'}\n`);

  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN is not set!');
    console.error('\n📝 To fix this:');
    console.error('   1. Get your token from Vercel Dashboard');
    console.error('   2. Add it to .env.local:');
    console.error('      BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx');
    console.error('   3. See VERCEL_BLOB_SETUP.md for detailed instructions\n');
    process.exit(1);
  }

  if (provider !== 'vercel') {
    console.warn('⚠️  IMAGE_STORAGE_PROVIDER is not set to "vercel"');
    console.warn(`   Current value: ${provider || 'not set'}`);
    console.warn('   Set IMAGE_STORAGE_PROVIDER=vercel to use Vercel Blob\n');
  }

  try {
    // Test 1: Upload a test file
    console.log('📤 Test 1: Uploading test file...');
    const testContent = Buffer.from('This is a test file for Vercel Blob');
    const blob = await put('test/vercel-blob-test.txt', testContent, {
      access: 'public',
      contentType: 'text/plain',
      addRandomSuffix: false,
    });
    console.log(`   ✅ Upload successful!`);
    console.log(`   URL: ${blob.url}`);
    console.log(`   Path: ${blob.pathname}\n`);

    // Test 2: List files
    console.log('📋 Test 2: Listing files...');
    const blobs = await list({ prefix: 'test/' });
    console.log(`   ✅ Found ${blobs.blobs.length} file(s) in test/`);
    blobs.blobs.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.pathname} (${(b.size / 1024).toFixed(2)} KB)`);
    });
    console.log('');

    console.log('✅ All tests passed! Vercel Blob is configured correctly.\n');
    console.log('📝 Next steps:');
    console.log('   1. Set ENABLE_IMAGE_DOWNLOAD=true in your .env');
    console.log('   2. Rebuild a website to test image storage');
    console.log('   3. Check Vercel Dashboard → Storage → Blob to see stored images\n');

  } catch (error: any) {
    console.error('❌ Test failed!');
    console.error(`   Error: ${error.message}\n`);

    if (error.message.includes('token') || error.message.includes('unauthorized')) {
      console.error('💡 This usually means:');
      console.error('   - Your BLOB_READ_WRITE_TOKEN is invalid');
      console.error('   - The token has expired');
      console.error('   - The token doesn\'t have the right permissions\n');
      console.error('🔧 To fix:');
      console.error('   1. Go to Vercel Dashboard → Storage → Blob');
      console.error('   2. Regenerate your token');
      console.error('   3. Update BLOB_READ_WRITE_TOKEN in your .env file\n');
    }

    process.exit(1);
  }
}

testVercelBlob()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
