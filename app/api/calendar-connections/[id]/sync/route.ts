
/**
 * Calendar Connection Sync API
 * Trigger sync for a specific calendar connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CalendarService } from '@/lib/calendar';


export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const provider = await CalendarService.getProviderForConnection(connection.id);

    if (!provider) {
      return NextResponse.json(
        { error: 'Could not create calendar provider' },
        { status: 500 }
      );
    }

    const result = await provider.syncEvents(connection.lastSyncAt || undefined);

    if (result.success) {
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'SYNCED',
        },
      });
    } else {
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          syncStatus: 'FAILED',
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing calendar connection:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar connection' },
      { status: 500 }
    );
  }
}
