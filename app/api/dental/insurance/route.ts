/**
 * Insurance Claims API
 * Phase 6: RAMQ and private insurance claim management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { insuranceManager } from '@/lib/dental/insurance-integration';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - List insurance claims
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');

    const where: any = {
      userId: session.user.id,
    };

    if (leadId) {
      where.leadId = leadId;
    }

    if (status) {
      where.status = status;
    }

    const claims = await (db as any).dentalInsuranceClaim.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return NextResponse.json({ claims });
  } catch (error: any) {
    console.error('Error fetching insurance claims:', error);
    return apiErrors.internal('Failed to fetch insurance claims');
  }
}

// POST - Create or submit insurance claim
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const {
      id,
      leadId,
      treatmentPlanId,
      procedureId,
      insuranceType,
      providerName,
      policyNumber,
      groupNumber,
      subscriberId,
      patientInfo,
      subscriberInfo,
      procedures,
      totalAmount,
      submittedAmount,
      estimatedCoverage,
      patientResponsibility,
      status,
      submitNow,
    } = body;

    if (!leadId || !providerName || !procedures || procedures.length === 0) {
      return apiErrors.badRequest('Missing required fields: leadId, providerName, procedures');
    }

    // Generate claim number
    const claimNumber =
      id || `CLAIM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const data: any = {
      leadId,
      userId: session.user.id,
      claimNumber,
      insuranceType: insuranceType || 'PRIVATE',
      providerName,
      policyNumber: policyNumber || '',
      groupNumber: groupNumber || null,
      subscriberId: subscriberId || null,
      patientInfo: patientInfo || {},
      subscriberInfo: subscriberInfo || null,
      procedures,
      totalAmount: totalAmount || 0,
      submittedAmount: submittedAmount || totalAmount || 0,
      estimatedCoverage: estimatedCoverage || null,
      patientResponsibility: patientResponsibility || null,
      status: submitNow ? 'SUBMITTED' : (status || 'DRAFT') as any,
    };

    if (treatmentPlanId) {
      data.treatmentPlanId = treatmentPlanId;
    }

    if (procedureId) {
      data.procedureId = procedureId;
    }

    if (submitNow) {
      data.submittedAt = new Date();
    }

    let claim;
    if (id) {
      // Update existing claim
      claim = await (db as any).dentalInsuranceClaim.update({
        where: { id },
        data,
      });
    } else {
      // Create new claim
      claim = await (db as any).dentalInsuranceClaim.create({
        data,
      });
    }

    // If submitting, call insurance integration service
    if (submitNow && claim.status === 'SUBMITTED') {
      try {
        const provider = {
          id: '',
          name: providerName,
          type: (insuranceType === 'RAMQ' ? 'RAMQ' : 'PRIVATE') as 'RAMQ' | 'PRIVATE',
        };

        await insuranceManager.submitClaim(
          {
            patientId: leadId,
            provider,
            procedureCode: procedures[0]?.procedureCode || '',
            procedureName: procedures[0]?.description || '',
            amount: submittedAmount,
          },
          provider,
          session.user.id
        );
      } catch (integrationError) {
        console.error('Insurance integration error:', integrationError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      claim,
    });
  } catch (error: any) {
    console.error('Error creating/updating insurance claim:', error);
    return apiErrors.internal('Failed to create/update insurance claim');
  }
}
