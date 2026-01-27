
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

/**
 * Validate ElevenLabs and Twilio Setup
 * 
 * This endpoint checks if all required credentials are configured and valid:
 * 1. ElevenLabs API key
 * 2. ElevenLabs subscription plan
 * 3. Twilio credentials
 * 4. Phone number availability
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔍 [Validation] Starting ElevenLabs + Twilio setup validation...');

    const results: any = {
      success: true,
      checks: [],
      warnings: [],
      errors: [],
    };

    // CHECK 1: ElevenLabs API Key
    console.log('   Check 1: ElevenLabs API Key');
    if (!ELEVENLABS_API_KEY) {
      results.success = false;
      results.errors.push('ElevenLabs API key not configured in environment variables');
      results.checks.push({
        name: 'ElevenLabs API Key',
        status: 'failed',
        message: 'ELEVENLABS_API_KEY not found in environment'
      });
    } else {
      results.checks.push({
        name: 'ElevenLabs API Key',
        status: 'passed',
        message: 'API key is configured'
      });
      console.log('      ✅ API key found');
    }

    // CHECK 2: ElevenLabs API Key Validity & Subscription
    if (ELEVENLABS_API_KEY) {
      console.log('   Check 2: ElevenLabs API Validity & Subscription');
      try {
        const subResponse = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
          headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        });

        if (!subResponse.ok) {
          results.success = false;
          const errorText = await subResponse.text();
          results.errors.push(`Invalid ElevenLabs API key: ${errorText}`);
          results.checks.push({
            name: 'ElevenLabs API Validity',
            status: 'failed',
            message: `API returned status ${subResponse.status}: ${errorText}`
          });
          console.log('      ❌ API key invalid');
        } else {
          const subscription = await subResponse.json();
          const tier = subscription.tier || 'unknown';
          const canUsePhoneNumbers = tier.toLowerCase() !== 'free';

          results.checks.push({
            name: 'ElevenLabs API Validity',
            status: 'passed',
            message: 'API key is valid'
          });

          results.checks.push({
            name: 'ElevenLabs Subscription',
            status: canUsePhoneNumbers ? 'passed' : 'failed',
            message: `Plan: ${tier}`,
            details: {
              tier,
              characterLimit: subscription.character_limit,
              characterCount: subscription.character_count,
              canUsePhoneNumbers,
            }
          });

          if (!canUsePhoneNumbers) {
            results.success = false;
            results.errors.push(`ElevenLabs plan "${tier}" does not support phone numbers. Upgrade to Starter plan or higher.`);
            console.log('      ❌ Free plan detected - phone numbers not supported');
          } else {
            console.log(`      ✅ Plan "${tier}" supports phone numbers`);
          }
        }
      } catch (error: any) {
        results.success = false;
        results.errors.push(`Failed to validate ElevenLabs API: ${error.message}`);
        results.checks.push({
          name: 'ElevenLabs API Validity',
          status: 'failed',
          message: error.message
        });
        console.log('      ❌ Exception:', error.message);
      }
    }

    // CHECK 3: Twilio Credentials
    console.log('   Check 3: Twilio Credentials');
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      results.success = false;
      results.errors.push('Twilio credentials not configured in environment variables');
      results.checks.push({
        name: 'Twilio Credentials',
        status: 'failed',
        message: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not found'
      });
      console.log('      ❌ Twilio credentials missing');
    } else {
      results.checks.push({
        name: 'Twilio Credentials',
        status: 'passed',
        message: 'Credentials are configured'
      });
      console.log('      ✅ Twilio credentials found');
    }

    // CHECK 4: Twilio Credentials Validity & Phone Numbers
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      console.log('   Check 4: Twilio API Validity & Phone Numbers');
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
        const twilioResponse = await fetch(twilioUrl, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
          }
        });

        if (!twilioResponse.ok) {
          results.success = false;
          const errorText = await twilioResponse.text();
          results.errors.push(`Invalid Twilio credentials: ${errorText}`);
          results.checks.push({
            name: 'Twilio API Validity',
            status: 'failed',
            message: `API returned status ${twilioResponse.status}`
          });
          console.log('      ❌ Twilio credentials invalid');
        } else {
          const twilioData = await twilioResponse.json();
          const phoneCount = twilioData.incoming_phone_numbers?.length || 0;

          results.checks.push({
            name: 'Twilio API Validity',
            status: 'passed',
            message: 'Credentials are valid'
          });

          results.checks.push({
            name: 'Twilio Phone Numbers',
            status: phoneCount > 0 ? 'passed' : 'warning',
            message: `${phoneCount} phone number(s) found`,
            details: {
              phoneNumbers: twilioData.incoming_phone_numbers?.map((p: any) => p.phone_number) || []
            }
          });

          if (phoneCount === 0) {
            results.warnings.push('No phone numbers found in Twilio account. Purchase a phone number to use voice agents.');
            console.log('      ⚠️  No phone numbers found');
          } else {
            console.log(`      ✅ Found ${phoneCount} phone number(s)`);
          }
        }
      } catch (error: any) {
        results.success = false;
        results.errors.push(`Failed to validate Twilio API: ${error.message}`);
        results.checks.push({
          name: 'Twilio API Validity',
          status: 'failed',
          message: error.message
        });
        console.log('      ❌ Exception:', error.message);
      }
    }

    // CHECK 5: ElevenLabs Phone Numbers
    if (ELEVENLABS_API_KEY && results.checks.find((c: any) => c.name === 'ElevenLabs API Validity')?.status === 'passed') {
      console.log('   Check 5: ElevenLabs Phone Numbers');
      try {
        const phoneListResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/phone-numbers`, {
          headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        });

        if (phoneListResponse.ok) {
          const phoneList = await phoneListResponse.json();
          const phoneCount = phoneList.phone_numbers?.length || 0;

          results.checks.push({
            name: 'ElevenLabs Phone Numbers',
            status: phoneCount > 0 ? 'passed' : 'warning',
            message: `${phoneCount} phone number(s) imported to ElevenLabs`,
            details: {
              phoneNumbers: phoneList.phone_numbers?.map((p: any) => ({
                number: p.number || p.phone_number,
                label: p.label,
                id: p.phone_number_id || p.id
              })) || []
            }
          });

          if (phoneCount === 0) {
            results.warnings.push('No phone numbers imported to ElevenLabs. Use the "Sync Phone Numbers" button to import them.');
            console.log('      ⚠️  No phone numbers in ElevenLabs');
          } else {
            console.log(`      ✅ Found ${phoneCount} phone number(s) in ElevenLabs`);
          }
        } else {
          const errorText = await phoneListResponse.text();
          results.warnings.push(`Could not list ElevenLabs phone numbers: ${errorText}`);
          results.checks.push({
            name: 'ElevenLabs Phone Numbers',
            status: 'warning',
            message: 'Could not retrieve phone numbers'
          });
          console.log('      ⚠️  Could not list phone numbers');
        }
      } catch (error: any) {
        results.warnings.push(`Could not check ElevenLabs phone numbers: ${error.message}`);
        results.checks.push({
          name: 'ElevenLabs Phone Numbers',
          status: 'warning',
          message: error.message
        });
        console.log('      ⚠️  Exception:', error.message);
      }
    }

    console.log('✅ [Validation] Complete');
    console.log('   Success:', results.success);
    console.log('   Errors:', results.errors.length);
    console.log('   Warnings:', results.warnings.length);

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ [Validation] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Validation failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
