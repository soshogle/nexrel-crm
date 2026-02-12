/**
 * Workflow Enrollment API
 * Enroll leads in enrollment-mode workflows (drip campaigns)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Enroll leads in a workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify workflow exists and belongs to user
    const workflow = await prisma.workflowTemplate.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check if workflow is in enrollment mode
    const enrollmentMode = (workflow as any).enrollmentMode;
    if (!enrollmentMode && (workflow as any).executionMode !== 'DRIP') {
      return NextResponse.json(
        { error: 'This workflow is not configured for enrollment mode' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      );
    }

    // Verify leads belong to user
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.user.id,
      },
    });

    if (leads.length !== leadIds.length) {
      return NextResponse.json(
        { error: 'Some leads were not found or do not belong to you' },
        { status: 400 }
      );
    }

    // Check for existing enrollments
    const existingEnrollments = await prisma.$queryRaw<Array<{ leadId: string }>>`
      SELECT "leadId" FROM "WorkflowTemplateEnrollment"
      WHERE "workflowId" = ${id} AND "leadId" = ANY(${leadIds})
    `;

    const existingLeadIds = new Set(existingEnrollments.map(e => e.leadId));
    const leadsToEnroll = leads.filter(l => !existingLeadIds.has(l.id));

    if (leadsToEnroll.length === 0) {
      return NextResponse.json(
        { error: 'All leads are already enrolled in this workflow' },
        { status: 400 }
      );
    }

    // Get first task to calculate next send time
    const firstTask = workflow.tasks[0];
    const nextSendAt = firstTask
      ? new Date(Date.now() + (firstTask.delayValue || 0) * (firstTask.delayUnit === 'HOURS' ? 3600000 : firstTask.delayUnit === 'DAYS' ? 86400000 : 60000))
      : new Date();

    // Determine A/B test group if A/B testing is enabled
    let abTestGroup: string | null = null;
    const workflowAny = workflow as any;
    if (workflowAny.enableAbTesting && workflowAny.abTestConfig) {
      const config = workflowAny.abTestConfig as any;
      const random = Math.random() * 100;
      abTestGroup = random < (config.splitPercentage || 50) ? 'A' : 'B';
    }

    // Create enrollments
    const enrollments = await Promise.all(
      leadsToEnroll.map((lead) =>
        prisma.$executeRaw`
          INSERT INTO "WorkflowTemplateEnrollment" (
            "id", "workflowId", "leadId", "status", "currentStep", 
            "nextSendAt", "enrolledAt", "abTestGroup"
          )
          VALUES (
            gen_random_uuid()::text,
            ${id},
            ${lead.id},
            'ACTIVE',
            1,
            ${nextSendAt},
            CURRENT_TIMESTAMP,
            ${abTestGroup}
          )
          ON CONFLICT ("workflowId", "leadId") DO NOTHING
        `
      )
    );

    return NextResponse.json({
      success: true,
      enrolled: leadsToEnroll.length,
      skipped: leads.length - leadsToEnroll.length,
      message: `Successfully enrolled ${leadsToEnroll.length} lead(s)`,
    });
  } catch (error) {
    console.error('Error enrolling leads:', error);
    return NextResponse.json(
      { error: 'Failed to enroll leads' },
      { status: 500 }
    );
  }
}

// GET - List enrollments for a workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify workflow exists and belongs to user
    const workflow = await prisma.workflowTemplate.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get enrollments using Prisma client
    const enrollments = await prisma.workflowTemplateEnrollment.findMany({
      where: {
        workflowId: id,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        leadId: true,
        status: true,
        currentStep: true,
        nextSendAt: true,
        enrolledAt: true,
        completedAt: true,
      },
    });

    // Get lead details for enrollments
    const leadIds = enrollments.map(e => e.leadId);
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        userId: session.user.id,
      },
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    const leadsMap = new Map(leads.map(l => [l.id, l]));

    const enrichedEnrollments = enrollments.map((enrollment) => ({
      ...enrollment,
      lead: leadsMap.get(enrollment.leadId) || null,
    }));

    return NextResponse.json({
      success: true,
      enrollments: enrichedEnrollments,
      total: enrichedEnrollments.length,
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
