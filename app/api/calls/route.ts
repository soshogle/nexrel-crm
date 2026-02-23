
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/calls - List call logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { searchParams } = new URL(request.url);
    const voiceAgentId = searchParams.get('voiceAgentId');
    const pagination = parsePagination(request);
    const countOnly = searchParams.get('countOnly') === 'true';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    const whereClause: any = { userId: user.id };
    if (voiceAgentId) {
      whereClause.voiceAgentId = voiceAgentId;
    }
    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
      if (toDate) whereClause.createdAt.lte = new Date(toDate);
    }

    if (countOnly) {
      const count = await prisma.callLog.count({ where: whereClause });
      return NextResponse.json({ count });
    }

    const calls = await prisma.callLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      include: {
        voiceAgent: {
          select: {
            name: true,
            businessName: true,
          },
        },
        lead: {
          select: {
            businessName: true,
            contactPerson: true,
          },
        },
        appointment: true,
      },
    });

    const total = await prisma.callLog.count({ where: whereClause });
    return paginatedResponse(calls || [], total, pagination, 'calls');
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    // Return empty array on error to prevent filter crashes
    return NextResponse.json([], { status: 200 });
  }
}
