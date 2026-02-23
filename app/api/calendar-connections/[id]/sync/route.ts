
/**
 * Calendar Connection Sync API
 * Trigger sync for a specific calendar connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CalendarService } from '@/lib/calendar';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!connection) {
      return apiErrors.notFound('Connection not found');
    }

    const provider = await CalendarService.getProviderForConnection(connection.id);

    if (!provider) {
      return apiErrors.internal('Could not create calendar provider');
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
    return apiErrors.internal('Failed to sync calendar connection');
  }
}
