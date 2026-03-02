/**
 * AI-Generated Reports API
 * GET - List user's generated reports
 * POST - Create a new report (from AI assistant)
 * Uses industry DB when user has industry set (same as createReport).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = getCrmDb(ctx);
    const reports = await db.aiGeneratedReport.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return apiErrors.internal(error.message || 'Failed to fetch reports');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await req.json();
    const { title, reportType, content, period } = body;

    if (!title || !content) {
      return apiErrors.badRequest('Title and content are required');
    }

    const db = getCrmDb(ctx);
    const report = await db.aiGeneratedReport.create({
      data: {
        userId: ctx.userId,
        title,
        reportType: reportType || 'custom',
        content,
        period: period || null,
      },
    });

    return NextResponse.json({
      message: 'Report created successfully',
      report: {
        id: report.id,
        title: report.title,
        reportType: report.reportType,
        createdAt: report.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    return apiErrors.internal(error.message || 'Failed to create report');
  }
}
