
/**
 * Appointment Sync API
 * Sync a specific appointment to its connected calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CalendarService } from '@/lib/calendar';

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

    const appointment = await prisma.bookingAppointment.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const result = await CalendarService.syncAppointmentToCalendar(appointment.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing appointment:', error);
    return NextResponse.json(
      { error: 'Failed to sync appointment' },
      { status: 500 }
    );
  }
}
