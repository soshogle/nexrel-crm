/**
 * RAMQ Claims API
 * Handles RAMQ insurance claim creation and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/ramq/claims - List RAMQ claims
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const leadId = searchParams.get('leadId');

    // Verify user owns the requested userId
    if (userId !== session.user.id) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized(await t('api.unauthorized'));

    // For now, store RAMQ claims in Lead.insuranceInfo JSON field
    // In production, you'd want a dedicated RAMQClaim model
    const where: any = {};
    if (leadId) {
      where.id = leadId;
    }

    const leads = await leadService.findMany(ctx, {
      where: Object.keys(where).length ? where : undefined,
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        insuranceInfo: true,
      },
    } as any);

    // Extract RAMQ claims from insuranceInfo
    const claims: any[] = [];
    leads.forEach((lead) => {
      const insuranceInfo = lead.insuranceInfo as any;
      if (insuranceInfo?.ramqClaims && Array.isArray(insuranceInfo.ramqClaims)) {
        insuranceInfo.ramqClaims.forEach((claim: any) => {
          claims.push({
            ...claim,
            leadId: lead.id,
            patientName: lead.contactPerson || lead.businessName,
          });
        });
      }
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error('Error fetching RAMQ claims:', error);
    return apiErrors.internal(await t('api.fetchClaimsFailed'));
  }
}

// POST /api/dental/ramq/claims - Create new RAMQ claim
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const body = await request.json();
    const {
      userId,
      leadId,
      patientName,
      patientRAMQNumber,
      procedureCode,
      procedureName,
      serviceDate,
      amount,
      notes,
    } = body;

    if (!userId || !patientName || !patientRAMQNumber || !procedureCode || !serviceDate || !amount) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    // Create claim object
    const claim = {
      id: `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      claimNumber: null,
      patientName,
      patientRAMQNumber,
      procedureCode,
      procedureName,
      serviceDate: new Date(serviceDate).toISOString(),
      amount: parseFloat(amount),
      status: 'DRAFT' as const,
      submissionDate: null,
      responseDate: null,
      rejectionReason: null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    // Store in Lead.insuranceInfo JSON field
    if (leadId) {
      const ctx = getDalContextFromSession(session);
      if (!ctx) return apiErrors.unauthorized(await t('api.unauthorized'));
      const lead = await leadService.findUnique(ctx, leadId);

      if (!lead) {
        return apiErrors.notFound(await t('api.leadNotFound'));
      }

      const insuranceInfo = (lead.insuranceInfo as any) || {};
      if (!insuranceInfo.ramqClaims) {
        insuranceInfo.ramqClaims = [];
      }
      insuranceInfo.ramqClaims.push(claim);
      insuranceInfo.ramqNumber = patientRAMQNumber;

      await leadService.update(ctx, leadId, { insuranceInfo });
    } else {
      // If no leadId, create a new lead or store in user metadata
      // For now, we'll require a leadId
      return apiErrors.badRequest(await t('api.leadIdRequired'));
    }

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error('Error creating RAMQ claim:', error);
    return apiErrors.internal(await t('api.createClaimFailed'));
  }
}
