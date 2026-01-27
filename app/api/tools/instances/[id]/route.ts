import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tools/instances/[id] - Get tool instance details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instance = await prisma.toolInstance.findUnique({
      where: { id: params.id },
      include: {
        definition: true,
        actions: {
          orderBy: { executedAt: 'desc' },
          take: 10, // Last 10 actions
        },
      },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'Tool instance not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (instance.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sanitize credentials
    const sanitized = {
      ...instance,
      credentials: { configured: true },
    };

    return NextResponse.json({ success: true, instance: sanitized });
  } catch (error: any) {
    console.error('Error fetching tool instance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tool instance' },
      { status: 500 }
    );
  }
}

// PATCH /api/tools/instances/[id] - Update tool instance
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, status, config } = body;

    // Verify ownership
    const existing = await prisma.toolInstance.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Tool instance not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.toolInstance.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(status && { status }),
        ...(config && { config }),
      },
      include: {
        definition: true,
      },
    });

    return NextResponse.json({
      success: true,
      instance: {
        ...updated,
        credentials: { configured: true },
      },
    });
  } catch (error: any) {
    console.error('Error updating tool instance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tool instance' },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/instances/[id] - Uninstall a tool
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
    const instance = await prisma.toolInstance.findUnique({
      where: { id: params.id },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'Tool instance not found' },
        { status: 404 }
      );
    }

    if (instance.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete all associated actions first
    await prisma.toolAction.deleteMany({
      where: { instanceId: params.id },
    });

    // Delete the instance
    await prisma.toolInstance.delete({
      where: { id: params.id },
    });

    // Decrement install count
    await prisma.toolDefinition.update({
      where: { id: instance.definitionId },
      data: { installCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tool instance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tool instance' },
      { status: 500 }
    );
  }
}
