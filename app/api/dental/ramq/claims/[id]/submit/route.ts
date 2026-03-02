/**
 * RAMQ Claim Submission API
 * Submits a claim to RAMQ (via Facturation.net integration if available)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/ramq/claims/[id]/submit - Submit claim to RAMQ
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized(await t('api.unauthorized'));

    const db = getCrmDb(ctx);

    const dbClaim = await (db as any).dentalInsuranceClaim.findFirst({
      where: { id: params.id, userId: ctx.userId },
      select: { id: true, status: true, claimNumber: true },
    });

    if (dbClaim) {
      if (dbClaim.status !== 'DRAFT') {
        return apiErrors.badRequest(await t('api.claimAlreadySubmitted'));
      }

      const updated = await (db as any).dentalInsuranceClaim.update({
        where: { id: params.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          claimNumber: dbClaim.claimNumber || `RAMQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          ramqStatus: 'PROCESSING',
        },
        select: { id: true, claimNumber: true, submittedAt: true, status: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Claim submitted successfully',
        claimId: updated.id,
        claimNumber: updated.claimNumber,
        submittedAt: updated.submittedAt,
        status: updated.status,
      });
    }

    // Legacy fallback: old Lead.insuranceInfo.ramqClaims claims
    const leads = await leadService.findMany(ctx, {
      select: { id: true, insuranceInfo: true },
      take: 200,
    } as any);

    for (const lead of leads as any[]) {
      const insuranceInfo = (lead.insuranceInfo as any) || {};
      if (!Array.isArray(insuranceInfo.ramqClaims)) continue;
      const claimIndex = insuranceInfo.ramqClaims.findIndex((c: any) => c.id === params.id);
      if (claimIndex === -1) continue;

      const claim = insuranceInfo.ramqClaims[claimIndex];
      if (claim.status !== 'DRAFT') {
        return apiErrors.badRequest(await t('api.claimAlreadySubmitted'));
      }
      insuranceInfo.ramqClaims[claimIndex] = {
        ...claim,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        claimNumber: claim.claimNumber || `RAMQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      };
      await leadService.update(ctx, lead.id, { insuranceInfo });
      return NextResponse.json({
        success: true,
        message: 'Claim submitted successfully',
        claimId: params.id,
      });
    }

    return apiErrors.notFound(await t('api.notFound'));

    // TODO: Integrate with Facturation.net API if available
    // For now, we'll simulate submission
    // In production, you would:
    // 1. Call Facturation.net API to submit the claim
    // 2. Handle the response
    // 3. Update claim status based on response

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('Error submitting RAMQ claim:', error);
    return apiErrors.internal(await t('api.submitClaimFailed'));
  }
}
