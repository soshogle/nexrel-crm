
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

// GET /api/pipelines/[id]/stages - Get all stages for a pipeline

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    const db = ctx ? getCrmDb(ctx) : prisma;

    const stages = await db.pipelineStage.findMany({
      where: { pipelineId: params.id },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(stages);
  } catch (error) {
    console.error('Error fetching stages:', error);
    return apiErrors.internal('Failed to fetch stages');
  }
}
