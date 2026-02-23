/**
 * Generic Multi-Industry Workflow Templates API
 * Get industry-specific workflow templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get industry-specific workflow templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get user's industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true }
    });

    if (!user?.industry || user.industry === 'REAL_ESTATE') {
      return apiErrors.forbidden('This feature is not available for this industry');
    }

    const industryConfig = getIndustryConfig(user.industry);
    if (!industryConfig) {
      return apiErrors.forbidden('Workflow system not configured for this industry');
    }

    // Check if a specific template ID is requested
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (templateId) {
      // Return specific template
      const template = industryConfig.templates.find(t => t.id === templateId);
      if (!template) {
        return apiErrors.notFound('Template not found');
      }

      // Transform template to match WorkflowTemplate interface
      const transformedTemplate = {
        id: template.id,
        name: template.name,
        description: template.description,
        workflowType: template.workflowType,
        industry: user.industry,
        tasks: template.tasks.map((task, index) => ({
          id: `task-${Date.now()}-${index}`,
          name: task.name,
          description: task.description || '',
          taskType: task.taskType,
          assignedAgentId: null,
          assignedAgentName: task.agentName || null,
          agentColor: industryConfig.aiAgents.find(a => a.name === task.agentName)?.color || '#6B7280',
          displayOrder: task.displayOrder || index + 1,
          isHITL: task.isHITL || false,
          delayMinutes: task.delayValue || 0,
          delayUnit: task.delayUnit || 'MINUTES',
          parentTaskId: null,
          branchCondition: null,
        })),
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        template: transformedTemplate,
      });
    }

    // Return all templates with transformed structure for WorkflowTemplatesBrowser
    const templates = industryConfig.templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      workflowType: template.workflowType,
      category: 'automation', // Default category
      tags: [template.workflowType.toLowerCase().replace(/_/g, '-'), 'automation'],
      icon: '⚡', // Default icon
      estimatedDuration: `${template.tasks.length * 5} minutes`,
      difficulty: template.tasks.length > 5 ? 'advanced' : template.tasks.length > 3 ? 'intermediate' : 'beginner',
      variables: [],
      actions: template.tasks.map(task => ({
        type: task.taskType,
        name: task.name,
        description: task.description,
      })),
      taskCount: template.tasks.length,
      hitlGates: template.tasks.filter(t => t.isHITL).length,
      agentsAssigned: new Set(
        template.tasks
          .map(t => t.agentName)
          .filter(Boolean)
      ).size,
    }));

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return apiErrors.internal('Failed to fetch templates');
  }
}
