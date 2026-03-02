import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { InsuranceClaimStatus } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mapIncomingStatus(status?: string): InsuranceClaimStatus {
  if (!status) return 'DRAFT';
  const s = status.toUpperCase();
  if (s === 'DRAFT') return 'DRAFT';
  if (s === 'SUBMITTED') return 'SUBMITTED';
  if (s === 'UNDER_REVIEW' || s === 'PENDING') return 'PROCESSING';
  if (s === 'INFO_REQUESTED') return 'ACKNOWLEDGED';
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'DENIED' || s === 'REJECTED') return 'DENIED';
  if (s === 'PAID') return 'PAID';
  if (s === 'APPEALED') return 'APPEALED';
  return 'DRAFT';
}

function mapDbStatusToUi(status: InsuranceClaimStatus, isPreAuth: boolean): string {
  if (status === 'DRAFT') return 'DRAFT';
  if (status === 'SUBMITTED') return 'SUBMITTED';
  if (status === 'ACKNOWLEDGED' || status === 'PROCESSING') return isPreAuth ? 'UNDER_REVIEW' : 'PENDING';
  if (status === 'APPROVED' || status === 'PARTIALLY_APPROVED') return 'APPROVED';
  if (status === 'DENIED') return isPreAuth ? 'DENIED' : 'REJECTED';
  if (status === 'PAID') return 'PAID';
  if (status === 'APPEALED') return 'APPEALED';
  return 'PENDING';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const status = typeof body?.status === 'string' ? body.status : undefined;
    const dbStatus = mapIncomingStatus(status);

    const existing = await (db as any).dentalInsuranceClaim.findFirst({
      where: { id: params.id, userId: ctx.userId },
      select: {
        id: true,
        status: true,
        responseData: true,
      },
    });

    if (existing) {
      const nextResponseData: any = {
        ...((existing.responseData as any) || {}),
        ...(body?.approvedAmount !== undefined ? { approvedAmount: Number(body.approvedAmount) || 0 } : {}),
      };

      const updated = await (db as any).dentalInsuranceClaim.update({
        where: { id: params.id },
        data: {
          status: dbStatus,
          submittedAt: dbStatus === 'SUBMITTED' ? (body?.submittedAt ? new Date(body.submittedAt) : new Date()) : undefined,
          processedAt: (dbStatus === 'APPROVED' || dbStatus === 'DENIED') ? new Date() : undefined,
          deniedAt: dbStatus === 'DENIED' ? new Date() : undefined,
          denialReason: body?.denialReason ?? undefined,
          notes: body?.notes ?? undefined,
          responseData: nextResponseData,
        },
        select: {
          id: true,
          providerName: true,
          policyNumber: true,
          totalAmount: true,
          status: true,
          submittedAt: true,
          processedAt: true,
          deniedAt: true,
          denialReason: true,
          responseData: true,
          createdAt: true,
        },
      });

      const isPreAuth = (((updated as any).responseData || {}).kind || '').toUpperCase() === 'PREAUTH';
      return NextResponse.json({
        success: true,
        claim: {
          id: updated.id,
          provider: updated.providerName,
          insuranceProvider: updated.providerName,
          policyNumber: updated.policyNumber,
          amount: Number(updated.totalAmount || 0),
          status: mapDbStatusToUi(updated.status, isPreAuth),
          submissionDate: updated.submittedAt?.toISOString() || null,
          submittedAt: updated.submittedAt?.toISOString() || null,
          responseDate: updated.processedAt?.toISOString() || updated.deniedAt?.toISOString() || null,
          responseAt: updated.processedAt?.toISOString() || updated.deniedAt?.toISOString() || null,
          approvedAmount: Number(((updated as any).responseData || {}).approvedAmount || 0) || undefined,
          denialReason: updated.denialReason || null,
          createdAt: updated.createdAt.toISOString(),
        },
      });
    }

    // Legacy fallback: claims stored in lead.insuranceInfo.ramqClaims
    const leads = await leadService.findMany(ctx, {
      select: { id: true, insuranceInfo: true },
      take: 200,
    } as any);
    for (const lead of leads as any[]) {
      const insuranceInfo = (lead.insuranceInfo || {}) as any;
      if (!Array.isArray(insuranceInfo.ramqClaims)) continue;
      const idx = insuranceInfo.ramqClaims.findIndex((c: any) => c.id === params.id);
      if (idx === -1) continue;
      insuranceInfo.ramqClaims[idx] = {
        ...insuranceInfo.ramqClaims[idx],
        ...(status ? { status } : {}),
        ...(body?.submittedAt ? { submittedAt: body.submittedAt } : {}),
        ...(body?.approvedAmount !== undefined ? { approvedAmount: Number(body.approvedAmount) || 0 } : {}),
        ...(body?.denialReason !== undefined ? { denialReason: body.denialReason } : {}),
        ...(body?.notes !== undefined ? { notes: body.notes } : {}),
      };
      await leadService.update(ctx, lead.id, { insuranceInfo });
      return NextResponse.json({ success: true, claim: insuranceInfo.ramqClaims[idx] });
    }

    return apiErrors.notFound('Claim not found');
  } catch (error) {
    console.error('RAMQ claim PATCH error:', error);
    return apiErrors.internal('Failed to update claim');
  }
}

