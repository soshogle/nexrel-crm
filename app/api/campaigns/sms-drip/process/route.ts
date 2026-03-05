import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processSmsDripMessages } from '@/lib/sms-drip-processor';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Security: Always require either valid CRON_SECRET or authenticated session
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const hasCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!hasCronAuth) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return apiErrors.unauthorized();
      }
    }

    console.log('[SMS Drip API] Starting SMS processing...');
    await processSmsDripMessages();

    return NextResponse.json({
      success: true,
      message: 'SMS drip processing completed',
    });
  } catch (error: unknown) {
    console.error('[SMS Drip API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process SMS drip messages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    console.log('[SMS Drip API] Manual trigger by user:', session.user.id);
    await processSmsDripMessages();

    return NextResponse.json({
      success: true,
      message: 'SMS drip processing completed',
    });
  } catch (error: unknown) {
    console.error('[SMS Drip API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process SMS drip messages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
