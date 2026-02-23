import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { facebookMessengerService } from '@/lib/facebook-messenger-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Sync historical Messenger conversations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    console.log(`🔄 Starting Messenger sync for user: ${session.user.id}`);

    const result = await facebookMessengerService.syncConversations(session.user.id);

    if (!result.success) {
      return apiErrors.internal(result.error || 'Sync failed');
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      message: `Successfully synced ${result.synced} messages`,
    });
  } catch (error: any) {
    console.error('❌ Error syncing Messenger:', error);
    return apiErrors.internal(error.message || 'Sync failed');
  }
}
