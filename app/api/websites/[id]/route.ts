/**
 * Website CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        builds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        websiteIntegrations: true,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (error: any) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, structure, seoData, voiceAIEnabled, voiceAIConfig } = body;

    const website = await prisma.website.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        ...(name && { name }),
        ...(structure && { structure }),
        ...(seoData && { seoData }),
        ...(voiceAIEnabled !== undefined && { voiceAIEnabled }),
        ...(voiceAIConfig && { voiceAIConfig }),
      },
    });

    return NextResponse.json({ website });
  } catch (error: any) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // TODO: Clean up resources (GitHub repo, Vercel project, etc.)
    // await resourceProvisioning.cleanupResources(...)

    await prisma.website.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Failed to delete website' },
      { status: 500 }
    );
  }
}
