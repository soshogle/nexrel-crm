/**
 * Dental Treatment Plan API
 * Handles treatment plan CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { TreatmentPlanStatus } from '@prisma/client';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get treatment plans for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status') as TreatmentPlanStatus | null;
    const clinicId = searchParams.get('clinicId');

    const where: any = {
      userId: session.user.id,
    };

    if (leadId) {
      where.leadId = leadId;
    }

    if (status) {
      where.status = status;
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    const plans = await db.dentalTreatmentPlan.findMany({
      where,
      orderBy: { createdDate: 'desc' },
      include: {
        proceduresLog: {
          orderBy: { scheduledDate: 'desc' },
          take: 10,
        },
      },
    });

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error: any) {
    console.error('Error fetching treatment plans:', error);
    return apiErrors.internal(await t('api.fetchTreatmentPlansFailed'));
  }
}

// POST - Create or update treatment plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const {
      id,
      leadId,
      planName,
      description,
      procedures,
      totalCost,
      insuranceCoverage,
      patientResponsibility,
      status,
      startDate,
      clinicId,
    } = body;

    if (!leadId || !planName) {
      return apiErrors.badRequest(await t('api.planNameRequired'));
    }

    const data: any = {
      leadId,
      userId: session.user.id,
      planName,
      description: description || null,
      procedures: procedures || [],
      totalCost: totalCost || 0,
      insuranceCoverage: insuranceCoverage || 0,
      patientResponsibility: patientResponsibility || 0,
      status: status || TreatmentPlanStatus.DRAFT,
    };

    if (startDate) {
      data.startDate = new Date(startDate);
    }

    if (clinicId) {
      data.clinicId = clinicId;
    }

    let plan;
    if (id) {
      // Update existing
      plan = await db.dentalTreatmentPlan.update({
        where: { id },
        data,
      });
    } else {
      // Create new
      plan = await db.dentalTreatmentPlan.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error: any) {
    console.error('Error saving treatment plan:', error);
    return apiErrors.internal(await t('api.saveTreatmentPlanFailed'), error.message);
  }
}

// PATCH - Update treatment plan status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const { id, status, patientConsent } = body;

    if (!id || !status) {
      return apiErrors.badRequest(await t('api.planIdStatusRequired'));
    }

    const updateData: any = {
      status,
    };

    if (status === TreatmentPlanStatus.APPROVED) {
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    }

    if (patientConsent !== undefined) {
      updateData.patientConsent = patientConsent;
      if (patientConsent) {
        updateData.patientConsentDate = new Date();
      }
    }

    const plan = await db.dentalTreatmentPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error: any) {
    console.error('Error updating treatment plan:', error);
    return apiErrors.internal(await t('api.updateTreatmentPlanFailed'), error.message);
  }
}
