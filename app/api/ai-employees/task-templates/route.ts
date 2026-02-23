/**
 * Task templates API - Phase 2
 * GET: Fetch templates for an employee
 * PATCH: Update template (smsTemplate, emailSubject, emailBody)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { Industry } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as 'industry' | 're' | 'professional';
    const employeeType = searchParams.get('employeeType');
    const industry = searchParams.get('industry') as Industry | null;
    const taskKey = searchParams.get('taskKey');

    if (!source || !employeeType) return apiErrors.badRequest('source and employeeType required');

    const where: any = {
      userId: session.user.id,
      source,
      employeeType,
      industry: source === 'industry' ? industry : null,
    };
    if (taskKey) where.taskKey = taskKey;

    const templates = await (prisma as any).aIEmployeeTaskTemplate.findMany({
      where,
    });

    return NextResponse.json({ success: true, templates });
  } catch (e: any) {
    console.error('[task-templates GET]', e);
    return apiErrors.internal(e?.message || 'Failed to fetch templates');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const { source, employeeType, industry, taskKey, smsTemplate, emailSubject, emailBody } = body;

    if (!source || !employeeType || !taskKey) {
      return apiErrors.badRequest('source, employeeType, and taskKey required');
    }

    const industryVal = source === 'industry' ? industry : null;

    // Prisma compound unique with nullable industry rejects null in upsert where.
    // Use findFirst + update/create instead.
    const existing = await (prisma as any).aIEmployeeTaskTemplate.findFirst({
      where: {
        userId: session.user.id,
        source,
        industry: industryVal,
        employeeType,
        taskKey,
      },
    });

    let template;
    if (existing) {
      template = await (prisma as any).aIEmployeeTaskTemplate.update({
        where: { id: existing.id },
        data: {
          ...(smsTemplate !== undefined && { smsTemplate: smsTemplate || null }),
          ...(emailSubject !== undefined && { emailSubject: emailSubject || null }),
          ...(emailBody !== undefined && { emailBody: emailBody || null }),
        },
      });
    } else {
      template = await (prisma as any).aIEmployeeTaskTemplate.create({
        data: {
          userId: session.user.id,
          source,
          industry: industryVal,
          employeeType,
          taskKey,
          smsTemplate: smsTemplate ?? null,
          emailSubject: emailSubject ?? null,
          emailBody: emailBody ?? null,
        },
      });
    }

    return NextResponse.json({ success: true, template });
  } catch (e: any) {
    console.error('[task-templates PATCH]', e);
    return apiErrors.internal(e?.message || 'Failed to update template');
  }
}
