import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processDripEmails } from '@/lib/email-drip-processor';

/**
 * POST /api/campaigns/drip/process - Process scheduled drip emails
 * This endpoint should be called by a cron job every 5-10 minutes
 * For security, you can add an API key check here
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Check for cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If CRON_SECRET is set, require it. Otherwise allow any authenticated user to trigger manually.
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[Drip API] Starting email processing...');
    await processDripEmails();

    return NextResponse.json({
      success: true,
      message: 'Email processing completed',
    });
  } catch (error: unknown) {
    console.error('[Drip API] Error processing emails:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process emails',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow manual triggering via GET for testing
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Drip API] Manual trigger by user:', session.user.id);
    await processDripEmails();

    return NextResponse.json({
      success: true,
      message: 'Email processing completed',
    });
  } catch (error: unknown) {
    console.error('[Drip API] Error processing emails:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process emails',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
