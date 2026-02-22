import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCrmDb, leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { processReferralTriggers } from '@/lib/referral-triggers'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { leadData } = body

    const ctx = getDalContextFromSession(session)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getCrmDb(ctx)
    // Get referral
    const referral = await db.referral.findUnique({
      where: { id: params.id, userId: ctx.userId },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    if (referral.convertedLeadId) {
      return NextResponse.json(
        { error: 'Referral already converted' },
        { status: 400 }
      )
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

    return NextResponse.json({ referral: updatedReferral, lead: newLead })
  } catch (error) {
    console.error('Error converting referral:', error)
    return NextResponse.json(
      { error: 'Failed to convert referral' },
      { status: 500 }
    )
  }
}
