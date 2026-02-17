/**
 * AI Employee Auto-Run Settings API
 * GET: Fetch auto-run settings for all employees (or filtered)
 * PATCH: Update auto-run for a specific employee type
 * When enabling Auto-Run for RE_SPEED_TO_LEAD: creates default workflow if none exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';
import {
  createDefaultSpeedToLeadWorkflow,
  hasSpeedToLeadWorkflow,
} from '@/lib/real-estate/speed-to-lead-workflow';
import {
  createDefaultIndustryContactWorkflow,
  hasIndustryContactWorkflow,
} from '@/lib/industry-workflows/default-contact-workflow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch auto-run settings (optionally filtered by industry for industry employees)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry') as Industry | null;

    const settings = await prisma.aIEmployeeAutoRun.findMany({
      where: {
        userId: session.user.id,
        ...(industry ? { industry } : {}),
      },
    });

    // Return as map for easy lookup: RE uses employeeType; industry uses employeeType:industry
    const map: Record<string, boolean> = {};
    for (const s of settings) {
      const key = s.industry === 'REAL_ESTATE' ? s.employeeType : (s.industry ? `${s.employeeType}:${s.industry}` : s.employeeType);
      map[key] = s.autoRunEnabled;
    }

    return NextResponse.json({ settings: map, raw: settings });
  } catch (error) {
    console.error('Error fetching AI employee auto-run settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH - Update auto-run for a specific employee
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeType, industry, autoRunEnabled } = body as {
      employeeType: string;
      industry?: Industry | null;
      autoRunEnabled: boolean;
    };

    if (!employeeType || typeof autoRunEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'employeeType and autoRunEnabled (boolean) required' },
        { status: 400 }
      );
    }

    // RE employee types (RE_*) use industry REAL_ESTATE; others use provided industry
    const resolvedIndustry = industry ?? (employeeType.startsWith('RE_') ? 'REAL_ESTATE' : null);

    const record = await prisma.aIEmployeeAutoRun.upsert({
      where: {
        userId_employeeType_industry: {
          userId: session.user.id,
          employeeType,
          industry: resolvedIndustry,
        },
      },
      create: {
        userId: session.user.id,
        employeeType,
        industry: resolvedIndustry,
        autoRunEnabled,
      },
      update: { autoRunEnabled },
    });

    // When enabling Auto-Run: create default workflow if none exists
    let createdWorkflowId: string | null = null;

    // RE_SPEED_TO_LEAD
    if (
      autoRunEnabled &&
      employeeType === 'RE_SPEED_TO_LEAD' &&
      (resolvedIndustry === 'REAL_ESTATE' || !resolvedIndustry)
    ) {
      const hasWorkflow = await hasSpeedToLeadWorkflow(session.user.id);
      if (!hasWorkflow) {
        const workflow = await createDefaultSpeedToLeadWorkflow(session.user.id);
        createdWorkflowId = workflow.id;
        await prisma.aIEmployeeAutoRun.update({
          where: { id: record.id },
          data: { workflowId: workflow.id },
        });
      } else {
        const existing = await prisma.rEWorkflowTask.findFirst({
          where: {
            template: { userId: session.user.id },
            assignedAgentType: 'RE_SPEED_TO_LEAD',
          },
          select: { templateId: true },
        });
        if (existing) {
          await prisma.aIEmployeeAutoRun.update({
            where: { id: record.id },
            data: { workflowId: existing.templateId },
          });
        }
      }
    }

    // Industry employees (DENTIST, MEDICAL, etc.)
    if (
      autoRunEnabled &&
      resolvedIndustry &&
      resolvedIndustry !== 'REAL_ESTATE'
    ) {
      const hasWorkflow = await hasIndustryContactWorkflow(
        session.user.id,
        resolvedIndustry,
        employeeType
      );
      if (!hasWorkflow) {
        const workflow = await createDefaultIndustryContactWorkflow(
          session.user.id,
          resolvedIndustry,
          employeeType
        );
        createdWorkflowId = workflow.id;
        await prisma.aIEmployeeAutoRun.update({
          where: { id: record.id },
          data: { workflowId: workflow.id },
        });
      } else {
        const existing = await prisma.workflowTask.findFirst({
          where: {
            template: {
              userId: session.user.id,
              industry: resolvedIndustry,
              isActive: true,
            },
            assignedAgentType: employeeType,
          },
          select: { templateId: true },
        });
        if (existing) {
          await prisma.aIEmployeeAutoRun.update({
            where: { id: record.id },
            data: { workflowId: existing.templateId },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      setting: record,
      createdWorkflowId,
    });
  } catch (error) {
    console.error('Error updating AI employee auto-run:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}
