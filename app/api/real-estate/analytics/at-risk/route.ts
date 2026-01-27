export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface AtRiskItem {
  id: string;
  type: 'listing' | 'buyer' | 'deal';
  name: string;
  address?: string;
  reason: string;
  daysInactive: number;
  riskLevel: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

function calculateDaysSince(date: Date | null): number {
  if (!date) return 999;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function determineRiskLevel(daysInactive: number, type: string): 'high' | 'medium' | 'low' {
  if (type === 'listing') {
    if (daysInactive >= 45) return 'high';
    if (daysInactive >= 30) return 'medium';
    return 'low';
  }
  // Buyers and deals
  if (daysInactive >= 14) return 'high';
  if (daysInactive >= 7) return 'medium';
  return 'low';
}

function generateSuggestedAction(type: string, daysInactive: number): string {
  if (type === 'listing') {
    if (daysInactive >= 45) return 'Schedule price reduction discussion with seller';
    if (daysInactive >= 30) return 'Review marketing strategy and showing feedback';
    return 'Check in with seller on showing activity';
  }
  if (type === 'buyer') {
    if (daysInactive >= 14) return 'Send personalized "thinking of you" message with new listings';
    if (daysInactive >= 7) return 'Call to check on their search status';
    return 'Send market update relevant to their search';
  }
  // Deal
  if (daysInactive >= 14) return 'Urgent: Contact all parties to identify blockers';
  if (daysInactive >= 7) return 'Follow up on pending items and timeline';
  return 'Check transaction milestone progress';
}

function generateRiskReason(type: string, daysInactive: number): string {
  if (type === 'listing') {
    if (daysInactive >= 45) return 'High DOM with no recent activity - seller may become frustrated';
    if (daysInactive >= 30) return 'Extended time on market - may need strategy adjustment';
    return 'Showings have slowed down';
  }
  if (type === 'buyer') {
    if (daysInactive >= 14) return 'No response to recent outreach - may be working with another agent';
    if (daysInactive >= 7) return 'Gone quiet after initial interest';
    return 'Engagement dropping off';
  }
  // Deal
  if (daysInactive >= 14) return 'Transaction stalled - no movement on key milestones';
  if (daysInactive >= 7) return 'Slower than expected progress';
  return 'Minor delays detected';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const atRiskItems: AtRiskItem[] = [];

    // 1. Fetch stale FSBO/seller leads (listings at risk)
    const staleListings = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['NEW', 'CONTACTED', 'QUALIFIED'],
        },
        OR: [
          { source: { contains: 'FSBO' } },
          { source: { contains: 'DUPROPRIO' } },
          { source: { contains: 'ZILLOW' } },
          { contactType: { contains: 'seller' } },
        ],
        updatedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: 10,
    });

    for (const lead of staleListings) {
      const daysInactive = calculateDaysSince(lead.updatedAt);
      const riskLevel = determineRiskLevel(daysInactive, 'listing');
      
      if (riskLevel !== 'low') {
        atRiskItems.push({
          id: lead.id,
          type: 'listing',
          name: lead.contactPerson || lead.businessName || 'Unknown Seller',
          address: lead.address || undefined,
          reason: generateRiskReason('listing', daysInactive),
          daysInactive,
          riskLevel,
          suggestedAction: generateSuggestedAction('listing', daysInactive),
        });
      }
    }

    // 2. Fetch inactive buyer leads
    const inactiveBuyers = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { contactType: { contains: 'buyer' } },
        ],
        updatedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        status: {
          notIn: ['CONVERTED', 'LOST'],
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: 10,
    });

    for (const buyer of inactiveBuyers) {
      const daysInactive = calculateDaysSince(buyer.lastContactedAt || buyer.updatedAt);
      const riskLevel = determineRiskLevel(daysInactive, 'buyer');
      
      if (riskLevel !== 'low') {
        atRiskItems.push({
          id: buyer.id,
          type: 'buyer',
          name: buyer.contactPerson || buyer.businessName || 'Unknown Buyer',
          reason: generateRiskReason('buyer', daysInactive),
          daysInactive,
          riskLevel,
          suggestedAction: generateSuggestedAction('buyer', daysInactive),
        });
      }
    }

    // 3. Fetch stalled deals
    const stalledDeals = await prisma.deal.findMany({
      where: {
        userId: session.user.id,
        actualCloseDate: null,
        updatedAt: {
          lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        lead: {
          select: {
            contactPerson: true,
            businessName: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: 10,
    });

    for (const deal of stalledDeals) {
      const daysInactive = calculateDaysSince(deal.updatedAt);
      const riskLevel = determineRiskLevel(daysInactive, 'deal');
      
      if (riskLevel !== 'low') {
        atRiskItems.push({
          id: deal.id,
          type: 'deal',
          name: deal.lead?.contactPerson || deal.lead?.businessName || deal.title || 'Unknown Deal',
          reason: generateRiskReason('deal', daysInactive),
          daysInactive,
          riskLevel,
          suggestedAction: generateSuggestedAction('deal', daysInactive),
        });
      }
    }

    // Sort by risk level (high first) then by days inactive
    const riskOrder = { high: 0, medium: 1, low: 2 };
    atRiskItems.sort((a, b) => {
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.daysInactive - a.daysInactive;
    });

    return NextResponse.json({
      items: atRiskItems,
      summary: {
        listings: atRiskItems.filter((i) => i.type === 'listing').length,
        buyers: atRiskItems.filter((i) => i.type === 'buyer').length,
        deals: atRiskItems.filter((i) => i.type === 'deal').length,
        highRisk: atRiskItems.filter((i) => i.riskLevel === 'high').length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('At-risk items error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch at-risk items', items: [] },
      { status: 500 }
    );
  }
}
