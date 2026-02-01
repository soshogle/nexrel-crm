
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReferralStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

// GET - List all referrals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const referrals = await prisma.referral.findMany({
      where: { userId: session.user.id },
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

    // Verify referrer exists and belongs to user
    const referrer = await prisma.lead.findUnique({
      where: { id: referrerId, userId: session.user.id },
    })

    if (!referrer) {
      return NextResponse.json(
        { error: 'Referrer lead not found' },
        { status: 404 }
      )
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        userId: session.user.id,
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

    return NextResponse.json({ referral }, { status: 201 })
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json(
      { error: 'Failed to create referral' },
      { status: 500 }
    )
  }
}
