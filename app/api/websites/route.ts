/**
 * Websites API - List and manage websites
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websites = await prisma.website.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        buildProgress: true,
        vercelDeploymentUrl: true,
        voiceAIEnabled: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    // One website per profile: can only create new if user has no website yet
    const canCreateNew = websites.length === 0;

    return NextResponse.json({ websites, canCreateNew });
  } catch (error: any) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}
