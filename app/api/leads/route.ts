
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { detectLeadWorkflowTriggers } from '@/lib/real-estate/workflow-triggers'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = { userId: session.user.id }
    
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
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

    // Check if user is in real estate industry and trigger workflows
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    if (user?.industry === 'REAL_ESTATE') {
      // Trigger RE workflow detection asynchronously
      detectLeadWorkflowTriggers(session.user.id, lead.id).catch(err => {
        console.error('[RE Workflow] Failed to trigger workflow for lead:', err);
      });
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Create lead error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
