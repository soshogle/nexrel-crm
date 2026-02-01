/**
 * Real Estate Workflows API
 * List and create RE workflow templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_WORKFLOW_TEMPLATES } from '@/lib/real-estate/workflow-templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - List all workflow templates for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is in real estate industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true }
    });

    if (user?.industry !== 'REAL_ESTATE') {
      return NextResponse.json(
        { error: 'This feature is only available for real estate agencies' },
        { status: 403 }
      );
    }

    // Get user's workflow templates
    const templates = await prisma.rEWorkflowTemplate.findMany({
      where: { userId: session.user.id },
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

    return NextResponse.json({
      success: true,
      templates,
      defaultTemplatesAvailable: DEFAULT_WORKFLOW_TEMPLATES.map(t => ({
        name: t.name,
        type: t.type,
        description: t.description,
        taskCount: t.tasks.length
      }))
    });
  } catch (error) {
    console.error('Error fetching RE workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST - Create a new workflow template (from scratch or from default template)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is in real estate industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true }
    });

    if (user?.industry !== 'REAL_ESTATE') {
      return NextResponse.json(
        { error: 'This feature is only available for real estate agencies' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, description, fromTemplate, tasks } = body;

    // If creating from a default template
    if (fromTemplate) {
      const defaultTemplate = DEFAULT_WORKFLOW_TEMPLATES.find(t => t.type === fromTemplate);
      if (!defaultTemplate) {
        return NextResponse.json(
          { error: 'Invalid template type' },
          { status: 400 }
        );
      }

      // Create workflow from default template
      const workflow = await prisma.rEWorkflowTemplate.create({
        data: {
          userId: session.user.id,
          name: name || defaultTemplate.name,
          type: defaultTemplate.type,
          description: description || defaultTemplate.description,
          isDefault: false,
          isActive: true,
          tasks: {
            create: defaultTemplate.tasks.map((task) => ({
              name: task.name,
              description: task.description,
              taskType: task.taskType,
              assignedAgentType: task.assignedAgentType,
              delayValue: task.delayValue,
              delayUnit: task.delayUnit,
              isHITL: task.isHITL,
              isOptional: task.isOptional,
              position: task.position as object,
              displayOrder: task.displayOrder,
              branchCondition: (task.branchCondition || undefined) as any,
              actionConfig: task.actionConfig as object
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
        workflow
      });
    }

    // Create custom workflow
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const workflow = await prisma.rEWorkflowTemplate.create({
      data: {
        userId: session.user.id,
        name,
        type,
        description: description || '',
        isDefault: false,
        isActive: true,
        tasks: tasks ? {
          create: tasks.map((task: Record<string, unknown>, index: number) => ({
            name: task.name as string,
            description: task.description as string || '',
            taskType: task.taskType as string,
            assignedAgentType: task.assignedAgentType as string || null,
            delayValue: task.delayValue as number || 0,
            delayUnit: task.delayUnit as string || 'MINUTES',
            isHITL: task.isHITL as boolean || false,
            isOptional: task.isOptional as boolean || false,
            position: task.position as object || { angle: (index * 36) - 90, radius: 1 },
            displayOrder: task.displayOrder as number || index + 1,
            branchCondition: (task.branchCondition as object | undefined) ?? undefined,
            actionConfig: task.actionConfig as object || { actions: [] }
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
      workflow
    });
  } catch (error) {
    console.error('Error creating RE workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
