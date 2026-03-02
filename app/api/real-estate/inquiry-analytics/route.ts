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

function isVercelHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return host.toLowerCase().includes('.vercel.app');
}

function extractPropertyHints(payload: any): { propertyId?: string; mlsNumber?: string; address?: string } {
  if (!payload || typeof payload !== 'object') return {};
  const propertyId = typeof payload.propertyId === 'string' ? payload.propertyId : undefined;
  const mlsNumber = typeof payload.mlsNumber === 'string'
    ? payload.mlsNumber
    : typeof payload.listingMls === 'string'
      ? payload.listingMls
      : undefined;
  const address = typeof payload.propertyAddress === 'string'
    ? payload.propertyAddress
    : typeof payload.listingAddress === 'string'
      ? payload.listingAddress
      : typeof payload.address === 'string'
        ? payload.address
        : undefined;
  return { propertyId, mlsNumber, address };
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

    const websites = await getCrmDb(ctx).website.findMany({
      where: { userId: ctx.userId },
      select: { id: true, name: true, vercelDeploymentUrl: true, sourceUrl: true },
    });
    const websiteIds = websites.map((w) => w.id);

    const [
      allLeads,
      recentLeads,
      weekLeads,
      leadsBySource,
      leadsByStatus,
      properties,
      websiteVisitors,
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
        _count: { _all: true },
        orderBy: { _count: { source: 'desc' } },
      }),
      getCrmDb(ctx).lead.groupBy({
        by: ['status'],
        where: { userId: ctx.userId },
        _count: { _all: true },
      }),
      getCrmDb(ctx).rEProperty.findMany({
        where: { userId: ctx.userId },
        select: { id: true, address: true, listingStatus: true, listPrice: true, mlsNumber: true },
      }),
      websiteIds.length > 0
        ? getCrmDb(ctx).websiteVisitor.findMany({
            where: {
              websiteId: { in: websiteIds },
              createdAt: { gte: thirtyDaysAgo },
            },
            select: {
              websiteId: true,
              formData: true,
              interactions: true,
              pagesVisited: true,
              createdAt: true,
            },
          })
        : Promise.resolve([] as any[]),
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

    // Attribution: match website actions and leads to properties by propertyId/mls first, then address overlap.
    const propertyInquiryMap = new Map<string, number>();
    const propertyById = new Map<string, any>();
    const propertyByMls = new Map<string, any>();
    for (const prop of properties) propertyInquiryMap.set(prop.id, 0);
    for (const prop of properties) {
      propertyById.set(prop.id, prop);
      if (prop.mlsNumber) propertyByMls.set(prop.mlsNumber.toUpperCase(), prop);
    }

    const addInquiry = (hint: { propertyId?: string; mlsNumber?: string; address?: string }) => {
      if (hint.propertyId && propertyById.has(hint.propertyId)) {
        propertyInquiryMap.set(hint.propertyId, (propertyInquiryMap.get(hint.propertyId) || 0) + 1);
        return;
      }
      if (hint.mlsNumber) {
        const byMls = propertyByMls.get(hint.mlsNumber.toUpperCase());
        if (byMls) {
          propertyInquiryMap.set(byMls.id, (propertyInquiryMap.get(byMls.id) || 0) + 1);
          return;
        }
      }
      const normalizedAddress = normalizeAddress(hint.address);
      if (!normalizedAddress) return;
      const matched = properties.find((p) => {
        const propAddr = normalizeAddress(p.address);
        return propAddr && (normalizedAddress.includes(propAddr) || propAddr.includes(normalizedAddress));
      });
      if (matched) {
        propertyInquiryMap.set(matched.id, (propertyInquiryMap.get(matched.id) || 0) + 1);
      }
    };

    for (const visitor of websiteVisitors as any[]) {
      const formHint = extractPropertyHints(visitor.formData);
      addInquiry(formHint);

      const interactions = (visitor.interactions || {}) as Record<string, any>;
      for (const val of Object.values(interactions)) {
        if (!Array.isArray(val)) continue;
        for (const entry of val) {
          addInquiry(extractPropertyHints(entry));
        }
      }
    }

    for (const lead of recentLeads) {
      const enriched = (lead.enrichedData || {}) as any;
      addInquiry({
        ...extractPropertyHints(enriched),
        address:
          extractPropertyHints(enriched).address ||
          (lead.address || lead.businessName || undefined),
      });
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

    // Website-sourced leads and website form submissions.
    const websiteLeads = websites.map(w => ({
      websiteId: w.id,
      name: w.name,
      domain: (() => {
        const sourceHost = extractHost(w.sourceUrl);
        if (sourceHost) return sourceHost;
        const deployedHost = extractHost(w.vercelDeploymentUrl);
        return isVercelHost(deployedHost) ? null : deployedHost;
      })(),
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
      }).length + websiteVisitors.filter((v: any) => {
        if (v.websiteId !== w.id) return false;
        return !!v.formData || Array.isArray((v.interactions as any)?.form_submit) || Array.isArray((v.interactions as any)?.formSubmissions);
      }).length,
    }))
      .filter((w) => w.leadCount > 0)
      .sort((a, b) => b.leadCount - a.leadCount);

    // Source breakdown for pie chart
    const sources = leadsBySource.map(s => ({
      source: s.source || 'unknown',
      count: (s as any)._count?._all || 0,
    }));

    // Status breakdown
    const statuses = leadsByStatus.map(s => ({
      status: s.status,
      count: (s as any)._count?._all || 0,
    }));

    // Conversion rate (lead funnel conversion; deal win-rate is tracked separately)
    const convertedStatuses = ['QUALIFIED', 'CONVERTED'];
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
