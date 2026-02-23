
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchAvailableNumbers } from '@/lib/twilio-phone-numbers';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const {
      countryCode,
      areaCode,
      contains,
      smsEnabled,
      voiceEnabled,
      limit
    } = body;

    const result = await searchAvailableNumbers(session.user.id, {
      countryCode,
      areaCode,
      contains,
      smsEnabled,
      voiceEnabled,
      limit
    });

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({
      success: true,
      numbers: result.numbers,
      twilioAccountId: result.twilioAccountId,
    });

  } catch (error) {
    console.error('Error in search phone numbers API:', error);
    return apiErrors.internal('Failed to search phone numbers');
  }
}
