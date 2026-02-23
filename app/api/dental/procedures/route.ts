/**
 * Dental Procedures API
 * Phase 5: Get procedures for treatment progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/procedures - List procedures
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const treatmentPlanId = searchParams.get('treatmentPlanId');
    const clinicId = searchParams.get('clinicId');

    if (!leadId) {
      return apiErrors.badRequest('Lead ID required');
    }

    const where: any = {
      leadId,
      userId: session.user.id,
    };
    if (treatmentPlanId) {
      where.treatmentPlanId = treatmentPlanId;
    }
    if (clinicId) {
      where.clinicId = clinicId;
    }

    const procedures = await (prisma as any).dentalProcedure.findMany({
      where,
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return NextResponse.json({ success: true, procedures });
  } catch (error: any) {
    console.error('Error fetching procedures:', error);
    return apiErrors.internal(error.message || 'Failed to fetch procedures');
  }
}
