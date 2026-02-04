/**
 * Verify Integration Configuration
 * Checks if SendGrid, Twilio, and ElevenLabs are properly configured
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface VerificationResult {
  service: string;
  configured: boolean;
  details: string[];
  errors: string[];
}

const results: VerificationResult[] = [];

/**
 * Verify SendGrid Configuration
 */
function verifySendGrid(): VerificationResult {
  const result: VerificationResult = {
    service: 'SendGrid',
    configured: false,
    details: [],
    errors: [],
  };

  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    result.errors.push('SENDGRID_API_KEY not found in environment variables');
    result.details.push('❌ API Key: NOT SET');
  } else {
    result.configured = true;
    result.details.push(`✅ API Key: SET (${apiKey.substring(0, 10)}...)`);
    result.details.push(`   Key Length: ${apiKey.length} characters`);
    
    // Check if it looks like a valid SendGrid key
    if (apiKey.startsWith('SG.')) {
      result.details.push('   Format: Valid SendGrid API key format');
    } else {
      result.errors.push('API key does not start with "SG." - may be invalid');
    }
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || 'michael@soshogleagents.com';
  result.details.push(`   From Email: ${fromEmail}`);

  return result;
}

/**
 * Verify Twilio Configuration
 */
function verifyTwilio(): VerificationResult {
  const result: VerificationResult = {
    service: 'Twilio',
    configured: false,
    details: [],
    errors: [],
  };

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid) {
    result.errors.push('TWILIO_ACCOUNT_SID not found in environment variables');
    result.details.push('❌ Account SID: NOT SET');
  } else {
    result.details.push(`✅ Account SID: SET (${accountSid.substring(0, 10)}...)`);
    if (accountSid.startsWith('AC')) {
      result.details.push('   Format: Valid Twilio Account SID format');
    } else {
      result.errors.push('Account SID does not start with "AC" - may be invalid');
    }
  }

  if (!authToken) {
    result.errors.push('TWILIO_AUTH_TOKEN not found in environment variables');
    result.details.push('❌ Auth Token: NOT SET');
  } else {
    result.details.push(`✅ Auth Token: SET (${authToken.substring(0, 10)}...)`);
    result.details.push(`   Token Length: ${authToken.length} characters`);
  }

  if (!phoneNumber) {
    result.errors.push('TWILIO_PHONE_NUMBER not found in environment variables');
    result.details.push('❌ Phone Number: NOT SET');
  } else {
    result.details.push(`✅ Phone Number: ${phoneNumber}`);
    if (phoneNumber.startsWith('+')) {
      result.details.push('   Format: Valid E.164 format');
    } else {
      result.errors.push('Phone number should start with "+" (E.164 format)');
    }
  }

  if (accountSid && authToken && phoneNumber) {
    result.configured = true;
  }

  return result;
}

/**
 * Verify ElevenLabs Configuration
 */
function verifyElevenLabs(): VerificationResult {
  const result: VerificationResult = {
    service: 'ElevenLabs',
    configured: false,
    details: [],
    errors: [],
  };

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    result.errors.push('ELEVENLABS_API_KEY not found in environment variables');
    result.details.push('❌ API Key: NOT SET');
  } else {
    result.configured = true;
    result.details.push(`✅ API Key: SET (${apiKey.substring(0, 10)}...)`);
    result.details.push(`   Key Length: ${apiKey.length} characters`);
    
    // Check if it looks like a valid ElevenLabs key
    if (apiKey.startsWith('sk_')) {
      result.details.push('   Format: Valid ElevenLabs API key format');
    } else {
      result.errors.push('API key does not start with "sk_" - may be invalid');
    }
  }

  return result;
}

/**
 * Main verification function
 */
async function verifyAll() {
  console.log('\n🔍 Verifying Integration Configuration\n');
  console.log('=' .repeat(60));

  // Verify each service
  results.push(verifySendGrid());
  results.push(verifyTwilio());
  results.push(verifyElevenLabs());

  // Print results
  for (const result of results) {
    console.log(`\n📦 ${result.service}`);
    console.log('-'.repeat(60));
    
    if (result.configured) {
      console.log('✅ Status: CONFIGURED');
    } else {
      console.log('❌ Status: NOT CONFIGURED');
    }

    console.log('\nDetails:');
    result.details.forEach(detail => console.log(`   ${detail}`));

    if (result.errors.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.errors.forEach(error => console.log(`   • ${error}`));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary\n');
  
  const allConfigured = results.every(r => r.configured);
  const configuredCount = results.filter(r => r.configured).length;

  console.log(`Configured: ${configuredCount}/${results.length} services`);

  if (allConfigured) {
    console.log('\n✅ All integrations are properly configured!');
    console.log('   Your workflow automation system is ready to use.');
  } else {
    console.log('\n⚠️  Some integrations are missing configuration.');
    console.log('\nTo configure missing services:');
    console.log('   1. Add the required environment variables to .env.local');
    console.log('   2. Or set them in your Vercel project settings (for production)');
    console.log('\nRequired variables:');
    
    if (!results.find(r => r.service === 'SendGrid')?.configured) {
      console.log('   • SENDGRID_API_KEY');
    }
    if (!results.find(r => r.service === 'Twilio')?.configured) {
      console.log('   • TWILIO_ACCOUNT_SID');
      console.log('   • TWILIO_AUTH_TOKEN');
      console.log('   • TWILIO_PHONE_NUMBER');
    }
    if (!results.find(r => r.service === 'ElevenLabs')?.configured) {
      console.log('   • ELEVENLABS_API_KEY');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Run verification
verifyAll().catch(console.error);
