/**
 * AI-Generated Reports API
 * GET - List user's generated reports
 * POST - Create a new report (from AI assistant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const reports = await prisma.aiGeneratedReport.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, reportType, content, period } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const report = await prisma.aiGeneratedReport.create({
      data: {
        userId: session.user.id,
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
    return NextResponse.json(
      { error: error.message || 'Failed to create report' },
      { status: 500 }
    );
  }
}
