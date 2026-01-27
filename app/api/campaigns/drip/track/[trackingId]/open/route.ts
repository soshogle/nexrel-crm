import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ trackingId: string }>;
};

// GET /api/campaigns/drip/track/[trackingId]/open - Track email open
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { trackingId } = await context.params;

    // Find message
    const message = await prisma.emailDripMessage.findUnique({
      where: { trackingId },
      include: {
        enrollment: true,
        sequence: true,
      },
    });

    if (message) {
      const now = new Date();
      const updateData: any = {
        openCount: { increment: 1 },
        openedAt: now,
      };

      // Set first opened timestamp if not already set
      if (!message.firstOpenedAt) {
        updateData.firstOpenedAt = now;
      }

      // Update message if status allows
      if (['SENT', 'DELIVERED', 'OPENED'].includes(message.status)) {
        updateData.status = 'OPENED';
      }

      // Update message
      await prisma.emailDripMessage.update({
        where: { id: message.id },
        data: updateData,
      });

      // Update enrollment
      await prisma.emailDripEnrollment.update({
        where: { id: message.enrollmentId },
        data: {
          totalOpened: { increment: 1 },
          lastEngagedAt: now,
        },
      });

      // Update sequence stats
      await prisma.emailDripSequence.update({
        where: { id: message.sequenceId },
        data: {
          totalOpened: { increment: 1 },
        },
      });
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: unknown) {
    console.error('Error tracking email open:', error);
    
    // Still return pixel even on error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
      },
    });
  }
}
