
/**
 * Global Calendar Sync API
 * Sync all calendar connections for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CalendarService } from '@/lib/calendar';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
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

    const result = await CalendarService.syncFromCalendar(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing calendars:', error);
    return apiErrors.internal('Failed to sync calendars');
  }
}
