
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { purchasePhoneNumber } from '@/lib/twilio-phone-numbers';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phoneNumber, friendlyName, voiceUrl, smsUrl } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get base URL for webhooks - CRITICAL for SMS to work!
    const baseUrl = process.env.NEXTAUTH_URL || 'https://soshogleagents.com';
    
    console.log('🔧 Configuring webhooks for:', phoneNumber);
    console.log('   Voice URL:', `${baseUrl}/api/twilio/voice-callback`);
    console.log('   SMS URL:', `${baseUrl}/api/twilio/sms-webhook`);

    const result = await purchasePhoneNumber(session.user.id, phoneNumber, {
      friendlyName: friendlyName || 'Soshogle CRM Number',
      voiceUrl: voiceUrl || `${baseUrl}/api/twilio/voice-callback`,
      smsUrl: smsUrl || `${baseUrl}/api/twilio/sms-webhook`
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // AUTOMATIC SYNC: Import the purchased number to ElevenLabs immediately
    console.log('🔄 Auto-syncing purchased number to ElevenLabs:', result.phoneNumber);
    
    try {
      const { elevenLabsProvisioning } = await import('@/lib/elevenlabs-provisioning');
      
      // Check if ElevenLabs plan supports phone numbers
      const subscriptionCheck = await elevenLabsProvisioning.checkSubscription(session.user.id);
      
      if (subscriptionCheck.canUsePhoneNumbers) {
        // Import the number to ElevenLabs
        const importResult = await elevenLabsProvisioning.importPhoneNumber(
          result.phoneNumber!,
          '', // No agent assignment yet
          session.user.id
        );
        
        if (importResult.success) {
          console.log('✅ Auto-sync successful: Phone number imported to ElevenLabs');
        } else {
          console.warn('⚠️  Auto-sync warning:', importResult.error);
          // Don't fail the purchase if import fails - user can manually sync later
        }
      } else {
        console.warn('⚠️  Auto-sync skipped: ElevenLabs plan does not support phone numbers');
        console.warn('   Please upgrade to Starter plan or higher to use phone numbers with voice agents');
      }
    } catch (syncError: any) {
      console.error('⚠️  Auto-sync error (non-fatal):', syncError.message);
      // Don't fail the purchase if sync fails - user can manually sync later
    }

    return NextResponse.json({
      success: true,
      phoneNumber: result.phoneNumber,
      message: 'Phone number purchased successfully!'
    });

  } catch (error) {
    console.error('Error in purchase phone number API:', error);
    return NextResponse.json(
      { error: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}
