export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REPeriodType, REReportType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const periodType = searchParams.get('periodType') as REPeriodType | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch market stats
    const marketStats = await prisma.rEMarketStats.findMany({
      where: {
        userId: session.user.id,
        ...(region && { region: { contains: region, mode: 'insensitive' } }),
        ...(periodType && { periodType }),
      },
      orderBy: { periodEnd: 'desc' },
      take: limit,
    });

    // Fetch market reports
    const marketReports = await prisma.rEMarketReport.findMany({
      where: {
        userId: session.user.id,
        ...(region && { region: { contains: region, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      stats: marketStats,
      reports: marketReports,
    });
  } catch (error) {
    console.error('Market Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (type === 'stats') {
      // Create market stats
      const {
        periodStart,
        periodEnd,
        periodType,
        region,
        city,
        state,
        country,
        medianSalePrice,
        avgSalePrice,
        domMedian,
        domAvg,
        newListings,
        closedSales,
        activeInventory,
        monthsOfSupply,
        listToSaleRatio,
        priceReductions,
        source,
      } = data;

      if (!periodStart || !periodEnd || !region) {
        return NextResponse.json(
          { error: 'Period start, end, and region required' },
          { status: 400 }
        );
      }

      const stats = await prisma.rEMarketStats.create({
        data: {
          userId: session.user.id,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          periodType: periodType || 'WEEKLY',
          region,
          city,
          state,
          country: country || 'US',
          medianSalePrice: medianSalePrice ? parseFloat(medianSalePrice) : null,
          avgSalePrice: avgSalePrice ? parseFloat(avgSalePrice) : null,
          domMedian: domMedian ? parseInt(domMedian) : null,
          domAvg: domAvg ? parseFloat(domAvg) : null,
          newListings: newListings ? parseInt(newListings) : null,
          closedSales: closedSales ? parseInt(closedSales) : null,
          activeInventory: activeInventory ? parseInt(activeInventory) : null,
          monthsOfSupply: monthsOfSupply ? parseFloat(monthsOfSupply) : null,
          listToSaleRatio: listToSaleRatio ? parseFloat(listToSaleRatio) : null,
          priceReductions: priceReductions ? parseInt(priceReductions) : null,
          source,
        },
      });

      return NextResponse.json({ stats, success: true });
    }

    if (type === 'report') {
      // Create market report
      const {
        reportType,
        region,
        title,
        summary,
        highlights,
        predictions,
        content,
        pdfUrl,
      } = data;

      if (!region || !title) {
        return NextResponse.json(
          { error: 'Region and title required' },
          { status: 400 }
        );
      }

      const report = await prisma.rEMarketReport.create({
        data: {
          userId: session.user.id,
          reportType: reportType || 'WEEKLY',
          region,
          title,
          summary,
          highlights: highlights || [],
          predictions: predictions || [],
          content,
          pdfUrl,
        },
      });

      return NextResponse.json({ report, success: true });
    }

    return NextResponse.json({ error: 'Invalid type. Use "stats" or "report"' }, { status: 400 });
  } catch (error) {
    console.error('Market Reports POST error:', error);
    return NextResponse.json({ error: 'Failed to create market data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, type, ...updateData } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type required' }, { status: 400 });
    }

    if (type === 'stats') {
      const existing = await prisma.rEMarketStats.findFirst({
        where: { id, userId: session.user.id },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Stats not found' }, { status: 404 });
      }

      const stats = await prisma.rEMarketStats.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ stats, success: true });
    }

    if (type === 'report') {
      const existing = await prisma.rEMarketReport.findFirst({
        where: { id, userId: session.user.id },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      const report = await prisma.rEMarketReport.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ report, success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Market Reports PUT error:', error);
    return NextResponse.json({ error: 'Failed to update market data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, message: 'RE feature initializing...' });
}
