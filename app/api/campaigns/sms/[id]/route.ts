
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const campaign = await prisma.smsCampaign.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        recipients: {
          include: {
            lead: {
              select: { id: true, businessName: true, phone: true },
            },
            deal: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    console.error('Error fetching campaign:', error);
    return apiErrors.internal('Failed to fetch campaign');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { name, message, fromNumber, scheduledFor, status } = body;

    const campaign = await prisma.smsCampaign.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        name,
        message,
        fromNumber,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status,
      },
    });

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    console.error('Error updating campaign:', error);
    return apiErrors.internal('Failed to update campaign');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    await prisma.smsCampaign.delete({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting campaign:', error);
    return apiErrors.internal('Failed to delete campaign');
  }
}
