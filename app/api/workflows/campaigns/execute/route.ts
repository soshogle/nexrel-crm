/**
 * Execute Campaign API
 * Executes a workflow in campaign mode (batch execution)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    // Fetch workflow template
    const workflow = await prisma.workflowTemplate.findFirst({
      where: {
        id: workflowId,
        userId: session.user.id,
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if ((workflow as any).executionMode !== 'CAMPAIGN') {
      return NextResponse.json(
        { error: 'Workflow is not in campaign mode' },
        { status: 400 }
      );
    }

    const audience = (workflow as any).audience as any;
    const campaignSettings = (workflow as any).campaignSettings as any;

    if (!audience || (audience.type !== 'FILTERED' && audience.type !== 'WEBSITE_LEADS')) {
      return NextResponse.json(
        { error: 'Invalid audience configuration' },
        { status: 400 }
      );
    }

    // Build lead query based on audience filters
    const leadWhere: any = {
      userId: session.user.id,
    };

    if (audience.filters?.minLeadScore) {
      leadWhere.leadScore = { gte: audience.filters.minLeadScore };
    }
    if (audience.filters?.statuses?.length > 0) {
      leadWhere.status = { in: audience.filters.statuses };
    }
    if (audience.filters?.tags?.length > 0) {
      leadWhere.tags = { hasSome: audience.filters.tags };
    }
    if (audience.filters?.hasPhone) {
      leadWhere.phone = { not: null };
    }
    if (audience.filters?.hasEmail) {
      leadWhere.email = { not: null };
    }
    // Website leads: filter by source (website, Website Form, etc.)
    if (audience.filters?.sources?.length > 0) {
      leadWhere.source = { in: audience.filters.sources };
    } else if (audience.type === 'WEBSITE_LEADS') {
      leadWhere.source = { in: ['website', 'Website Form', 'website_form', 'Website'] };
    }

    // Get matching leads
    const leads = await prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        businessName: true,
      },
    });

    const totalRecipients = leads.length;

    if (totalRecipients === 0) {
      return NextResponse.json(
        { error: 'No leads match the audience criteria' },
        { status: 400 }
      );
    }

    // Update workflow template with recipient count
    await prisma.workflowTemplate.update({
      where: { id: workflowId },
      data: {
        totalRecipients: totalRecipients as any,
        isActive: true,
      },
    });

    // Create workflow instances for each lead
    const instances = await Promise.all(
      leads.map((lead) =>
        prisma.workflowInstance.create({
          data: {
            templateId: workflow.id,
            userId: session.user.id,
            leadId: lead.id,
            status: 'ACTIVE',
          },
        })
      )
    );

    // Schedule workflow execution for each enrollment
    // This will be handled by the workflow execution engine
    // For now, we'll return success and let the background job process it

    return NextResponse.json({
      success: true,
      message: `Campaign started for ${totalRecipients} recipients`,
      totalRecipients,
      instancesCreated: instances.length,
    });
  } catch (error: any) {
    console.error('Error executing campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute campaign' },
      { status: 500 }
    );
  }
}
