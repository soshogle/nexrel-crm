
/**
 * Sync Twilio Phone Numbers
 * 
 * This endpoint fetches ALL phone numbers from Twilio and:
 * 1. Saves them to local database (purchasedPhoneNumber table)
 * 2. Imports them to ElevenLabs for voice agent use
 * 
 * Use this to fix the issue where Twilio numbers exist but aren't in your app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    // Validate credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error('❌ Twilio credentials missing');
      return NextResponse.json(
        { 
          error: 'Twilio credentials not configured',
          details: 'Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables'
        },
        { status: 500 });
    }

    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ElevenLabs API key missing');
      return NextResponse.json(
        { 
          error: 'ElevenLabs API key not configured',
          details: 'Please set ELEVENLABS_API_KEY in environment variables'
        },
        { status: 500 }
      );
    }

    console.log('🔄 Starting phone number sync for user:', user.id);

    // STEP 0: Check ElevenLabs subscription plan
    console.log('📊 Checking ElevenLabs subscription plan...');
    const { elevenLabsProvisioning } = await import('@/lib/elevenlabs-provisioning');
    const subscriptionCheck = await elevenLabsProvisioning.checkSubscription(user.id);
    
    if (!subscriptionCheck.canUsePhoneNumbers) {
      console.error('❌ ElevenLabs plan does not support phone numbers');
      return NextResponse.json(
        { 
          error: 'ElevenLabs plan upgrade required',
          details: subscriptionCheck.error || 'Your ElevenLabs plan does not support phone number imports.',
          tier: subscriptionCheck.tier,
          upgradeRequired: true,
          upgradeUrl: 'https://elevenlabs.io/pricing',
          recommendation: 'Please upgrade to the Starter plan ($10/month) or higher to use phone numbers with voice agents.'
        },
        { status: 402 } // 402 Payment Required
      );
    }

    console.log(`✅ ElevenLabs plan "${subscriptionCheck.tier}" supports phone numbers`);

    // STEP 1: Fetch all phone numbers from Twilio
    console.log('📞 Fetching phone numbers from Twilio...');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
      }
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('❌ Twilio fetch failed:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch Twilio phone numbers',
          details: `Twilio API returned status ${twilioResponse.status}. Please check your credentials.`,
          twilioError: error
        },
        { status: 500 }
      );
    }

    const twilioData = await twilioResponse.json();
    const twilioNumbers = twilioData.incoming_phone_numbers || [];
    
    console.log(`✅ Found ${twilioNumbers.length} phone numbers in Twilio`);

    // If no numbers found, return early with helpful message
    if (twilioNumbers.length === 0) {
      console.warn('⚠️ No phone numbers found in Twilio account');
      return NextResponse.json({
        success: true,
        message: 'No phone numbers found in your Twilio account',
        totalFound: 0,
        syncedToDatabase: 0,
        importedToElevenLabs: 0,
        errors: [],
        numbers: [],
        suggestion: 'Purchase a phone number first from the Voice Agents page'
      });
    }

    const results = {
      totalFound: twilioNumbers.length,
      syncedToDatabase: 0,
      importedToElevenLabs: 0,
      errors: [] as string[],
      numbers: [] as any[]
    };

    // STEP 2 & 3: For each number, sync to database and import to ElevenLabs
    for (const twilioNumber of twilioNumbers) {
      const phoneNumber = twilioNumber.phone_number;
      const friendlyName = twilioNumber.friendly_name || phoneNumber;
      
      console.log(`\n📞 Processing: ${phoneNumber}`);

      try {
        // STEP 2: Save to database (skip if already exists)
        const existingInDb = await prisma.purchasedPhoneNumber.findFirst({
          where: {
            phoneNumber: phoneNumber,
            userId: user.id
          }
        });

        if (!existingInDb) {
          await prisma.purchasedPhoneNumber.create({
            data: {
              userId: user.id,
              phoneNumber: phoneNumber,
              friendlyName: friendlyName,
              country: twilioNumber.iso_country || 'US',
              capabilities: {
                voice: twilioNumber.capabilities?.voice || false,
                sms: twilioNumber.capabilities?.sms || false,
                mms: twilioNumber.capabilities?.mms || false
              },
              twilioSid: twilioNumber.sid,
              status: 'active'
            }
          });
          console.log(`  ✅ Synced to database`);
          results.syncedToDatabase++;
        } else {
          console.log(`  ℹ️  Already in database`);
        }

        // STEP 3: Import to ElevenLabs using provisioning service
        console.log(`  📤 Importing to ElevenLabs...`);
        
        const importResult = await elevenLabsProvisioning.importPhoneNumber(
          phoneNumber,
          '', // No agent assignment yet
          user.id
        );

        if (importResult.success) {
          console.log(`  ✅ Imported to ElevenLabs (Phone ID: ${importResult.phoneNumberId})`);
          results.importedToElevenLabs++;
        } else {
          console.error(`  ⚠️  ElevenLabs import failed:`, importResult.error);
          results.errors.push(`${phoneNumber}: ${importResult.error}`);
          
          // Add detailed error info if available
          if (importResult.errorDetails) {
            console.error(`     Details:`, importResult.errorDetails);
          }
        }

        results.numbers.push({
          phoneNumber,
          friendlyName,
          syncedToDb: true,
          importedToElevenLabs: importResult.success
        });

      } catch (error: any) {
        console.error(`  ❌ Error processing ${phoneNumber}:`, error.message);
        results.errors.push(`${phoneNumber}: ${error.message}`);
      }
    }

    console.log('\n✅ Sync complete:', results);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.syncedToDatabase} numbers to database, imported ${results.importedToElevenLabs} to ElevenLabs`,
      ...results
    });

  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { 
        error: 'Phone number sync failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
