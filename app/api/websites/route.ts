/**
 * Websites API - List and manage websites
 */

export const dynamic = 'force-dynamic';

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
        templateType: true,
        status: true,
        buildProgress: true,
        vercelDeploymentUrl: true,
        voiceAIEnabled: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        builds: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { error: true },
        },
      },
    });

    // One website per profile: can only create new if user has no website yet
    const canCreateNew = websites.length === 0;

    // Attach buildError for FAILED websites (omit builds from response)
    const websitesWithError = websites.map(({ builds, ...w }) => ({
      ...w,
      buildError: w.status === 'FAILED' && builds?.[0]?.error ? builds[0].error : null,
    }));

    return NextResponse.json({ websites: websitesWithError, canCreateNew });
  } catch (error: any) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}
