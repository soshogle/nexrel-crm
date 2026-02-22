/**
 * "What if" scenario predictor for CRM
 * Parses natural language requests and projects impact based on assumptions
 */

import { createDalContext } from '@/lib/context/industry-context';
import { leadService, getCrmDb } from '@/lib/dal';

export interface ScenarioResult {
  scenario: string;
  assumption: string;
  currentValue: number;
  projectedValue: number;
  impact: number; // delta
  impactPercent?: number;
  unit: 'revenue' | 'deals' | 'leads' | 'conversion_rate';
  formula: string;
  confidence: number;
}

/**
 * Parse "what if" scenario from user/agent message
 */
export function parseScenarioIntent(text: string): { type: string; params: Record<string, number> } | null {
  if (!text || typeof text !== 'string') return null;
  const t = text.toLowerCase();

  // Must have "what if" or similar
  if (!/\b(what if|what would happen if|predict|project|simulate|if i)\b/.test(t)) {
    return null;
  }

  // "What if I convert X more leads" or "convert X more"
  const convertMatch = t.match(/(?:convert|close|win)\s+(?:(\d+)\s+)?(?:more\s+)?(?:lead|deal)s?/);
  if (convertMatch) {
    const count = parseInt(convertMatch[1] || '10', 10) || 10;
    return { type: 'additional_conversions', params: { count } };
  }

  // "What if I get X more leads" or "50 more leads" or "got 20 more"
  const leadsMatch = t.match(/(?:get|got|add|generate)\s+(\d+)\s+more\s+leads?/);
  if (leadsMatch) {
    return { type: 'additional_leads', params: { count: parseInt(leadsMatch[1], 10) } };
  }

  // "What if conversion rate improved by X%" or "5% better conversion"
  const conversionMatch = t.match(/(?:conversion|close)\s+rate\s+(?:improved|increased|went up)\s+by\s+(\d+)\s*%?/);
  if (conversionMatch) {
    return { type: 'conversion_rate_improvement', params: { percent: parseInt(conversionMatch[1], 10) } };
  }

  // "What if my average deal size increased by $X"
  const dealSizeMatch = t.match(/(?:average\s+)?deal\s+(?:size|value)\s+(?:increased|went up)\s+by\s+\$?(\d+)/);
  if (dealSizeMatch) {
    return { type: 'deal_size_increase', params: { amount: parseInt(dealSizeMatch[1], 10) } };
  }

  // "What if I closed 10 more deals"
  const closeMatch = t.match(/closed?\s+(\d+)\s+more\s+deals?/);
  if (closeMatch) {
    return { type: 'additional_conversions', params: { count: parseInt(closeMatch[1], 10) } };
  }

  // Generic: "what if" + number - try to infer
  const numMatch = t.match(/(\d+)\s+more\s+(lead|deal)s?/);
  if (numMatch) {
    const count = parseInt(numMatch[1], 10);
    const entity = numMatch[2];
    return entity === 'lead'
      ? { type: 'additional_leads', params: { count } }
      : { type: 'additional_conversions', params: { count } };
  }

  return null;
}

/**
 * Calculate scenario impact based on current CRM data
 */
export async function calculateScenario(
  userId: string,
  scenarioType: string,
  params: Record<string, number>
): Promise<ScenarioResult | null> {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const [leads, deals, openDeals] = await Promise.all([
    leadService.count(ctx),
    db.deal.findMany({
      where: { userId },
      select: { value: true, actualCloseDate: true },
    }),
    db.deal.findMany({
      where: { userId, actualCloseDate: null },
      select: { value: true },
    }),
  ]);

  const closedDeals = deals.filter((d) => d.actualCloseDate);
  const totalRevenue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const avgDealValue = closedDeals.length > 0 ? totalRevenue / closedDeals.length : 5000;
  const conversionRate = leads > 0 ? (deals.length / leads) * 100 : 10;
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  switch (scenarioType) {
    case 'additional_conversions': {
      const count = params.count || 10;
      const projectedRevenue = count * avgDealValue;
      return {
        scenario: `Convert ${count} more leads`,
        assumption: `Using your average deal value of $${avgDealValue.toLocaleString()}`,
        currentValue: totalRevenue,
        projectedValue: totalRevenue + projectedRevenue,
        impact: projectedRevenue,
        impactPercent: totalRevenue > 0 ? (projectedRevenue / totalRevenue) * 100 : 100,
        unit: 'revenue',
        formula: `${count} deals × $${avgDealValue.toLocaleString()} avg = $${projectedRevenue.toLocaleString()}`,
        confidence: 75,
      };
    }

    case 'additional_leads': {
      const count = params.count || 50;
      const expectedDeals = Math.round(count * (conversionRate / 100));
      const projectedRevenue = expectedDeals * avgDealValue;
      return {
        scenario: `Get ${count} more leads`,
        assumption: `At your current ${conversionRate.toFixed(1)}% conversion rate → ~${expectedDeals} new deals`,
        currentValue: leads,
        projectedValue: leads + count,
        impact: projectedRevenue,
        unit: 'leads',
        formula: `${count} leads × ${conversionRate.toFixed(1)}% conversion × $${avgDealValue.toLocaleString()} avg = $${projectedRevenue.toLocaleString()} potential`,
        confidence: 65,
      };
    }

    case 'conversion_rate_improvement': {
      const percentImprovement = params.percent || 5;
      const newRate = conversionRate + percentImprovement;
      const expectedExtraDeals = Math.round(leads * (percentImprovement / 100));
      const projectedRevenue = expectedExtraDeals * avgDealValue;
      return {
        scenario: `Conversion rate improves by ${percentImprovement}%`,
        assumption: `From ${conversionRate.toFixed(1)}% to ${newRate.toFixed(1)}% on your ${leads} leads`,
        currentValue: conversionRate,
        projectedValue: newRate,
        impact: projectedRevenue,
        unit: 'conversion_rate',
        formula: `${leads} leads × ${percentImprovement}% more = ~${expectedExtraDeals} extra deals × $${avgDealValue.toLocaleString()} = $${projectedRevenue.toLocaleString()}`,
        confidence: 60,
      };
    }

    case 'deal_size_increase': {
      const amount = params.amount || 500;
      const projectedExtraRevenue = deals.length * amount;
      return {
        scenario: `Average deal size increases by $${amount.toLocaleString()}`,
        assumption: `Applied to your ${deals.length} deals`,
        currentValue: avgDealValue,
        projectedValue: avgDealValue + amount,
        impact: projectedExtraRevenue,
        unit: 'revenue',
        formula: `${deals.length} deals × $${amount} = $${projectedExtraRevenue.toLocaleString()} additional revenue`,
        confidence: 70,
      };
    }

    default:
      return null;
  }
}
