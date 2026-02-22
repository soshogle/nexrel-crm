export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { leadService } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers'
import { apiErrors } from '@/lib/api-error'
import { LeadCreateBodySchema, LeadsGetQuerySchema } from '@/lib/api-validation'
import { emitCRMEvent } from '@/lib/crm-event-emitter'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const { searchParams } = new URL(request.url)
    const queryResult = LeadsGetQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    })
    if (!queryResult.success) {
      return apiErrors.validationError('Invalid query parameters', queryResult.error.flatten())
    }
    const { status, search } = queryResult.data

    const leads = await leadService.findMany(ctx, { status, search })

    return NextResponse.json(leads)
  } catch (error) {
    console.error('Get leads error:', error)
    return apiErrors.internal('Failed to fetch leads')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiErrors.badRequest('Invalid JSON body')
    }

    const parseResult = LeadCreateBodySchema.safeParse(body)
    if (!parseResult.success) {
      return apiErrors.validationError('Invalid lead data', parseResult.error.flatten())
    }
    const data = parseResult.data

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const lead = await leadService.create(ctx, data)

    emitCRMEvent('lead_created', session.user.id, { entityId: lead.id, entityType: 'Lead', data: { name: lead.businessName || lead.contactPerson } });

    // Trigger workflows on lead creation (RE and industry auto-run)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    if (user?.industry === 'REAL_ESTATE') {
      detectLeadWorkflowTriggers(session.user.id, lead.id).catch(err => {
        console.error('[RE Workflow] Failed to trigger workflow for lead:', err);
      });
    } else if (user?.industry) {
      const { detectIndustryLeadWorkflowTriggers } = await import('@/lib/industry-workflows/lead-triggers');
      detectIndustryLeadWorkflowTriggers(session.user.id, lead.id, user.industry).catch(err => {
        console.error('[Industry Workflow] Failed to trigger workflows for lead:', err);
      });
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Create lead error:', error)
    return apiErrors.internal('Failed to create lead')
  }
}
