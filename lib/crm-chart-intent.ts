/**
 * Shared logic for parsing chart intent and fetching dynamic chart data
 * Used by CRM voice agent and AI assistant
 */

import { prisma } from '@/lib/db';

export function parseChartIntent(text: string): { chartType: 'pie' | 'bar' | 'line'; dimension: string } | null {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase();
  const isPie = /\b(pie|pie chart)\b/.test(t);
  const isBar = /\b(bar|bar chart)\b/.test(t);
  const isLine = /\b(line|trend|over time|monthly)\b/.test(t);
  const chartType = isPie ? 'pie' : isBar ? 'bar' : isLine ? 'line' : 'pie';

  if (/\b(lead|contact)s?\b.*\b(by |per )?(status|stage)\b/.test(t) || /\b(lead|contact)\s+(status|by status)\b/.test(t)) {
    return { chartType, dimension: 'leads_by_status' };
  }
  if (/\b(lead|contact)s?\b.*\b(by |per )?source\b/.test(t) || /\bleads?\s+by\s+source\b/.test(t)) {
    return { chartType, dimension: 'leads_by_source' };
  }
  if (/\b(deal|pipeline)s?\b.*\b(by |per )?(stage|status)\b/.test(t) || /\bdeals?\s+by\s+stage\b/.test(t)) {
    return { chartType, dimension: 'deals_by_stage' };
  }
  if (/\b(revenue|value)\s+(by|per)\s+(stage|deal)\b/.test(t) || /\bdeal\s+value\s+by\s+stage\b/.test(t)) {
    return { chartType, dimension: 'revenue_by_stage' };
  }
  if (/\b(revenue|sales)\b.*\b(month|trend|over time)\b/.test(t) || /\bmonthly\s+revenue\b/.test(t)) {
    return { chartType: 'line', dimension: 'revenue_by_month' };
  }
  if (/\b(lead|contact|status)\b/.test(t)) {
    return { chartType, dimension: 'leads_by_status' };
  }
  if (/\b(deal|pipeline|stage)\b/.test(t)) {
    return { chartType, dimension: 'deals_by_stage' };
  }
  return null;
}

export async function getDynamicChartData(userId: string, dimension: string): Promise<{ name: string; value: number }[]> {
  switch (dimension) {
    case 'leads_by_status': {
      const groups = await prisma.lead.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      });
      return groups.map(g => ({ name: String(g.status), value: g._count.id }));
    }
    case 'leads_by_source': {
      const groups = await prisma.lead.groupBy({
        by: ['source'],
        where: { userId },
        _count: { id: true },
      });
      return groups.map(g => ({ name: g.source || 'Unknown', value: g._count.id }));
    }
    case 'deals_by_stage': {
      const deals = await prisma.deal.findMany({
        where: { userId },
        select: { stageId: true, stage: { select: { name: true } } },
      });
      const byStage: Record<string, number> = {};
      deals.forEach(d => {
        const name = d.stage?.name || 'Unknown';
        byStage[name] = (byStage[name] || 0) + 1;
      });
      return Object.entries(byStage).map(([name, value]) => ({ name, value }));
    }
    case 'revenue_by_stage': {
      const deals = await prisma.deal.findMany({
        where: { userId },
        select: { value: true, stage: { select: { name: true } } },
      });
      const byStage: Record<string, number> = {};
      deals.forEach(d => {
        const name = d.stage?.name || 'Unknown';
        byStage[name] = (byStage[name] || 0) + (d.value || 0);
      });
      return Object.entries(byStage).map(([name, value]) => ({ name, value }));
    }
    default:
      return [];
  }
}
