
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchAvailableNumbers } from '@/lib/twilio-phone-numbers';

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
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      numbers: result.numbers
    });

  } catch (error) {
    console.error('Error in search phone numbers API:', error);
    return NextResponse.json(
      { error: 'Failed to search phone numbers' },
      { status: 500 }
    );
  }
}
