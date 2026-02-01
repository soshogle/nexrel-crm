
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

// GET /api/reservations/availability - Check available time slots

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const partySize = parseInt(searchParams.get('partySize') || '2');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get reservation settings
    const settings = await db.reservationSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings || !settings.acceptReservations) {
      return NextResponse.json({
        availableSlots: [],
        message: 'Reservations are not currently accepted',
      });
    }

    // Get operating hours for the given date
    const dayOfWeek = new Date(date).getDay();
    const operatingHours: any = settings.operatingHours || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const hours = operatingHours[dayName] || [];

    if (hours.length === 0) {
      return NextResponse.json({
        availableSlots: [],
        message: 'Restaurant is closed on this day',
      });
    }

    // Get all tables that can accommodate the party size
    const tables = await db.restaurantTable.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        capacity: {
          gte: partySize,
        },
      },
    });

    if (tables.length === 0) {
      return NextResponse.json({
        availableSlots: [],
        message: 'No tables available for this party size',
      });
    }

    // Get all existing reservations for the given date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const existingReservations = await db.reservation.findMany({
      where: {
        userId: session.user.id,
        reservationDate: {
          gte: startDate,
          lt: endDate,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'SEATED'],
        },
      },
      select: {
        reservationTime: true,
        partySize: true,
        duration: true,
        tableId: true,
      },
    });

    // Generate time slots based on settings
    const slotDuration = settings.slotDuration || 30; // minutes
    const availableSlots: Array<{ time: string; tablesAvailable: number }> = [];

    for (const period of hours) {
      const [startHour, startMinute] = period.start.split(':').map(Number);
      const [endHour, endMinute] = period.end.split(':').map(Number);

      let currentTime = startHour * 60 + startMinute; // Convert to minutes
      const endTime = endHour * 60 + endMinute;

      while (currentTime + slotDuration <= endTime) {
        const hour = Math.floor(currentTime / 60);
        const minute = currentTime % 60;
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Count how many tables are available at this time
        const occupiedTables = new Set(
          existingReservations
            .filter((res) => {
              const resTime = res.reservationTime;
              const [resHour, resMinute] = resTime.split(':').map(Number);
              const resMinutes = resHour * 60 + resMinute;
              const resEnd = resMinutes + (res.duration || 120);

              return currentTime >= resMinutes && currentTime < resEnd;
            })
            .map((res) => res.tableId)
            .filter(Boolean)
        );

        const tablesAvailable = tables.length - occupiedTables.size;

        if (tablesAvailable > 0) {
          availableSlots.push({
            time: timeSlot,
            tablesAvailable,
          });
        }

        currentTime += slotDuration;
      }
    }

    return NextResponse.json({
      availableSlots,
      date,
      partySize,
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
