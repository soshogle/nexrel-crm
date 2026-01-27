
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Add leads to campaign
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
    const { leadIds } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: session.user.id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Add leads to campaign
    await prisma.campaignLead.createMany({
      data: leadIds.map((leadId: string) => ({
        campaignId: params.id,
        leadId,
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding leads to campaign:', error)
    return NextResponse.json(
      { error: 'Failed to add leads to campaign' },
      { status: 500 }
    )
  }
}

// DELETE - Remove lead from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: session.user.id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Remove lead from campaign
    await prisma.campaignLead.deleteMany({
      where: {
        campaignId: params.id,
        leadId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing lead from campaign:', error)
    return NextResponse.json(
      { error: 'Failed to remove lead from campaign' },
      { status: 500 }
    )
  }
}
