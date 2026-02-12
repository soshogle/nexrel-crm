/**
 * User AI Team API - CRUD for "Your AI Team" employees
 * GET: List user's AI Team employees
 * POST: Create new AI Team employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employees = await prisma.userAIEmployee.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        profession: e.profession,
        customName: e.customName,
        voiceAgentId: e.voiceAgentId,
        voiceConfig: e.voiceConfig,
        isActive: e.isActive,
        capabilities: e.capabilities,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[API] GET /api/ai-employees/user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI Team' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profession, customName, voiceAgentId, voiceConfig } = body;

    if (!profession || !customName) {
      return NextResponse.json(
        { error: 'profession and customName are required' },
        { status: 400 }
      );
    }

    const employee = await prisma.userAIEmployee.create({
      data: {
        userId: session.user.id,
        profession: String(profession),
        customName: String(customName),
        voiceAgentId: voiceAgentId || null,
        voiceConfig: voiceConfig && typeof voiceConfig === 'object' ? voiceConfig : null,
        isActive: true,
      },
    });

    return NextResponse.json({
      employee: {
        id: employee.id,
        profession: employee.profession,
        customName: employee.customName,
        voiceAgentId: employee.voiceAgentId,
        voiceConfig: employee.voiceConfig,
        isActive: employee.isActive,
        capabilities: employee.capabilities,
        createdAt: employee.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API] POST /api/ai-employees/user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create AI Team employee' },
      { status: 500 }
    );
  }
}
