import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/campaigns/drip - List all drip campaigns
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.emailDripCampaign.findMany({
      where: { userId: session.user.id },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
          select: {
            id: true,
            sequenceOrder: true,
            name: true,
            subject: true,
            delayDays: true,
            delayHours: true,
            totalSent: true,
            totalOpened: true,
            totalClicked: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            sequences: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: unknown) {
    console.error('Error fetching drip campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns/drip - Create new drip campaign
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      triggerType = 'MANUAL',
      triggerConfig,
      fromName,
      fromEmail,
      replyTo,
      enableAbTesting = false,
      abTestConfig,
      tags,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = await prisma.emailDripCampaign.create({
      data: {
        userId: session.user.id,
        name,
        description,
        triggerType,
        triggerConfig,
        fromName,
        fromEmail,
        replyTo,
        enableAbTesting,
        abTestConfig,
        tags,
        status: 'DRAFT',
      },
      include: {
        sequences: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating drip campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
