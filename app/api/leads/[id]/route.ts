
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { emitCRMEvent } from '@/lib/crm-event-emitter'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        messages: {
          orderBy: { createdAt: 'desc' }
        },
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Get lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data,
      include: {
        notes: true,
        messages: true,
      }
    })

    if (data.status === 'CONVERTED') {
      emitCRMEvent('lead_converted', session.user.id, { entityId: params.id, entityType: 'Lead' });
    } else if (data.status === 'LOST') {
      emitCRMEvent('lead_lost', session.user.id, { entityId: params.id, entityType: 'Lead' });
    } else if (data.status) {
      emitCRMEvent('lead_updated', session.user.id, { entityId: params.id, entityType: 'Lead' });
    }

    return NextResponse.json(updatedLead)
  } catch (error) {
    console.error('Update lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await prisma.lead.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Delete lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
