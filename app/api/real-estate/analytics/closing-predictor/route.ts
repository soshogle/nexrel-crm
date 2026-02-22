export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { Deal, Lead } from '@prisma/client';

interface ClosingPrediction {
  period: '30' | '60' | '90';
  probability: number;
  deals: number;
  revenue: number;
  contacts: { name: string; type: string; probability: number }[];
}

type DealWithLead = Deal & {
  lead: Lead | null;
  stage: { name: string } | null;
};

function calculateDealProbability(deal: DealWithLead, daysWindow: number): number {
  // Use deal's own probability if set, otherwise calculate based on stage
  let baseProbability = deal.probability || 0;
  
  if (baseProbability === 0) {
    const stageName = deal.stage?.name?.toLowerCase() || '';
    
    if (stageName.includes('closed') || stageName.includes('won')) return 100;
    if (stageName.includes('contract') || stageName.includes('pending')) baseProbability = 85;
    else if (stageName.includes('negotiat') || stageName.includes('offer')) baseProbability = 60;
    else if (stageName.includes('showing') || stageName.includes('active')) baseProbability = 40;
    else if (stageName.includes('qualified') || stageName.includes('hot')) baseProbability = 25;
    else if (stageName.includes('nurture') || stageName.includes('warm')) baseProbability = 15;
    else baseProbability = 10;
  }

  // Adjust for deal age
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageAdjustment = Math.max(-20, -daysSinceCreated * 0.3);

  // Adjust for last activity
  const daysSinceActivity = deal.updatedAt
    ? Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const activityAdjustment = daysSinceActivity > 14 ? -15 : daysSinceActivity > 7 ? -5 : 0;

  // Time window adjustment
  const windowMultiplier = daysWindow === 30 ? 0.8 : daysWindow === 60 ? 1.0 : 1.2;

  const finalProbability = Math.min(
    100,
    Math.max(0, (baseProbability + ageAdjustment + activityAdjustment) * windowMultiplier)
  );

  return Math.round(finalProbability);
}

function estimateDealValue(deal: DealWithLead): number {
  if (deal.value && deal.value > 0) return deal.value;
  return 10000; // Default commission estimate
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch active deals
    const deals = await getCrmDb(ctx).deal.findMany({
      where: {
        userId: ctx.userId,
        actualCloseDate: null, // Not yet closed
      },
      include: {
        lead: true,
        stage: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Also fetch FSBO leads as potential deals
    const fsboLeads = await leadService.findMany(ctx, {
      where: {
        status: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'RESPONDED'] } as any,
        OR: [
          { source: { contains: 'FSBO' } },
          { source: { contains: 'DUPROPRIO' } },
          { source: { contains: 'ZILLOW' } },
          { source: { contains: 'REALTOR' } },
        ],
      },
      take: 20,
    });

    // Calculate predictions for each time window
    const predictions: ClosingPrediction[] = [30, 60, 90].map((days) => {
      const dealPredictions = deals.map((deal) => ({
        name: deal.lead?.contactPerson || deal.lead?.businessName || deal.title || 'Unknown Deal',
        type: deal.stage?.name || 'Active',
        probability: calculateDealProbability(deal as DealWithLead, days),
        value: estimateDealValue(deal as DealWithLead),
      }));

      // Add FSBO leads with lower probability
      const leadPredictions = fsboLeads.slice(0, 5).map((lead) => ({
        name: lead.contactPerson || lead.businessName || lead.address || 'FSBO Lead',
        type: 'FSBO Lead',
        probability: days === 30 ? 5 : days === 60 ? 10 : 15,
        value: 8000,
      }));

      const allPredictions = [...dealPredictions, ...leadPredictions];

      // Calculate weighted probability and totals
      const likelyDeals = allPredictions.filter((d) => d.probability >= 30);
      const totalProbability =
        likelyDeals.length > 0
          ? Math.round(
              likelyDeals.reduce((sum, d) => sum + d.probability, 0) / likelyDeals.length
            )
          : 0;

      const expectedRevenue = allPredictions.reduce(
        (sum, d) => sum + (d.value * d.probability) / 100,
        0
      );

      // Top contributors
      const topContacts = allPredictions
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5)
        .map((d) => ({
          name: d.name,
          type: d.type,
          probability: d.probability,
        }));

      return {
        period: String(days) as '30' | '60' | '90',
        probability: totalProbability,
        deals: likelyDeals.length,
        revenue: Math.round(expectedRevenue),
        contacts: topContacts,
      };
    });

    return NextResponse.json({
      predictions,
      totalDeals: deals.length,
      totalLeads: fsboLeads.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Closing predictor error:', error);
    return NextResponse.json(
      { error: 'Failed to generate predictions', predictions: [] },
      { status: 500 }
    );
  }
}
