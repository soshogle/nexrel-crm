import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ trackingId: string }>;
};

// GET /api/campaigns/drip/track/[trackingId]/click - Track email click

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { trackingId } = await context.params;
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

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
        clickCount: { increment: 1 },
        clickedAt: now,
      };

      // Set first clicked timestamp if not already set
      if (!message.firstClickedAt) {
        updateData.firstClickedAt = now;
      }

      // Update clicked links array
      const clickedLinks = (message.clickedLinks as string[]) || [];
      if (!clickedLinks.includes(url)) {
        clickedLinks.push(url);
        updateData.clickedLinks = clickedLinks;
      }

      // Update message status if allowed
      if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(message.status)) {
        updateData.status = 'CLICKED';
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
          totalClicked: { increment: 1 },
          lastEngagedAt: now,
        },
      });

      // Update sequence stats
      await prisma.emailDripSequence.update({
        where: { id: message.sequenceId },
        data: {
          totalClicked: { increment: 1 },
        },
      });
    }

    // Redirect to original URL
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    console.error('Error tracking email click:', error);
    
    // Try to redirect anyway
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    
    if (url) {
      return NextResponse.redirect(url);
    }
    
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
