
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOwnedPhoneNumbers } from '@/lib/twilio-phone-numbers';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const includePlatformPool = searchParams.get('platformPool') === 'true';


    const result = await getOwnedPhoneNumbers(session.user.id, { includePlatformPool });

    if (!result.success) {
      console.error('❌ Failed to get phone numbers:', result.error);
      return NextResponse.json(
        {
          error: result.error,
          success: false,
          numbers: []
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      numbers: result.numbers || []
    });

  } catch (error: any) {
    console.error('❌ Error in get owned phone numbers API:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch phone numbers',
        details: error.message,
        success: false,
        numbers: []
      },
      { status: 500 }
    );
  }
}
