
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // Get referral
    const referral = await prisma.referral.findUnique({
      where: { id: params.id, userId: session.user.id },
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
    const newLead = await prisma.lead.create({
      data: {
        userId: session.user.id,
        businessName: leadData?.businessName || referral.referredName,
        contactPerson: referral.referredName,
        email: referral.referredEmail,
        phone: referral.referredPhone,
        source: 'referral',
        status: 'NEW',
        ...leadData,
      },
    })

    // Update referral with converted lead
    const updatedReferral = await prisma.referral.update({
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

    return NextResponse.json({ referral: updatedReferral, lead: newLead })
  } catch (error) {
    console.error('Error converting referral:', error)
    return NextResponse.json(
      { error: 'Failed to convert referral' },
      { status: 500 }
    )
  }
}
