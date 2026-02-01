
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReferralStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

// GET - Get referral by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const referral = await prisma.referral.findUnique({
      where: { id: params.id, userId: session.user.id },
      include: {
        referrer: true,
        convertedLead: true,
      },
    })

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    return NextResponse.json({ referral })
  } catch (error) {
    console.error('Error fetching referral:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral' },
      { status: 500 }
    )
  }
}

// PATCH - Update referral
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes, rewardGiven, rewardDetails, convertedLeadId } = body

    // Verify ownership
    const existing = await prisma.referral.findUnique({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Update referral
    const referral = await prisma.referral.update({
      where: { id: params.id },
      data: {
        ...(status && { status: status as ReferralStatus }),
        ...(notes !== undefined && { notes }),
        ...(rewardGiven !== undefined && { rewardGiven }),
        ...(rewardDetails !== undefined && { rewardDetails }),
        ...(convertedLeadId !== undefined && { convertedLeadId }),
        updatedAt: new Date(),
      },
      include: {
        referrer: true,
        convertedLead: true,
      },
    })

    return NextResponse.json({ referral })
  } catch (error) {
    console.error('Error updating referral:', error)
    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    )
  }
}

// DELETE - Delete referral
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const existing = await prisma.referral.findUnique({
      where: { id: params.id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    await prisma.referral.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting referral:', error)
    return NextResponse.json(
      { error: 'Failed to delete referral' },
      { status: 500 }
    )
  }
}
