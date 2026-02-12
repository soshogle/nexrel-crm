
/**
 * Message Synchronization API Endpoint
 * Manually trigger message sync for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MessageSyncOrchestrator } from '@/lib/messaging-sync/sync-orchestrator';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const result = await MessageSyncOrchestrator.syncUserMessages(user.id);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error in sync API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
