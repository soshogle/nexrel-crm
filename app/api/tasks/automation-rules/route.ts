
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tasks/automation-rules - Get automation rules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.taskAutomation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/automation-rules - Create automation rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      triggerType,
      triggerConditions,
      actionType,
      actionConfig,
      isActive = true,
    } = body;

    if (!name || !triggerType || !actionType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, triggerType, actionType' },
        { status: 400 }
      );
    }

    const rule = await prisma.taskAutomation.create({
      data: {
        userId: session.user.id,
        name,
        description,
        isActive,
        triggerType,
        triggerConditions: triggerConditions || {},
        actionType,
        actionConfig: actionConfig || {},
      },
    });

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error('Error creating automation rule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create rule' },
      { status: 500 }
    );
  }
}
