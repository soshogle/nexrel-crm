import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const campaigns = await prisma.smsCampaign.findMany({
      where: {
        userId: user.id,
        isSequence: true,
      },
      include: {
        _count: {
          select: {
            sequences: true,
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching SMS drip campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS drip campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      status,
      triggerType,
      fromNumber,
      tags,
    } = body;

    const campaign = await prisma.smsCampaign.create({
      data: {
        userId: user.id,
        name,
        message: '', // Empty for sequence campaigns
        status: status || 'DRAFT',
        isSequence: true,
        triggerType,
        fromNumber,
        tags,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error creating SMS drip campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create SMS drip campaign' },
      { status: 500 }
    );
  }
}
