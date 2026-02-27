/**
 * Orthodontic Treatment Tracking API
 * Full CRUD for aligners, braces, retainers, and appliances
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';
import type { OrthoTreatmentType, OrthoTreatmentStatus, OrthoArch } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// GET - Fetch treatments for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const clinicId = searchParams.get('clinicId');
    const treatmentType = searchParams.get('treatmentType') as OrthoTreatmentType | null;
    const status = searchParams.get('status') as OrthoTreatmentStatus | null;

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (leadId) where.leadId = leadId;
    if (clinicId) where.clinicId = clinicId;
    if (treatmentType) where.treatmentType = treatmentType;
    if (status) where.status = status;

    const treatments = await db.orthoTreatment.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        treatmentPlan: true,
      },
    });

    return NextResponse.json({
      success: true,
      treatments,
    });
  } catch (error: unknown) {
    console.error('Error fetching ortho treatments:', error);
    return apiErrors.internal(await t('api.fetchTreatmentPlansFailed'));
  }
}

// POST - Create or update treatment (upsert)
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
      clinicId,
      treatmentType,
      status,
      startDate,
      estimatedEndDate,
      actualEndDate,
      arch,
      notes,
      alignerBrand,
      alignerCaseNumber,
      totalAligners,
      currentAligner,
      wearSchedule,
      changeFrequency,
      nextChangeDate,
      refinementNumber,
      clinCheckUrl,
      iprPlan,
      bracketSystem,
      upperWire,
      lowerWire,
      elasticConfig,
      ligatureType,
      bracketsPlaced,
      retainerType,
      wearInstructions,
      applianceType,
      applianceDetails,
      visits,
      treatmentPlanId,
    } = body;

    if (!leadId || !clinicId || !treatmentType) {
      return apiErrors.badRequest('leadId, clinicId, and treatmentType are required');
    }

    const parsedStartDate = parseDate(startDate);
    if (!parsedStartDate) {
      return apiErrors.badRequest('startDate is required and must be a valid date');
    }

    const data: Record<string, unknown> = {
      leadId,
      userId: session.user.id,
      clinicId,
      treatmentType,
      status: status ?? 'ACTIVE',
      startDate: parsedStartDate,
      estimatedEndDate: parseDate(estimatedEndDate) ?? undefined,
      actualEndDate: parseDate(actualEndDate) ?? undefined,
      arch: arch ?? 'BOTH',
      notes: notes ?? null,
      alignerBrand: alignerBrand ?? null,
      alignerCaseNumber: alignerCaseNumber ?? null,
      totalAligners: totalAligners ?? null,
      currentAligner: currentAligner ?? null,
      wearSchedule: wearSchedule ?? 22,
      changeFrequency: changeFrequency ?? 14,
      refinementNumber: refinementNumber ?? 0,
      clinCheckUrl: clinCheckUrl ?? null,
      iprPlan: iprPlan ?? null,
      bracketSystem: bracketSystem ?? null,
      upperWire: upperWire ?? null,
      lowerWire: lowerWire ?? null,
      elasticConfig: elasticConfig ?? null,
      ligatureType: ligatureType ?? null,
      bracketsPlaced: bracketsPlaced ?? null,
      retainerType: retainerType ?? null,
      wearInstructions: wearInstructions ?? null,
      applianceType: applianceType ?? null,
      applianceDetails: applianceDetails ?? null,
      visits: visits ?? null,
      treatmentPlanId: treatmentPlanId ?? null,
    };

    // Calculate nextChangeDate for aligner types
    if (treatmentType === 'ALIGNER' && currentAligner != null && currentAligner > 0) {
      const freq = changeFrequency ?? 14;
      data.nextChangeDate = addDays(parsedStartDate, currentAligner * freq);
    } else if (nextChangeDate) {
      data.nextChangeDate = parseDate(nextChangeDate) ?? undefined;
    } else {
      data.nextChangeDate = undefined;
    }

    let treatment;
    if (id) {
      const existing = await db.orthoTreatment.findFirst({
        where: { id, userId: session.user.id },
      });
      if (!existing) {
        return apiErrors.notFound(await t('api.notFound'));
      }
      treatment = await db.orthoTreatment.update({
        where: { id },
        data,
      });
    } else {
      treatment = await db.orthoTreatment.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      treatment,
    });
  } catch (error: unknown) {
    console.error('Error saving ortho treatment:', error);
    return apiErrors.internal(await t('api.saveTreatmentPlanFailed'), (error as Error).message);
  }
}

// DELETE - Delete by id (searchParam), verify userId ownership
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiErrors.badRequest('id is required');
    }

    const existing = await db.orthoTreatment.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound(await t('api.notFound'));
    }

    await db.orthoTreatment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      treatment: existing,
    });
  } catch (error: unknown) {
    console.error('Error deleting ortho treatment:', error);
    return apiErrors.internal(await t('api.updateTreatmentPlanFailed'), (error as Error).message);
  }
}
