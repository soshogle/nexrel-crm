
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOwnedPhoneNumbers } from '@/lib/twilio-phone-numbers';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📞 Fetching phone numbers for user:', session.user.id);
    
    const result = await getOwnedPhoneNumbers(session.user.id);

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

    console.log(`✅ Found ${result.numbers?.length || 0} phone numbers`);

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
