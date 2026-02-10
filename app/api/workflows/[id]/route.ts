/**
 * Generic Multi-Industry Workflow Single Template API
 * Get, update, or delete a specific workflow template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get a specific workflow template with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workflow = await prisma.workflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        },
        instances: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            lead: {
              select: { id: true, businessName: true, contactPerson: true }
            },
            deal: {
              select: { id: true, title: true }
            }
          }
        },
        _count: {
          select: { instances: true }
        }
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Transform to match WorkflowTemplate interface
    const transformedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || '',
      workflowType: workflow.type,
      industry: workflow.industry,
      executionMode: (workflow as any).executionMode || 'WORKFLOW',
      audience: (workflow as any).audience || null,
      campaignSettings: (workflow as any).campaignSettings || null,
      enrollmentMode: (workflow as any).enrollmentMode || false,
      enrollmentTriggers: (workflow as any).enrollmentTriggers || null,
      tasks: workflow.tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        taskType: t.taskType,
        assignedAgentId: null,
        assignedAgentName: null,
        agentColor: '#6B7280',
        displayOrder: t.displayOrder,
        isHITL: t.isHITL,
        delayMinutes: t.delayValue,
        delayUnit: t.delayUnit as 'MINUTES' | 'HOURS' | 'DAYS',
        parentTaskId: t.parentTaskId || null,
        branchCondition: t.branchCondition as any || null,
      })),
      isDefault: workflow.isDefault,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      workflow: transformedWorkflow
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// PUT - Update a workflow template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.workflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, isActive, tasks, executionMode, audience, campaignSettings, enrollmentMode, enrollmentTriggers } = body;

    // Update workflow
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (executionMode !== undefined) updateData.executionMode = executionMode;
    if (audience !== undefined) updateData.audience = audience;
    if (campaignSettings !== undefined) updateData.campaignSettings = campaignSettings;
    if (enrollmentMode !== undefined) updateData.enrollmentMode = enrollmentMode;
    if (enrollmentTriggers !== undefined) updateData.enrollmentTriggers = enrollmentTriggers;

    // If tasks are provided, update them
    if (tasks && Array.isArray(tasks)) {
      // Delete existing tasks
      await prisma.workflowTask.deleteMany({
        where: { templateId: params.id }
      });

      // Create new tasks
      updateData.tasks = {
        create: tasks.map((task: any, index: number) => ({
          name: task.name as string,
          description: task.description as string || '',
          taskType: task.taskType as string || 'CUSTOM',
          assignedAgentType: null,
          delayValue: task.delayMinutes || task.delayValue || 0,
          delayUnit: (task.delayUnit || 'MINUTES') as string,
          isHITL: task.isHITL as boolean || false,
          isOptional: false,
          position: task.position || { row: Math.floor(index / 3), col: index % 3 },
          displayOrder: task.displayOrder || index + 1,
          branchCondition: (task.branchCondition as object | undefined) ?? undefined,
          actionConfig: (task.actionConfig as object) || { actions: [] }
        }))
      };
    }

    const workflow = await prisma.workflowTemplate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    // Transform response
    const transformedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || '',
      workflowType: workflow.type,
      industry: workflow.industry,
      executionMode: (workflow as any).executionMode || 'WORKFLOW',
      enrollmentMode: (workflow as any).enrollmentMode || false,
      enrollmentTriggers: (workflow as any).enrollmentTriggers || null,
      tasks: workflow.tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        taskType: t.taskType,
        assignedAgentId: null,
        assignedAgentName: null,
        agentColor: '#6B7280',
        displayOrder: t.displayOrder,
        isHITL: t.isHITL,
        delayMinutes: t.delayValue,
        delayUnit: t.delayUnit as 'MINUTES' | 'HOURS' | 'DAYS',
        parentTaskId: t.parentTaskId || null,
        branchCondition: t.branchCondition as any || null,
      })),
      isDefault: workflow.isDefault,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      workflow: transformedWorkflow
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a workflow template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.workflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: { instances: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check for active instances
    const activeInstances = await prisma.workflowInstance.count({
      where: {
        templateId: params.id,
        status: 'ACTIVE'
      }
    });

    if (activeInstances > 0) {
      return NextResponse.json(
        { error: `Cannot delete workflow with ${activeInstances} active instances` },
        { status: 400 }
      );
    }

    // Delete workflow (cascade will delete tasks)
    await prisma.workflowTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
