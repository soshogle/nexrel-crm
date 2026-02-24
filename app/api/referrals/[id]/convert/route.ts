import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCrmDb, leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { processReferralTriggers } from '@/lib/referral-triggers'
import { processOrthodontistWorkflowEnrollment } from '@/lib/orthodontist/workflow-enrollment-triggers'
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

// POST - Convert referral to lead
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const body = await request.json()
    const { leadData } = body

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const db = getCrmDb(ctx)
    // Get referral
    const referral = await db.referral.findUnique({
      where: { id: params.id, userId: ctx.userId },
    })

    if (!referral) {
      return apiErrors.notFound('Referral not found')
    }

    if (referral.convertedLeadId) {
      return apiErrors.badRequest('Referral already converted')
    }

    // Create new lead from referral
    const newLead = await leadService.create(ctx, {
      businessName: leadData?.businessName || referral.referredName,
      contactPerson: referral.referredName,
      email: referral.referredEmail,
      phone: referral.referredPhone,
      source: 'referral',
      status: 'NEW',
      ...leadData,
      contactType: 'CUSTOMER',
    } as any)

    // Update referral with converted lead
    const updatedReferral = await db.referral.update({
      where: { id: params.id },
      data: {
        status: 'CONVERTED',
        convertedLeadId: newLead.id,
      },
      include: {
        referrer: true,
        convertedLead: true,
      },
    })

    // Fire referral-converted triggers (enroll new lead in campaigns/workflows)
    try {
      await processReferralTriggers(ctx.userId, newLead.id, 'REFERRAL_CONVERTED')
    } catch (triggerError) {
      console.error('Referral convert trigger processing failed:', triggerError)
    }

    // Orthodontist: REFERRAL_CONVERTED triggers Referrals & Clinical Reports workflow
    try {
      await processOrthodontistWorkflowEnrollment(ctx.userId, newLead.id, 'REFERRAL_CONVERTED', {
        referralId: params.id,
      })
    } catch (triggerError) {
      console.error('Orthodontist referral-converted trigger failed:', triggerError)
    }

    return NextResponse.json({ referral: updatedReferral, lead: newLead })
  } catch (error) {
    console.error('Error converting referral:', error)
    return apiErrors.internal('Failed to convert referral')
  }
}
