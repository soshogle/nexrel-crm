import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      allLeads,
      recentLeads,
      weekLeads,
      leadsBySource,
      leadsByStatus,
      websites,
      properties,
    ] = await Promise.all([
      prisma.lead.count({ where: { userId } }),
      prisma.lead.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true, businessName: true, contactPerson: true, email: true,
          phone: true, source: true, status: true, tags: true, address: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.lead.groupBy({
        by: ['source'],
        where: { userId },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      prisma.website.findMany({
        where: { userId },
        select: { id: true, name: true, vercelDeploymentUrl: true },
      }),
      prisma.rEProperty.findMany({
        where: { userId },
        select: { id: true, address: true, listingStatus: true, listPrice: true },
      }),
    ]);

    // Compute leads-per-day for the last 30 days
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      dailyCounts[d.toISOString().split('T')[0]] = 0;
    }
    for (const lead of recentLeads) {
      const day = new Date(lead.createdAt).toISOString().split('T')[0];
      if (dailyCounts[day] !== undefined) dailyCounts[day]++;
    }

    const dailyTrend = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Attribution: match leads to properties by address overlap
    const propertyInquiries: Array<{
      propertyId: string;
      address: string;
      status: string;
      price: number | null;
      inquiryCount: number;
    }> = [];
    for (const prop of properties) {
      const addr = (prop.address || '').toLowerCase();
      if (!addr) continue;
      const count = recentLeads.filter(l => {
        const leadAddr = (l.address || l.businessName || '').toLowerCase();
        const tags = Array.isArray(l.tags) ? l.tags : [];
        const tagStr = tags.join(' ').toLowerCase();
        return leadAddr.includes(addr) || addr.includes(leadAddr) || tagStr.includes(addr);
      }).length;
      propertyInquiries.push({
        propertyId: prop.id,
        address: prop.address || 'Unknown',
        status: prop.listingStatus || 'UNKNOWN',
        price: prop.listPrice ? Number(prop.listPrice) : null,
        inquiryCount: count,
      });
    }
    propertyInquiries.sort((a, b) => b.inquiryCount - a.inquiryCount);

    // Website-sourced leads
    const websiteLeads = websites.map(w => ({
      websiteId: w.id,
      name: w.name,
      domain: w.vercelDeploymentUrl || null,
      leadCount: recentLeads.filter(l =>
        l.source.includes(w.id) || l.source.includes(w.vercelDeploymentUrl || '') || l.source === 'website-inquiry'
      ).length,
    })).sort((a, b) => b.leadCount - a.leadCount);

    // Source breakdown for pie chart
    const sources = leadsBySource.map(s => ({
      source: s.source || 'unknown',
      count: s._count,
    }));

    // Status breakdown
    const statuses = leadsByStatus.map(s => ({
      status: s.status,
      count: s._count,
    }));

    // Conversion rate (leads that became QUALIFIED or further)
    const convertedStatuses = ['QUALIFIED', 'CONVERTED', 'WON'];
    const convertedCount = statuses
      .filter(s => convertedStatuses.includes(s.status))
      .reduce((sum, s) => sum + s.count, 0);
    const conversionRate = allLeads > 0 ? Math.round((convertedCount / allLeads) * 100) : 0;

    return NextResponse.json({
      totalLeads: allLeads,
      last30Days: recentLeads.length,
      last7Days: weekLeads,
      conversionRate,
      dailyTrend,
      sources,
      statuses,
      propertyInquiries: propertyInquiries.slice(0, 20),
      websiteLeads,
      recentLeads: recentLeads.slice(0, 15),
    });
  } catch (error: any) {
    console.error('[Inquiry Analytics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiry analytics' }, { status: 500 });
  }
}
