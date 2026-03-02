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
import { parsePagination, paginatedResponse } from '@/lib/api-utils'
import { syncLeadCreatedToPipeline } from '@/lib/lead-pipeline-sync'

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
    const pagination = parsePagination(request)

    const [leads, total] = await Promise.all([
      leadService.findMany(ctx, { status, search, take: pagination.take, skip: pagination.skip }),
      leadService.count(ctx, {
        ...(status && status !== 'ALL' ? { status: status as any } : {}),
      }),
    ])

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com'
    // Preserve demo behavior only for the dedicated orthodontist demo account
    if (isOrthoDemo && leads.length === 0 && total === 0) {
      const { MOCK_LEADS } = await import('@/lib/mock-data');
      const mockLeads = MOCK_LEADS.slice(0, pagination.take);
      return paginatedResponse(mockLeads, MOCK_LEADS.length, pagination, 'leads')
    }

    return paginatedResponse(leads, total, pagination, 'leads')
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

    syncLeadCreatedToPipeline(session.user.id, lead).catch(err => {
      console.error('[LeadPipelineSync] Failed on lead creation:', err);
    });

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
