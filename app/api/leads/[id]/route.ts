export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { emitCRMEvent } from '@/lib/crm-event-emitter'
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const lead = await leadService.findUnique(ctx, params.id, {
      notes: { orderBy: { createdAt: 'desc' } },
      messages: { orderBy: { createdAt: 'desc' } },
    } as any)

    if (!lead) {
      return apiErrors.notFound('Lead not found')
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Get lead error:', error)
    return apiErrors.internal()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const data = await request.json()
    
    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const lead = await leadService.findUnique(ctx, params.id)
    if (!lead) {
      return apiErrors.notFound('Lead not found')
    }

    const updatedLead = await leadService.update(ctx, params.id, data, { notes: true, messages: true } as any)

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
    return apiErrors.internal()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const lead = await leadService.findUnique(ctx, params.id)
    if (!lead) {
      return apiErrors.notFound('Lead not found')
    }

    await leadService.delete(ctx, params.id)

    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Delete lead error:', error)
    return apiErrors.internal()
  }
}
