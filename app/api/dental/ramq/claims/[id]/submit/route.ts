/**
 * RAMQ Claim Submission API
 * Submits a claim to RAMQ (via Facturation.net integration if available)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { t } from '@/lib/i18n-server';

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
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    // Find the claim in all leads' insuranceInfo
    const leads = await prisma.lead.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        insuranceInfo: true,
      },
    });

    let claimFound = false;
    let updatedLeadId: string | null = null;

    for (const lead of leads) {
      const insuranceInfo = (lead.insuranceInfo as any) || {};
      if (insuranceInfo.ramqClaims && Array.isArray(insuranceInfo.ramqClaims)) {
        const claimIndex = insuranceInfo.ramqClaims.findIndex(
          (c: any) => c.id === params.id
        );

        if (claimIndex !== -1) {
          const claim = insuranceInfo.ramqClaims[claimIndex];
          
          if (claim.status !== 'DRAFT') {
            return NextResponse.json(
              { error: await t('api.claimAlreadySubmitted') },
              { status: 400 }
            );
          }

          // Update claim status
          insuranceInfo.ramqClaims[claimIndex] = {
            ...claim,
            status: 'SUBMITTED',
            submissionDate: new Date().toISOString(),
            claimNumber: `RAMQ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          };

          await prisma.lead.update({
            where: { id: lead.id },
            data: { insuranceInfo },
          });

          claimFound = true;
          updatedLeadId = lead.id;
          break;
        }
      }
    }

    if (!claimFound) {
      return NextResponse.json(
        { error: await t('api.notFound') },
        { status: 404 }
      );
    }

    // TODO: Integrate with Facturation.net API if available
    // For now, we'll simulate submission
    // In production, you would:
    // 1. Call Facturation.net API to submit the claim
    // 2. Handle the response
    // 3. Update claim status based on response

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId: params.id,
      // In production, include Facturation.net response here
    });
  } catch (error) {
    console.error('Error submitting RAMQ claim:', error);
    return NextResponse.json(
      { error: await t('api.submitClaimFailed') },
      { status: 500 }
    );
  }
}
