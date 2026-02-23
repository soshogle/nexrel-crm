import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCrmDb, leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { processReferralTriggers } from '@/lib/referral-triggers'
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

// GET - List all referrals
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const pagination = parsePagination(request)

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
      take: pagination.take,
      skip: pagination.skip,
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.referral.count({ where: { userId: ctx.userId } })
    return paginatedResponse(referrals, total, pagination, 'referrals')
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return apiErrors.internal('Failed to fetch referrals')
  }
}

// POST - Create a new referral
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const body = await request.json()
    const { referrerId, referredName, referredEmail, referredPhone, notes } = body

    // Validation
    if (!referrerId || !referredName) {
      return apiErrors.badRequest('referrerId and referredName are required')
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const db = getCrmDb(ctx)
    // Verify referrer exists and belongs to user
    const referrer = await leadService.findUnique(ctx, referrerId)

    if (!referrer) {
      return apiErrors.notFound('Referrer lead not found')
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
    return apiErrors.internal('Failed to create referral')
  }
}
