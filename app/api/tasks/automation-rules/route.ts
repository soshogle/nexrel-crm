
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/automation-rules - Get automation rules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const rules = await prisma.taskAutomation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Error fetching automation rules:', error);
    return apiErrors.internal(error.message || 'Failed to fetch rules');
  }
}

// POST /api/tasks/automation-rules - Create automation rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Missing required fields: name, triggerType, actionType');
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
    return apiErrors.internal(error.message || 'Failed to create rule');
  }
}
