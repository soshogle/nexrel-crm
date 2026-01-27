
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReviewSource } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - List all reviews
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reviews = await prisma.review.findMany({
      where: {
        campaign: {
          userId: session.user.id,
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST - Create a new review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, leadId, source, rating, reviewText, reviewUrl, isPublic } = body

    // Validation
    if (!campaignId || !leadId || !source || !rating) {
      return NextResponse.json(
        { error: 'campaignId, leadId, source, and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        campaignId,
        leadId,
        source: source as ReviewSource,
        rating,
        reviewText,
        reviewUrl,
        isPublic: isPublic || false,
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Update campaign lead status to RESPONDED if exists
    await prisma.campaignLead.updateMany({
      where: {
        campaignId,
        leadId,
      },
      data: {
        status: 'RESPONDED',
        respondedAt: new Date(),
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
