/**
 * RAMQ Claims API
 * Handles RAMQ insurance claim creation and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';
import { InsuranceClaimStatus, InsuranceProviderType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const type = (searchParams.get('type') || '').toLowerCase();
    const db = getCrmDb(ctx);

    const dbClaims = await (db as any).dentalInsuranceClaim.findMany({
      where: {
        userId: ctx.userId,
        insuranceType: 'RAMQ',
        ...(leadId ? { leadId } : {}),
      },
      select: {
        id: true,
        claimNumber: true,
        providerName: true,
        policyNumber: true,
        procedures: true,
        totalAmount: true,
        status: true,
        submittedAt: true,
        processedAt: true,
        deniedAt: true,
        denialReason: true,
        responseData: true,
        notes: true,
        createdAt: true,
        patientInfo: true,
        leadId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const normalized = dbClaims
      .map((c: any) => {
        const responseData = c.responseData || {};
        const isPreAuth = (responseData?.kind || '').toUpperCase() === 'PREAUTH';
        const procedures = Array.isArray(c.procedures) ? c.procedures : [];
        const p0 = procedures[0] || {};
        return {
          id: c.id,
          leadId: c.leadId,
          claimNumber: c.claimNumber,
          claimType: isPreAuth ? 'PREAUTH' : 'CLAIM',
          type: isPreAuth ? 'PREAUTH' : 'CLAIM',
          provider: c.providerName,
          insuranceProvider: c.providerName,
          policyNumber: c.policyNumber || '',
          patientName: c.patientInfo?.name || '',
          patientRAMQNumber: c.patientInfo?.ramqNumber || '',
          procedureCode: p0.procedureCode || '',
          procedureName: p0.description || p0.procedureName || '',
          serviceDate: p0.dateOfService || c.submittedAt?.toISOString() || c.createdAt.toISOString(),
          treatmentType: p0.description || p0.procedureName || responseData?.treatmentType || '',
          amount: Number(c.totalAmount || 0),
          estimatedCost: Number(c.totalAmount || 0),
          status: mapDbStatusToUi(c.status, isPreAuth),
          submissionDate: c.submittedAt?.toISOString() || null,
          submittedAt: c.submittedAt?.toISOString() || null,
          responseDate: c.processedAt?.toISOString() || c.deniedAt?.toISOString() || null,
          responseAt: c.processedAt?.toISOString() || c.deniedAt?.toISOString() || null,
          approvedAmount: Number(responseData?.approvedAmount || 0) || undefined,
          denialReason: c.denialReason || responseData?.denialReason || null,
          narrative: responseData?.narrative || c.notes || '',
          attachmentIds: Array.isArray(responseData?.attachmentIds) ? responseData.attachmentIds : [],
          notes: c.notes || null,
          createdAt: c.createdAt.toISOString(),
        };
      })
      .filter((c: any) => (type === 'preauth' ? c.claimType === 'PREAUTH' : true));

    // Backward-compat: include legacy claims from Lead.insuranceInfo if no DB claims found
    if (normalized.length > 0) {
      return NextResponse.json(normalized);
    }

    const leads = await leadService.findMany(ctx, {
      where: leadId ? { id: leadId } : undefined,
      select: { id: true, contactPerson: true, businessName: true, insuranceInfo: true },
      take: 100,
    } as any);

    const legacyClaims: any[] = [];
    leads.forEach((lead: any) => {
      const insuranceInfo = lead.insuranceInfo as any;
      if (insuranceInfo?.ramqClaims && Array.isArray(insuranceInfo.ramqClaims)) {
        insuranceInfo.ramqClaims.forEach((claim: any) => {
          legacyClaims.push({
            ...claim,
            leadId: lead.id,
            patientName: claim.patientName || lead.contactPerson || lead.businessName,
          });
        });
      }
    });

    const filteredLegacy = type === 'preauth'
      ? legacyClaims.filter((c) => (c.claimType || c.type || '').toUpperCase() === 'PREAUTH')
      : legacyClaims;
    return NextResponse.json(filteredLegacy);
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
      clinicId,
      patientName,
      patientRAMQNumber,
      procedureCode,
      procedureName,
      serviceDate,
      amount,
      notes,
      claimType,
      type,
      provider,
      insuranceProvider,
      providerName,
      policyNumber,
      treatmentType,
      description,
      estimatedCost,
      narrative,
      attachmentIds,
      status,
    } = body;

    if (!userId || !leadId) {
      return apiErrors.badRequest(await t('api.missingRequiredFields'));
    }

    // Verify user owns the userId
    if (userId !== session.user.id) {
      return apiErrors.forbidden(await t('api.forbidden'));
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized(await t('api.unauthorized'));
    const db = getCrmDb(ctx);

    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead) {
      return apiErrors.notFound(await t('api.leadNotFound'));
    }

    const resolvedClinicId =
      clinicId ||
      (lead as any).clinicId ||
      (await (db as any).clinic.findFirst({
        where: { userId: ctx.userId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      }))?.id;

    if (!resolvedClinicId) {
      return apiErrors.badRequest('Clinic is required to create insurance claims');
    }

    const isPreAuth = ((claimType || type || '') as string).toUpperCase() === 'PREAUTH';
    const resolvedAmount = Number(amount || estimatedCost || 0);
    const resolvedProcedureDescription = treatmentType || description || procedureName || procedureCode || 'Insurance Claim';
    const resolvedDate = serviceDate ? new Date(serviceDate) : new Date();

    const created = await (db as any).dentalInsuranceClaim.create({
      data: {
        leadId,
        userId: ctx.userId,
        clinicId: resolvedClinicId,
        claimNumber: `RAMQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        insuranceType: 'RAMQ' as InsuranceProviderType,
        providerName: provider || insuranceProvider || providerName || 'RAMQ',
        policyNumber: policyNumber || patientRAMQNumber || '',
        patientInfo: {
          name: patientName || (lead as any).contactPerson || (lead as any).businessName || 'Patient',
          ramqNumber: patientRAMQNumber || ((lead as any).insuranceInfo?.ramqNumber ?? ''),
        },
        procedures: [
          {
            procedureCode: procedureCode || (isPreAuth ? 'PREAUTH' : 'UNKNOWN'),
            description: resolvedProcedureDescription,
            dateOfService: resolvedDate.toISOString(),
            cost: resolvedAmount,
          },
        ],
        totalAmount: resolvedAmount,
        submittedAmount: resolvedAmount,
        status: mapIncomingStatus(status || 'DRAFT'),
        notes: notes || null,
        responseData: {
          kind: isPreAuth ? 'PREAUTH' : 'CLAIM',
          treatmentType: treatmentType || null,
          narrative: narrative || null,
          attachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
        },
      },
      select: {
        id: true,
        claimNumber: true,
        providerName: true,
        policyNumber: true,
        procedures: true,
        totalAmount: true,
        status: true,
        submittedAt: true,
        processedAt: true,
        denialReason: true,
        notes: true,
        responseData: true,
        createdAt: true,
        patientInfo: true,
      },
    });

    // Backward compatibility: keep RAMQ number at lead level for existing forms
    if (patientRAMQNumber) {
      const insuranceInfo = ((lead as any).insuranceInfo || {}) as any;
      insuranceInfo.ramqNumber = patientRAMQNumber;
      await leadService.update(ctx, leadId, { insuranceInfo });
    }

    const responseData = (created as any).responseData || {};
    const normalized = {
      id: created.id,
      leadId,
      claimNumber: created.claimNumber,
      claimType: isPreAuth ? 'PREAUTH' : 'CLAIM',
      type: isPreAuth ? 'PREAUTH' : 'CLAIM',
      provider: created.providerName,
      insuranceProvider: created.providerName,
      policyNumber: created.policyNumber || '',
      patientName: (created as any).patientInfo?.name || '',
      patientRAMQNumber: (created as any).patientInfo?.ramqNumber || '',
      procedureCode: (created as any).procedures?.[0]?.procedureCode || '',
      procedureName: (created as any).procedures?.[0]?.description || '',
      serviceDate: (created as any).procedures?.[0]?.dateOfService || created.createdAt.toISOString(),
      treatmentType: (created as any).procedures?.[0]?.description || '',
      amount: Number(created.totalAmount || 0),
      estimatedCost: Number(created.totalAmount || 0),
      status: mapDbStatusToUi(created.status, isPreAuth),
      submissionDate: created.submittedAt?.toISOString() || null,
      submittedAt: created.submittedAt?.toISOString() || null,
      responseDate: created.processedAt?.toISOString() || null,
      responseAt: created.processedAt?.toISOString() || null,
      denialReason: created.denialReason || null,
      narrative: responseData?.narrative || created.notes || '',
      attachmentIds: Array.isArray(responseData?.attachmentIds) ? responseData.attachmentIds : [],
      notes: created.notes || null,
      createdAt: created.createdAt.toISOString(),
    };

    return NextResponse.json(normalized, { status: 201 });
  } catch (error) {
    console.error('Error creating RAMQ claim:', error);
    return apiErrors.internal(await t('api.createClaimFailed'));
  }
}
