
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tasks/templates/[id] - Get template details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.taskTemplate.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Verify ownership
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = await prisma.taskTemplate.update({
      where: { id: params.id },
      data: {
        ...body,
        userId: session.user.id, // Ensure ownership
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete the template
    await prisma.taskTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.taskTemplate.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    const { leadId, dealId, customTitle, customDescription } = body;

    // Create task from template
    const task = await prisma.task.create({
      data: {
        title: customTitle || template.name,
        description: customDescription || template.description || '',
        priority: template.defaultPriority,
        status: 'TODO',
        category: template.category,
        estimatedHours: template.estimatedHours,
        tags: template.tags,
        userId: session.user.id,
        leadId: leadId || null,
        dealId: dealId || null,
        aiContext: {
          createdFromTemplate: true,
          templateId: template.id,
          templateName: template.name,
        },
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Create activity log
    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        userId: session.user.id,
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
    return NextResponse.json(
      { error: error.message || 'Failed to create task from template' },
      { status: 500 }
    );
  }
}
