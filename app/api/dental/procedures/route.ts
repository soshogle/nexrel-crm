/**
 * Dental Procedures API
 * Phase 5: Get procedures for treatment progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
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
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const treatmentPlanId = searchParams.get('treatmentPlanId');
    const clinicId = searchParams.get('clinicId');
    const status = searchParams.get('status');

    const where: any = { userId: session.user.id };
    if (leadId) where.leadId = leadId;
    if (treatmentPlanId) where.treatmentPlanId = treatmentPlanId;
    if (clinicId) where.clinicId = clinicId;
    if (status) where.status = status;

    // Require either leadId or clinicId for scoping
    if (!leadId && !clinicId) {
      return apiErrors.badRequest('Lead ID or Clinic ID required');
    }

    const procedures = await (db as any).dentalProcedure.findMany({
      where,
      orderBy: [
        { performedDate: 'desc' },
        { scheduledDate: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, procedures });
  } catch (error: any) {
    console.error('Error fetching procedures:', error);
    return apiErrors.internal(error.message || 'Failed to fetch procedures');
  }
}

// POST /api/dental/procedures - Create a procedure
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const { leadId, treatmentPlanId, procedureCode, procedureName, status, cost, teethInvolved } =
      await request.json();

    const procedure = await (db as any).dentalProcedure.create({
      data: {
        userId: session.user.id,
        leadId,
        treatmentPlanId,
        procedureCode,
        procedureName,
        ...(status && { status }),
        ...(cost !== undefined && { cost }),
        ...(teethInvolved && { teethInvolved }),
      },
    });

    return NextResponse.json({ success: true, procedure });
  } catch (error: any) {
    console.error('Error creating procedure:', error);
    return apiErrors.internal(error.message || 'Failed to create procedure');
  }
}

// PATCH /api/dental/procedures - Update a procedure
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const { id, status, performedDate } = await request.json();

    if (!id) {
      return apiErrors.badRequest('Procedure ID required');
    }

    const procedure = await (db as any).dentalProcedure.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(performedDate && { performedDate: new Date(performedDate) }),
      },
    });

    return NextResponse.json({ success: true, procedure });
  } catch (error: any) {
    console.error('Error updating procedure:', error);
    return apiErrors.internal(error.message || 'Failed to update procedure');
  }
}
