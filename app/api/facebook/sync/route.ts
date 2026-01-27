import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { facebookMessengerService } from '@/lib/facebook-messenger-service';

export const dynamic = 'force-dynamic';

/**
 * Sync historical Messenger conversations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔄 Starting Messenger sync for user: ${session.user.id}`);

    const result = await facebookMessengerService.syncConversations(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      message: `Successfully synced ${result.synced} messages`,
    });
  } catch (error: any) {
    console.error('❌ Error syncing Messenger:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
