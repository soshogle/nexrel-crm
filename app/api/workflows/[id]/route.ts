/**
 * Generic Multi-Industry Workflow Single Template API
 * Get, update, or delete a specific workflow template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowTemplateService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

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

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workflow = await workflowTemplateService.findUnique(ctx, params.id);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const instances = await getCrmDb(ctx).workflowInstance.findMany({
      where: { templateId: params.id },
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
    });

    const _count = await getCrmDb(ctx).workflowInstance.count({
      where: { templateId: params.id },
    });

    const workflowWithExtras = {
      ...workflow,
      instances,
      _count: { instances: _count },
    };

    const transformedWorkflow = {
      id: workflowWithExtras.id,
      name: workflowWithExtras.name,
      description: workflowWithExtras.description || '',
      workflowType: workflowWithExtras.type,
      industry: workflowWithExtras.industry,
      executionMode: (workflowWithExtras as any).executionMode || 'WORKFLOW',
      audience: (workflowWithExtras as any).audience || null,
      campaignSettings: (workflowWithExtras as any).campaignSettings || null,
      enrollmentMode: (workflowWithExtras as any).enrollmentMode || false,
      enrollmentTriggers: (workflowWithExtras as any).enrollmentTriggers || null,
      tasks: workflowWithExtras.tasks.map(t => {
        const ac = (t.actionConfig as any) || {};
        return {
          id: t.id,
          name: t.name,
          description: t.description || '',
          taskType: t.taskType,
          assignedAgentId: ac.assignedAgentId || null,
          assignedAgentName: ac.assignedAgentName || null,
          agentColor: ac.agentColor || '#6B7280',
          assignedAIEmployeeId: ac.assignedAIEmployeeId || null,
          displayOrder: t.displayOrder,
          isHITL: t.isHITL,
          delayMinutes: t.delayValue,
          delayUnit: t.delayUnit as 'MINUTES' | 'HOURS' | 'DAYS',
          delayDays: (t as any).delayDays || 0,
          delayHours: (t as any).delayHours || 0,
          preferredSendTime: (t as any).preferredSendTime || null,
          skipConditions: (t as any).skipConditions || null,
          isAbTestVariant: (t as any).isAbTestVariant || false,
          abTestGroup: (t as any).abTestGroup || null,
          variantOf: (t as any).variantOf || null,
          parentTaskId: t.parentTaskId || null,
          branchCondition: t.branchCondition as any || null,
          actionConfig: t.actionConfig as object,
        };
      }),
      isDefault: workflowWithExtras.isDefault,
      createdAt: workflowWithExtras.createdAt.toISOString(),
      updatedAt: workflowWithExtras.updatedAt.toISOString(),
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

// PUT - Update a workflow template (placeholder to avoid duplicate - will replace below)
async function _putHandler(
  request: NextRequest,
  params: { id: string }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ctx = getDalContextFromSession(session);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await workflowTemplateService.findUnique(ctx, params.id);
  if (!existing) {
    return NextResponse.json(
      { error: 'Workflow not found' },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { name, description, isActive, tasks, executionMode, audience, campaignSettings, enrollmentMode, enrollmentTriggers, enableAbTesting, abTestConfig } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (executionMode !== undefined) updateData.executionMode = executionMode;
  if (audience !== undefined) updateData.audience = audience;
  if (campaignSettings !== undefined) updateData.campaignSettings = campaignSettings;
  if (enrollmentMode !== undefined) updateData.enrollmentMode = enrollmentMode;
  if (enrollmentTriggers !== undefined) updateData.enrollmentTriggers = enrollmentTriggers;
  if (enableAbTesting !== undefined) updateData.enableAbTesting = enableAbTesting;
  if (abTestConfig !== undefined) updateData.abTestConfig = abTestConfig;

  if (tasks && Array.isArray(tasks)) {
    const taskIds = await getCrmDb(ctx).workflowTask.findMany({
      where: { templateId: params.id },
      select: { id: true }
    });
    const ids = taskIds.map(t => t.id);
    if (ids.length > 0) {
      await getCrmDb(ctx).taskExecution.deleteMany({
        where: { taskId: { in: ids } }
      });
    }
    await getCrmDb(ctx).workflowTask.deleteMany({
      where: { templateId: params.id }
    });
    updateData.tasks = {
      create: tasks.map((task: any, index: number) => {
        const baseConfig = (task.actionConfig as object) || { actions: [] } as Record<string, unknown>;
        const actionConfig = {
          ...baseConfig,
          assignedAgentId: task.assignedAgentId || null,
          assignedAgentName: task.assignedAgentName || null,
          agentColor: task.agentColor || '#6B7280',
          assignedAIEmployeeId: task.assignedAIEmployeeId || null,
        };
        return {
          name: task.name as string,
          description: task.description as string || '',
          taskType: task.taskType as string || 'CUSTOM',
          assignedAgentType: null,
          delayValue: task.delayMinutes || task.delayValue || 0,
          delayUnit: (task.delayUnit || 'MINUTES') as string,
          delayDays: task.delayDays || 0,
          delayHours: task.delayHours || 0,
          preferredSendTime: task.preferredSendTime || null,
          skipConditions: task.skipConditions || null,
          isAbTestVariant: task.isAbTestVariant || false,
          abTestGroup: task.abTestGroup || null,
          variantOf: task.variantOf || null,
          isHITL: task.isHITL as boolean || false,
          isOptional: false,
          position: task.position || { row: Math.floor(index / 3), col: index % 3 },
          displayOrder: task.displayOrder || index + 1,
          branchCondition: (task.branchCondition as object | undefined) ?? undefined,
          actionConfig,
        };
      })
    };
  }

  const workflow = await getCrmDb(ctx).workflowTemplate.update({
    where: { id: params.id, userId: ctx.userId },
    data: updateData,
    include: {
      tasks: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  const transformedWorkflow = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || '',
    workflowType: workflow.type,
    industry: workflow.industry,
    executionMode: (workflow as any).executionMode || 'WORKFLOW',
    enrollmentMode: (workflow as any).enrollmentMode || false,
    enrollmentTriggers: (workflow as any).enrollmentTriggers || null,
    tasks: workflow.tasks.map(t => {
      const ac = (t.actionConfig as any) || {};
      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        taskType: t.taskType,
        assignedAgentId: ac.assignedAgentId || null,
        assignedAgentName: ac.assignedAgentName || null,
        agentColor: ac.agentColor || '#6B7280',
        assignedAIEmployeeId: ac.assignedAIEmployeeId || null,
        displayOrder: t.displayOrder,
        isHITL: t.isHITL,
        delayMinutes: t.delayValue,
        delayUnit: t.delayUnit as 'MINUTES' | 'HOURS' | 'DAYS',
        delayDays: (t as any).delayDays || 0,
        delayHours: (t as any).delayHours || 0,
        preferredSendTime: (t as any).preferredSendTime || null,
        skipConditions: (t as any).skipConditions || null,
        isAbTestVariant: (t as any).isAbTestVariant || false,
        abTestGroup: (t as any).abTestGroup || null,
        variantOf: (t as any).variantOf || null,
        parentTaskId: t.parentTaskId || null,
        branchCondition: t.branchCondition as any || null,
        actionConfig: t.actionConfig as object,
      };
    }),
    isDefault: workflow.isDefault,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };

  return NextResponse.json({
    success: true,
    workflow: transformedWorkflow
  });
}

// DELETE placeholder
async function _deleteHandler(
  request: NextRequest,
  params: { id: string }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ctx = getDalContextFromSession(session);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await workflowTemplateService.findUnique(ctx, params.id);
  if (!existing) {
    return NextResponse.json(
      { error: 'Workflow not found' },
      { status: 404 }
    );
  }

  const activeInstances = await getCrmDb(ctx).workflowInstance.count({
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

  await workflowTemplateService.delete(ctx, params.id);

  return NextResponse.json({
    success: true,
    message: 'Workflow deleted successfully'
  });
}

// Stub to remove - the PUT and DELETE below need to be replaced
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return _putHandler(request, params.id);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return _deleteHandler(request, params.id);
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
