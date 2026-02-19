export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers'
import { apiErrors } from '@/lib/api-error'
import { LeadCreateBodySchema, LeadsGetQuerySchema } from '@/lib/api-validation'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const queryResult = LeadsGetQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    })
    if (!queryResult.success) {
      return apiErrors.validationError('Invalid query parameters', queryResult.error.flatten())
    }
    const { status, search } = queryResult.data

    const where: { userId: string; status?: string; OR?: Array<Record<string, unknown>> } = {
      userId: session.user.id,
    }
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        notes: {
          select: { id: true, createdAt: true }
        },
        messages: {
          select: { id: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

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

    const lead = await prisma.lead.create({
      data: {
        ...data,
        userId: session.user.id,
      },
      include: {
        notes: true,
        messages: true,
      }
    })

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
