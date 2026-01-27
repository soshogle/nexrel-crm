
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { onboardingConfigService } from '@/lib/onboarding-config-service';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's collected data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    });

    if (!user?.onboardingProgress) {
      return NextResponse.json({ error: 'No onboarding data found' }, { status: 400 });
    }

    let data;
    try {
      data = JSON.parse(user.onboardingProgress as string);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid onboarding data' }, { status: 400 });
    }

    // Apply configuration
    const success = await onboardingConfigService.applyConfiguration(session.user.id, data);

    if (!success) {
      return NextResponse.json({ error: 'Failed to apply configuration' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration applied successfully',
    });
  } catch (error: any) {
    console.error('Configuration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply configuration' },
      { status: 500 }
    );
  }
}
