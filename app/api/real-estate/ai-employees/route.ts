export const dynamic = "force-dynamic";

/**
 * Real Estate AI Employees API
 * List, manage, and execute RE AI employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RE_EMPLOYEE_CONFIGS, getAllREEmployeeTypes, isREEmployeeType } from '@/lib/ai-employees/real-estate';
import { aiOrchestrator } from '@/lib/ai-employee-orchestrator';
import { AIEmployeeType } from '@prisma/client';

/**
 * GET - List all Real Estate AI Employees for user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true }
    });

    // Only show RE employees to real estate users (or show all for demo)
    // TODO: Enforce industry check in production
    // if (user?.industry !== 'REAL_ESTATE') {
    //   return NextResponse.json({ error: 'Real estate features not enabled' }, { status: 403 });
    // }

    // Get all RE employee configs
    const reEmployeeTypes = getAllREEmployeeTypes();
    
    // Get user's active employees
    const activeEmployees = await prisma.aIEmployee.findMany({
      where: {
        userId: session.user.id,
        type: { in: reEmployeeTypes }
      }
    });

    // Merge configs with active status
    const employees = Object.entries(RE_EMPLOYEE_CONFIGS).map(([key, config]) => {
      const active = activeEmployees.find(e => e.type === key);
      return {
        type: key,
        name: config.name,
        description: config.description,
        capabilities: config.capabilities,
        voiceEnabled: config.voiceEnabled,
        defaultPriority: config.defaultPriority,
        estimatedDuration: config.estimatedDuration,
        triggers: config.triggers,
        isActive: !!active,
        employeeId: active?.id || null,
        lastJobAt: active?.updatedAt || null
      };
    });

    // Get recent executions
    const recentExecutions = await prisma.rEAIEmployeeExecution.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      employees,
      recentExecutions,
      stats: {
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        totalExecutions: recentExecutions.length
      }
    });

  } catch (error) {
    console.error('RE AI Employees GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI employees' },
      { status: 500 }
    );
  }
}

/**
 * POST - Activate/execute an AI Employee
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, employeeType, jobInput } = body;

    // Validate employee type
    if (!employeeType || !isREEmployeeType(employeeType as AIEmployeeType)) {
      return NextResponse.json(
        { error: 'Invalid employee type' },
        { status: 400 }
      );
    }

    const config = RE_EMPLOYEE_CONFIGS[employeeType];
    if (!config) {
      return NextResponse.json(
        { error: 'Employee configuration not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'activate': {
        // Activate/create the employee for this user
        const employee = await aiOrchestrator.ensureEmployee(
          session.user.id,
          employeeType as AIEmployeeType
        );
        return NextResponse.json({
          success: true,
          employee,
          message: `${config.name} is now active`
        });
      }

      case 'execute': {
        // Create a job for immediate execution
        if (!jobInput) {
          return NextResponse.json(
            { error: 'Job input required for execution' },
            { status: 400 }
          );
        }

        const job = await aiOrchestrator.createJob({
          userId: session.user.id,
          employeeType: employeeType as AIEmployeeType,
          jobType: `${employeeType.toLowerCase()}_manual`,
          input: { ...jobInput, userId: session.user.id },
          priority: config.defaultPriority as any,
          estimatedTime: config.estimatedDuration
        });

        return NextResponse.json({
          success: true,
          job,
          message: `Job created for ${config.name}`
        });
      }

      case 'deactivate': {
        // Deactivate the employee
        await prisma.aIEmployee.updateMany({
          where: {
            userId: session.user.id,
            type: employeeType as AIEmployeeType
          },
          data: { isActive: false }
        });

        return NextResponse.json({
          success: true,
          message: `${config.name} has been deactivated`
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: activate, execute, deactivate' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('RE AI Employees POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
