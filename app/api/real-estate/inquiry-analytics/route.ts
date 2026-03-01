import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

function normalizeAddress(v: string | null | undefined): string {
  return (v || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProtocol).host;
  } catch {
    return url;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
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
      leadService.count(ctx),
      leadService.findMany(ctx, {
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true, businessName: true, contactPerson: true, email: true,
          phone: true, source: true, status: true, tags: true, address: true,
          enrichedData: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      leadService.count(ctx, { createdAt: { gte: sevenDaysAgo } }),
      getCrmDb(ctx).lead.groupBy({
        by: ['source'],
        where: { userId: ctx.userId },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
      getCrmDb(ctx).lead.groupBy({
        by: ['status'],
        where: { userId: ctx.userId },
        _count: true,
      }),
      getCrmDb(ctx).website.findMany({
        where: { userId: ctx.userId },
        select: { id: true, name: true, vercelDeploymentUrl: true, sourceUrl: true },
      }),
      getCrmDb(ctx).rEProperty.findMany({
        where: { userId: ctx.userId },
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

    // Attribution: match leads to properties by explicit propertyId first, then address overlap.
    const propertyInquiryMap = new Map<string, number>();
    for (const prop of properties) propertyInquiryMap.set(prop.id, 0);

    for (const lead of recentLeads) {
      const enriched = (lead.enrichedData || {}) as any;
      const explicitPropertyId = typeof enriched.propertyId === 'string' ? enriched.propertyId : null;

      if (explicitPropertyId && propertyInquiryMap.has(explicitPropertyId)) {
        propertyInquiryMap.set(explicitPropertyId, (propertyInquiryMap.get(explicitPropertyId) || 0) + 1);
        continue;
      }

      const leadAddr = normalizeAddress(
        typeof enriched.propertyAddress === 'string'
          ? enriched.propertyAddress
          : lead.address || lead.businessName || null
      );
      if (!leadAddr) continue;

      const matched = properties.find((p) => {
        const propAddr = normalizeAddress(p.address);
        return propAddr && (leadAddr.includes(propAddr) || propAddr.includes(leadAddr));
      });
      if (matched) {
        propertyInquiryMap.set(matched.id, (propertyInquiryMap.get(matched.id) || 0) + 1);
      }
    }

    const propertyInquiries: Array<{
      propertyId: string;
      address: string;
      status: string;
      price: number | null;
      inquiryCount: number;
    }> = [];
    for (const prop of properties) {
      propertyInquiries.push({
        propertyId: prop.id,
        address: prop.address || 'Unknown',
        status: prop.listingStatus || 'UNKNOWN',
        price: prop.listPrice ? Number(prop.listPrice) : null,
        inquiryCount: propertyInquiryMap.get(prop.id) || 0,
      });
    }
    propertyInquiries.sort((a, b) => b.inquiryCount - a.inquiryCount);

    // Website-sourced leads: attribute via enrichedData.websiteId first, then source/url/domain matches.
    const websiteLeads = websites.map(w => ({
      websiteId: w.id,
      name: w.name,
      domain: extractHost(w.vercelDeploymentUrl || w.sourceUrl),
      leadCount: recentLeads.filter((l) => {
        const enriched = (l.enrichedData || {}) as any;
        if (enriched.websiteId === w.id) return true;

        const source = (l.source || '').toLowerCase();
        const domain = extractHost(w.vercelDeploymentUrl || w.sourceUrl)?.toLowerCase() || '';
        const websiteName = (w.name || '').toLowerCase();
        return (
          source.includes('website') &&
          (
            source.includes(w.id.toLowerCase()) ||
            (!!domain && source.includes(domain)) ||
            (!!websiteName && source.includes(websiteName))
          )
        );
      }).length,
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
    return apiErrors.internal('Failed to fetch inquiry analytics');
  }
}
