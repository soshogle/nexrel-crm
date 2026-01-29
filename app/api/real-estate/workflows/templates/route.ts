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
  TASK_TYPE_LABELS 
} from '@/lib/real-estate/workflow-templates';

export const dynamic = 'force-dynamic';

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

    // Return templates with agent metadata
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
