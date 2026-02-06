/**
 * Real Estate Workflow Templates API
 * Get default workflow templates (Buyer/Seller pipelines)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { 
  DEFAULT_WORKFLOW_TEMPLATES, 
  RE_AGENT_NAMES, 
  RE_AGENT_COLORS,
  TASK_TYPE_LABELS,
  getWorkflowTemplateByType
} from '@/lib/real-estate/workflow-templates';
import { REWorkflowType } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get default workflow templates
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

    // Check if a specific type is requested
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    if (typeParam === 'BUYER_PIPELINE' || typeParam === 'SELLER_PIPELINE') {
      // Map BUYER_PIPELINE -> BUYER, SELLER_PIPELINE -> SELLER
      const templateType: REWorkflowType = typeParam === 'BUYER_PIPELINE' ? 'BUYER' : 'SELLER';
      const baseTemplate = getWorkflowTemplateByType(templateType);

      if (!baseTemplate) {
        return NextResponse.json(
          { error: `Template not found for type: ${typeParam}` },
          { status: 404 }
        );
      }

      // Transform template to match WorkflowTemplate interface
      const template = {
        id: `template-${templateType.toLowerCase()}`,
        name: baseTemplate.name,
        description: baseTemplate.description || '',
        workflowType: typeParam as 'BUYER_PIPELINE' | 'SELLER_PIPELINE',
        tasks: baseTemplate.tasks.map((task, index) => ({
          id: `task-${Date.now()}-${index}`,
          name: task.name,
          description: task.description || '',
          taskType: task.taskType,
          assignedAgentId: null,
          assignedAgentName: task.assignedAgentType ? RE_AGENT_NAMES[task.assignedAgentType] : null,
          agentColor: task.assignedAgentType ? RE_AGENT_COLORS[task.assignedAgentType]?.bg?.replace('/20', '') || '#6B7280' : '#6B7280',
          displayOrder: task.displayOrder || index + 1,
          isHITL: task.isHITL || false,
          delayMinutes: task.delayValue || 0,
          delayUnit: task.delayUnit || 'MINUTES',
          angle: task.position?.angle || (360 / baseTemplate.tasks.length) * index,
          radius: task.position?.radius || 0.7,
          parentTaskId: null,
          branchCondition: null,
        })),
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        template,
      });
    }

    // Return all templates with agent metadata (for gallery)
    const templates = DEFAULT_WORKFLOW_TEMPLATES.map(template => ({
      ...template,
      tasks: template.tasks.map(task => ({
        ...task,
        agentName: task.assignedAgentType ? RE_AGENT_NAMES[task.assignedAgentType] : null,
        agentColors: task.assignedAgentType ? RE_AGENT_COLORS[task.assignedAgentType] : null,
        taskTypeLabel: TASK_TYPE_LABELS[task.taskType]
      }))
    }));

    return NextResponse.json({
      success: true,
      templates,
      metadata: {
        agentNames: RE_AGENT_NAMES,
        agentColors: RE_AGENT_COLORS,
        taskTypeLabels: TASK_TYPE_LABELS
      }
    });
  } catch (error) {
    console.error('Error fetching default templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
