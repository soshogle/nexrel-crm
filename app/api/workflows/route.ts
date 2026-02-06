/**
 * Generic Multi-Industry Workflows API
 * List and create workflow templates for all industries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - List all workflow templates for the user's industry
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true }
    });

    if (!user?.industry || user.industry === 'REAL_ESTATE') {
      return NextResponse.json(
        { error: 'This feature is not available for this industry' },
        { status: 403 }
      );
    }

    const industryConfig = getIndustryConfig(user.industry);
    if (!industryConfig) {
      return NextResponse.json(
        { error: 'Workflow system not configured for this industry' },
        { status: 403 }
      );
    }

    // Get user's workflow templates
    const workflows = await prisma.workflowTemplate.findMany({
      where: { 
        userId: session.user.id,
        industry: user.industry
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        },
        _count: {
          select: { instances: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match WorkflowTemplate interface
    const transformedWorkflows = workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description || '',
      workflowType: w.type,
      industry: w.industry,
      tasks: w.tasks.map(t => ({
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
      isDefault: w.isDefault,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      workflows: transformedWorkflows,
      defaultTemplatesAvailable: industryConfig.templates.map(t => ({
        id: t.id,
        name: t.name,
        type: t.workflowType,
        description: t.description,
        taskCount: t.tasks.length
      }))
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST - Create a new workflow template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true }
    });

    if (!user?.industry || user.industry === 'REAL_ESTATE') {
      return NextResponse.json(
        { error: 'This feature is not available for this industry' },
        { status: 403 }
      );
    }

    const industryConfig = getIndustryConfig(user.industry);
    if (!industryConfig) {
      return NextResponse.json(
        { error: 'Workflow system not configured for this industry' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, description, fromTemplate, tasks } = body;

    // If creating from a template
    if (fromTemplate) {
      const template = industryConfig.templates.find(t => t.id === fromTemplate);
      if (!template) {
        return NextResponse.json(
          { error: 'Invalid template ID' },
          { status: 400 }
        );
      }

      // Create workflow from template
      const workflow = await prisma.workflowTemplate.create({
        data: {
          userId: session.user.id,
          industry: user.industry,
          name: name || template.name,
          type: type || 'TEMPLATE',
          description: description || template.description,
          isDefault: false,
          isActive: true,
          tasks: {
            create: template.tasks.map((task, index) => ({
              name: task.name,
              description: task.description || '',
              taskType: task.taskType,
              assignedAgentType: null,
              delayValue: task.delayValue,
              delayUnit: task.delayUnit,
              isHITL: task.isHITL,
              isOptional: false,
              position: { row: Math.floor(index / 3), col: index % 3 },
              displayOrder: task.displayOrder || index + 1,
              branchCondition: undefined,
              actionConfig: { actions: [] }
            }))
          }
        },
        include: {
          tasks: {
            orderBy: { displayOrder: 'asc' }
          }
        }
      });

      return NextResponse.json({
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          workflowType: workflow.type,
          industry: workflow.industry,
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
        }
      });
    }

    // Create custom workflow
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const workflow = await prisma.workflowTemplate.create({
      data: {
        userId: session.user.id,
        industry: user.industry,
        name,
        type: type || 'CUSTOM',
        description: description || '',
        isDefault: false,
        isActive: true,
        tasks: tasks ? {
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
        } : undefined
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        workflowType: workflow.type,
        industry: workflow.industry,
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
      }
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
