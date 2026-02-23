import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { taskService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/templates/[id] - Get template details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const template = await (getCrmDb(ctx) as any).taskTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!template) {
      return apiErrors.notFound('Template not found');
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return apiErrors.internal(error.message || 'Failed to fetch template');
  }
}

// PUT /api/tasks/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json();

    // Verify ownership
    const existingTemplate = await (getCrmDb(ctx) as any).taskTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!existingTemplate) {
      return apiErrors.notFound('Template not found');
    }

    const template = await (getCrmDb(ctx) as any).taskTemplate.update({
      where: { id: params.id },
      data: {
        ...body,
        userId: ctx.userId, // Ensure ownership
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return apiErrors.internal(error.message || 'Failed to update template');
  }
}

// DELETE /api/tasks/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Verify ownership
    const existingTemplate = await (getCrmDb(ctx) as any).taskTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!existingTemplate) {
      return apiErrors.notFound('Template not found');
    }

    // Delete the template
    await (getCrmDb(ctx) as any).taskTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return apiErrors.internal(error.message || 'Failed to delete template');
  }
}

// POST /api/tasks/templates/[id]/use - Create task from template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const template = await (getCrmDb(ctx) as any).taskTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!template) {
      return apiErrors.notFound('Template not found');
    }

    const body = await request.json();
    const { leadId, dealId, customTitle, customDescription } = body;

    // Create task from template
    const task = await taskService.create(ctx, {
      title: customTitle || template.name,
      description: customDescription || template.description || '',
      priority: template.defaultPriority,
      status: 'TODO',
      category: template.category,
      estimatedHours: template.estimatedHours,
      tags: template.tags,
      leadId: leadId || null,
      dealId: dealId || null,
      aiContext: {
        createdFromTemplate: true,
        templateId: template.id,
        templateName: template.name,
      },
    } as any);

    // Create activity log
    await (getCrmDb(ctx) as any).taskActivity.create({
      data: {
        taskId: task.id,
        userId: ctx.userId,
        action: 'CREATED',
        newValue: `From template: ${template.name}`,
        metadata: {
          templateId: template.id,
          templateName: template.name,
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Error creating task from template:', error);
    return apiErrors.internal(error.message || 'Failed to create task from template');
  }
}
