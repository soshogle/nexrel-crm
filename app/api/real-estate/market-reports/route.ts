export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REReportType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as REReportType | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const reports = await prisma.rEMarketReport.findMany({
      where: {
        userId: session.user.id,
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Market Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      region,
      periodStart,
      periodEnd,
      executiveSummary,
      keyHighlights,
      buyerInsights,
      sellerInsights,
      predictions,
      socialCaption,
    } = body;

    if (!type || !title || !region || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Type, title, region, periodStart, and periodEnd are required' },
        { status: 400 }
      );
    }

    const report = await prisma.rEMarketReport.create({
      data: {
        userId: session.user.id,
        type: type as REReportType,
        title,
        region,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        executiveSummary,
        keyHighlights: keyHighlights || [],
        buyerInsights,
        sellerInsights,
        predictions: predictions || {},
        socialCaption,
      },
    });

    return NextResponse.json({ report, success: true });
  } catch (error) {
    console.error('Market Reports POST error:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const existing = await prisma.rEMarketReport.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const report = await prisma.rEMarketReport.update({
      where: { id },
      data: {
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.executiveSummary && { executiveSummary: updateData.executiveSummary }),
        ...(updateData.keyHighlights && { keyHighlights: updateData.keyHighlights }),
        ...(updateData.predictions && { predictions: updateData.predictions }),
        ...(updateData.pdfUrl && { pdfUrl: updateData.pdfUrl }),
      },
    });

    return NextResponse.json({ report, success: true });
  } catch (error) {
    console.error('Market Reports PUT error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
    }

    const existing = await prisma.rEMarketReport.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    await prisma.rEMarketReport.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Market Reports DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}