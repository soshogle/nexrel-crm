
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';
import { ReservationStatus } from '@prisma/client';

// GET /api/reservations - List reservations with filters

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
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {
      userId: session.user.id,
    };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.reservationDate = {
        gte: startDate,
        lt: endDate,
      };
    }

    if (status) {
      where.status = status as ReservationStatus;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        include: {
          table: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          activities: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
        orderBy: [
          { reservationDate: 'desc' },
          { reservationTime: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.reservation.count({ where }),
    ]);

    return NextResponse.json({
      reservations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

// POST /api/reservations - Create a new reservation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      reservationDate,
      reservationTime,
      partySize,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
      dietaryRestrictions,
      occasion,
      tableId,
      section,
      hasPreOrder,
      source = 'website',
      voiceCallId,
    } = body;

    // Validate required fields
    if (!reservationDate || !reservationTime || !partySize || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if customer exists or create new
    let customer = await db.user.findUnique({
      where: { email: customerEmail },
    });

    if (!customer) {
      // Create a new customer user
      customer = await db.user.create({
        data: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          role: 'USER',
        },
      });
    }

    // Generate confirmation code
    const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create reservation
    const reservation = await db.reservation.create({
      data: {
        userId: session.user.id,
        customerId: customer.id,
        reservationDate: new Date(reservationDate),
        reservationTime,
        partySize: parseInt(partySize),
        customerName,
        customerEmail,
        customerPhone,
        specialRequests,
        dietaryRestrictions,
        occasion,
        tableId,
        section,
        hasPreOrder: hasPreOrder || false,
        confirmationCode,
        status: 'CONFIRMED',
        source,
        voiceCallId,
        activities: {
          create: {
            type: 'CREATED',
            description: `Reservation created for ${partySize} people on ${reservationDate} at ${reservationTime}`,
            performedBy: source === 'voice-ai' ? 'system' : session.user.id,
          },
        },
      },
      include: {
        table: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        activities: true,
      },
    });

    // Schedule reminder if settings enable it
    const settings = await db.reservationSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (settings?.sendReminders) {
      const reservationDateTime = new Date(`${reservationDate}T${reservationTime}`);
      const reminderTime = new Date(reservationDateTime);
      reminderTime.setHours(reminderTime.getHours() - (settings.reminderHoursBefore || 24));

      await db.reservationReminder.create({
        data: {
          reservationId: reservation.id,
          channel: 'EMAIL',
          scheduledFor: reminderTime,
          subject: `Reminder: Your reservation at ${session.user.name || 'our restaurant'}`,
          message: `Hi ${customerName}, this is a reminder about your reservation for ${partySize} on ${reservationDate} at ${reservationTime}. Your confirmation code is ${confirmationCode}.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reservation,
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
