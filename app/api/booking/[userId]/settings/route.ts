import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/booking/[userId]/settings - Get public booking settings
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const settings = await prisma.bookingSettings.findUnique({
      where: { userId: params.userId },
      select: {
        businessName: true,
        businessDescription: true,
        slotDuration: true,
        advanceBookingDays: true,
        allowedMeetingTypes: true,
        customMessage: true,
        brandColor: true,
      },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Booking settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching public booking settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch booking settings' },
      { status: 500 }
    );
  }
}
