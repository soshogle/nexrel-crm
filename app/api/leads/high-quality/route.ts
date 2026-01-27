import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/leads/high-quality - Get leads filtered by lead score
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get('minScore') || '75');
    const limit = parseInt(searchParams.get('limit') || '100');
    const hasPhone = searchParams.get('hasPhone') === 'true';

    const where: any = {
      userId: session.user.id,
      leadScore: { gte: minScore },
    };

    if (hasPhone) {
      where.phone = { not: null };
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        leadScore: true,
        status: true,
        source: true,
        city: true,
        state: true,
        businessCategory: true,
        lastContactedAt: true,
        createdAt: true,
        enrichedData: true,
      },
      orderBy: {
        leadScore: 'desc',
      },
      take: limit,
    });

    // Count total high-quality leads
    const totalCount = await prisma.lead.count({
      where,
    });

    return NextResponse.json({
      leads,
      count: leads.length,
      totalCount,
      filters: {
        minScore,
        hasPhone,
      },
    });
  } catch (error: any) {
    console.error('Error fetching high-quality leads:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch high-quality leads' },
      { status: 500 }
    );
  }
}
