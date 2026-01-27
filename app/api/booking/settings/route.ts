import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/booking/settings - Get user's booking settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create booking settings
    let settings = await prisma.bookingSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.bookingSettings.create({
        data: {
          userId: session.user.id,
          businessName: session.user.name || 'My Business',
          bookingUrl: `${session.user.id}`,
          availabilitySchedule: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '17:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' },
          },
          slotDuration: 30,
          bufferTime: 15,
          advanceBookingDays: 30,
          minNoticeHours: 24,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching booking settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch booking settings' },
      { status: 500 }
    );
  }
}

// PUT /api/booking/settings - Update booking settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessName,
      businessDescription,
      availabilitySchedule,
      slotDuration,
      bufferTime,
      advanceBookingDays,
      minNoticeHours,
      allowedMeetingTypes,
      requireApproval,
      customMessage,
      brandColor,
    } = body;

    const settings = await prisma.bookingSettings.upsert({
      where: { userId: session.user.id },
      update: {
        businessName,
        businessDescription,
        availabilitySchedule,
        slotDuration,
        bufferTime,
        advanceBookingDays,
        minNoticeHours,
        allowedMeetingTypes,
        requireApproval,
        customMessage,
        brandColor,
      },
      create: {
        userId: session.user.id,
        businessName: businessName || session.user.name || 'My Business',
        businessDescription,
        bookingUrl: `${session.user.id}`,
        availabilitySchedule,
        slotDuration: slotDuration || 30,
        bufferTime: bufferTime || 15,
        advanceBookingDays: advanceBookingDays || 30,
        minNoticeHours: minNoticeHours || 24,
        allowedMeetingTypes,
        requireApproval,
        customMessage,
        brandColor,
      },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error updating booking settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update booking settings' },
      { status: 500 }
    );
  }
}
