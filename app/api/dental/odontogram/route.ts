/**
 * Dental Odontogram API
 * Handles odontogram (tooth chart) CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get odontogram for a patient
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

    if (!leadId) {
      return apiErrors.badRequest(await t('api.leadIdRequired'));
    }

    // Build where clause with clinic filtering
    const where: any = {
      leadId,
      userId: session.user.id,
    };
    if (clinicId) {
      where.clinicId = clinicId;
    }

    // Get most recent odontogram
    const odontogram = await db.dentalOdontogram.findFirst({
      where,
      orderBy: { chartDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      odontogram: odontogram || null,
    });
  } catch (error: any) {
    console.error('Error fetching odontogram:', error);
    return apiErrors.internal(await t('api.fetchOdontogramFailed'));
  }
}

// POST - Create or update odontogram
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const { leadId, toothData, notes, clinicId } = body;

    if (!leadId || !toothData) {
      return apiErrors.badRequest(await t('api.toothDataRequired'));
    }

    // Build where clause with clinic filtering
    const where: any = {
      leadId,
      userId: session.user.id,
    };
    if (clinicId) {
      where.clinicId = clinicId;
    }

    // Check if odontogram exists
    const existing = await db.dentalOdontogram.findFirst({
      where,
      orderBy: { chartDate: 'desc' },
    });

    let odontogram;
    if (existing) {
      // Update existing
      const updateData: any = {
        toothData,
        notes: notes || null,
        chartedBy: session.user.id,
        updatedAt: new Date(),
      };
      if (clinicId) {
        updateData.clinicId = clinicId;
      }
      odontogram = await db.dentalOdontogram.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      // Create new
      const createData: any = {
        leadId,
        userId: session.user.id,
        toothData,
        notes: notes || null,
        chartedBy: session.user.id,
      };
      if (clinicId) {
        createData.clinicId = clinicId;
      }
      odontogram = await db.dentalOdontogram.create({
        data: createData,
      });
    }

    return NextResponse.json({
      success: true,
      odontogram,
    });
  } catch (error: any) {
    console.error('Error saving odontogram:', error);
    return apiErrors.internal(await t('api.saveOdontogramFailed'), error.message);
  }
}
