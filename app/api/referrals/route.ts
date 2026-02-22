import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCrmDb, leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { processReferralTriggers } from '@/lib/referral-triggers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

// GET - List all referrals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getCrmDb(ctx)
    const referrals = await db.referral.findMany({
      where: { userId: ctx.userId },
      include: {
        referrer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            phone: true,
            email: true,
          },
        },
        convertedLead: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ referrals })
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    )
  }
}

// POST - Create a new referral
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { referrerId, referredName, referredEmail, referredPhone, notes } = body

    // Validation
    if (!referrerId || !referredName) {
      return NextResponse.json(
        { error: 'referrerId and referredName are required' },
        { status: 400 }
      )
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getCrmDb(ctx)
    // Verify referrer exists and belongs to user
    const referrer = await leadService.findUnique(ctx, referrerId)

    if (!referrer) {
      return NextResponse.json(
        { error: 'Referrer lead not found' },
        { status: 404 }
      )
    }

    // Create referral
    const referral = await db.referral.create({
      data: {
        userId: ctx.userId,
        referrerId,
        referredName,
        referredEmail,
        referredPhone,
        notes,
        status: 'PENDING',
      },
      include: {
        referrer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
      },
    })

    // Fire referral triggers (campaigns + workflow enrollment for referrer lead)
    try {
      await processReferralTriggers(session.user.id, referrerId, 'REFERRAL_CREATED')
    } catch (triggerError) {
      console.error('Referral trigger processing failed:', triggerError)
    }

    return NextResponse.json({ referral }, { status: 201 })
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json(
      { error: 'Failed to create referral' },
      { status: 500 }
    )
  }
}
