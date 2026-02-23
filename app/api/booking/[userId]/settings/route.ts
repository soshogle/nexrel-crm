import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/booking/[userId]/settings - Get public booking settings
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const [settings, user] = await Promise.all([
      prisma.bookingSettings.findUnique({
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
      }),
      prisma.user.findUnique({
        where: { id: params.userId },
        select: { industry: true },
      }),
    ]);

    if (!settings) {
      return apiErrors.notFound('Booking settings not found');
    }

    return NextResponse.json({
      settings,
      industry: user?.industry || null,
    });
  } catch (error: any) {
    console.error('Error fetching public booking settings:', error);
    return apiErrors.internal(error.message || 'Failed to fetch booking settings');
  }
}
