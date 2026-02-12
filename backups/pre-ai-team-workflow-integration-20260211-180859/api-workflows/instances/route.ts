import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/workflows/instances - List user's workflow instances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    const instances = await prisma.aIWorkflowInstance.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            confidence: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, instances });
  } catch (error: any) {
    console.error('Error fetching workflow instances:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflow instances' },
      { status: 500 }
    );
  }
}

// POST /api/workflows/instances - Create workflow instance from template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, name, description, triggerType, triggerConfig } = body;

    if (!name || !triggerType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, triggerType' },
        { status: 400 }
      );
    }

    let definition: any = {};
    if (templateId) {
      const template = await prisma.aIWorkflowTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      definition = template.workflowDefinition;
    }

    const instance = await prisma.aIWorkflowInstance.create({
      data: {
        userId: session.user.id,
        templateId: templateId || undefined,
        name,
        description,
        definition,
        triggerType,
        triggerConfig: triggerConfig || {},
        status: 'DRAFT',
      },
      include: {
        template: true,
      },
    });

    return NextResponse.json({ success: true, instance });
  } catch (error: any) {
    console.error('Error creating workflow instance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workflow instance' },
      { status: 500 }
    );
  }
}
