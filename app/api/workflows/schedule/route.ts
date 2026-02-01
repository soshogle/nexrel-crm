
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTemplateById } from '@/lib/workflow-templates';

/**
 * POST /api/workflows/schedule
 * Schedule a workflow to run at a specific time
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      workflowId, 
      templateId,
      scheduledDate, 
      scheduledTime,
      timezone = 'America/New_York',
      customVariables = {},
      targetAudience = {},
      name,
      description
    } = body;

    // Validate required fields
    if (!scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { error: 'Schedule date and time are required' },
        { status: 400 }
      );
    }

    // If using a template, fetch it
    let workflowData: any = null;
    if (templateId) {
      const template = getTemplateById(templateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      workflowData = template;
    } else if (workflowId) {
      // Fetch existing workflow
      workflowData = await prisma.workflow.findUnique({
        where: { id: workflowId }
      });
      
      if (!workflowData) {
        return NextResponse.json(
          { error: 'Workflow not found' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either workflowId or templateId is required' },
        { status: 400 }
      );
    }

    // Combine scheduled date and time
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    // Validate future date
    if (scheduledDateTime <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Create or update workflow with schedule
    const workflow = await prisma.workflow.create({
      data: {
        userId: session.user.id,
        name: name || workflowData.name,
        description: description || workflowData.description,
        triggerType: 'SCHEDULED',
        triggerConfig: {
          date: scheduledDate,
          time: scheduledTime,
          timezone,
          originalTrigger: workflowData.triggers?.[0]
        },
        status: 'SCHEDULED',
        scheduledDate: scheduledDateTime,
        metadata: {
          templateId,
          customVariables,
          targetAudience,
          timezone,
          actions: workflowData.actions || [],
          conditions: workflowData.conditions || []
        }
      }
    });

    console.log(`Workflow scheduled: ${workflow.id} for ${scheduledDateTime.toISOString()}`);

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        scheduledDate: workflow.scheduledDate,
        status: workflow.status
      },
      message: `Workflow scheduled for ${scheduledDate} at ${scheduledTime} ${timezone}`
    });

  } catch (error) {
    console.error('Error scheduling workflow:', error);
    return NextResponse.json(
      { error: 'Failed to schedule workflow' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/schedule
 * Get all scheduled workflows
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduledWorkflows = await prisma.workflow.findMany({
      where: {
        userId: session.user.id,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date() // Only future scheduled workflows
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        scheduledDate: true,
        status: true,
        triggerType: true,
        triggerConfig: true,
        metadata: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      scheduled: scheduledWorkflows,
      count: scheduledWorkflows.length
    });

  } catch (error) {
    console.error('Error fetching scheduled workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled workflows' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/schedule
 * Cancel a scheduled workflow
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Update workflow status to cancelled
    const workflow = await prisma.workflow.update({
      where: {
        id: workflowId,
        userId: session.user.id
      },
      data: {
        status: 'CANCELLED'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow schedule cancelled',
      workflow: {
        id: workflow.id,
        status: workflow.status
      }
    });

  } catch (error) {
    console.error('Error cancelling workflow:', error);
    return NextResponse.json(
      { error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}
