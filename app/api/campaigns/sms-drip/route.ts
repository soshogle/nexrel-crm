import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
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
    return apiErrors.internal('Failed to fetch SMS drip campaigns');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
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
    return apiErrors.internal('Failed to create SMS drip campaign');
  }
}
