export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { Lead, Note } from '@prisma/client';

// AI Contact Scoring Formula:
// Score = (Engagement × 25) + (Timeline × 25) + (Activity × 20) + (Intent Signals × 20) + (Recency × 10)

interface ContactScore {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  type: 'buyer' | 'seller' | 'both';
  reason: string;
  lastContact: string;
  timeline: string;
  suggestedAction: string;
  callScript: string;
  signals: string[];
}

type LeadWithNotes = Lead & {
  notes: Note[];
  _count: { notes: number };
};

function calculateDaysSince(date: Date | null): number {
  if (!date) return 999;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calculateRecencyScore(daysSince: number): number {
  if (daysSince <= 3) return 10;
  if (daysSince <= 7) return 8;
  if (daysSince <= 14) return 6;
  if (daysSince <= 30) return 4;
  if (daysSince <= 60) return 2;
  return 0;
}

function calculateTimelineScore(timeline: string | null): number {
  if (!timeline) return 10;
  const lower = timeline.toLowerCase();
  if (lower.includes('asap') || lower.includes('now') || lower.includes('immediate') || lower.includes('1 month') || lower.includes('soon')) return 25;
  if (lower.includes('3 month') || lower.includes('90 day')) return 20;
  if (lower.includes('6 month')) return 15;
  if (lower.includes('year') || lower.includes('12 month')) return 5;
  return 10;
}

function detectSignals(lead: LeadWithNotes, notes: string[]): { signals: string[]; intentScore: number } {
  const signals: string[] = [];
  let intentScore = 0;
  const allText = [...notes, lead.nextAction || ''].join(' ').toLowerCase();

  // Check for intent signals
  if (allText.includes('pre-approved') || allText.includes('preapproved') || allText.includes('mortgage')) {
    signals.push('Pre-approved');
    intentScore += 10;
  }
  if (allText.includes('selling') || allText.includes('list') || allText.includes('thinking about')) {
    signals.push('Selling intent');
    intentScore += 8;
  }
  if (allText.includes('urgent') || allText.includes('need to move') || allText.includes('relocat')) {
    signals.push('Urgent timeline');
    intentScore += 10;
  }
  if (allText.includes('price') || allText.includes('budget') || allText.includes('afford')) {
    signals.push('Price discussions');
    intentScore += 5;
  }
  if (allText.includes('open house') || allText.includes('showing') || allText.includes('viewed')) {
    signals.push('Active searching');
    intentScore += 7;
  }

  // Check lead status
  if (lead.status === 'QUALIFIED') {
    signals.push('Qualified lead');
    intentScore += 10;
  }
  if (lead.source?.includes('FSBO') || lead.source?.includes('DUPROPRIO')) {
    signals.push('FSBO lead');
    intentScore += 5;
  }

  return { signals, intentScore: Math.min(intentScore, 20) };
}

function determineContactType(lead: LeadWithNotes, notes: string[]): 'buyer' | 'seller' | 'both' {
  const allText = [...notes, lead.contactType || '', JSON.stringify(lead.tags || [])].join(' ').toLowerCase();
  const isBuyer = allText.includes('buyer') || allText.includes('buying') || allText.includes('purchase');
  const isSeller = allText.includes('seller') || allText.includes('selling') || allText.includes('list') || allText.includes('fsbo');
  
  if (isBuyer && isSeller) return 'both';
  if (isSeller) return 'seller';
  return 'buyer';
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const days = calculateDaysSince(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function generateCallScript(lead: LeadWithNotes, type: string, signals: string[]): { script: string; action: string } {
  const firstName = lead.contactPerson?.split(' ')[0] || lead.businessName?.split(' ')[0] || 'there';

  // Simple rule-based scripts
  if (signals.includes('Pre-approved')) {
    return {
      script: `Hi ${firstName}, I noticed you recently got pre-approved. Congrats! I wanted to touch base and see if you've had a chance to look at any properties that caught your eye?`,
      action: 'Schedule property tour or send curated listings'
    };
  }
  if (signals.includes('Selling intent') || signals.includes('FSBO lead')) {
    return {
      script: `Hi ${firstName}, I was thinking about you and wanted to check in. I noticed you're considering selling. With the current market conditions, would you like me to put together a quick analysis of what your home might be worth?`,
      action: 'Offer CMA or home value assessment'
    };
  }
  if (signals.includes('Urgent timeline')) {
    return {
      script: `Hi ${firstName}, I know timing is important for you right now. I wanted to prioritize your search and see what I can do to help speed things up. Do you have 15 minutes today to chat about next steps?`,
      action: 'Fast-track the process, schedule immediate call'
    };
  }
  if (type === 'seller') {
    return {
      script: `Hi ${firstName}, hope you're doing well! I've been keeping an eye on the market in your area and noticed some interesting trends. Would you be open to a quick chat about what's happening with home values nearby?`,
      action: 'Send market update or offer listing consultation'
    };
  }
  return {
    script: `Hi ${firstName}, just wanted to check in and see how your real estate plans are coming along. Is there anything I can help you with right now?`,
    action: 'Reconnect and assess current needs'
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch leads (our contacts) with real estate tags or FSBO sources
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { source: { contains: 'FSBO' } },
          { source: { contains: 'DUPROPRIO' } },
          { source: { contains: 'ZILLOW' } },
          { source: { contains: 'REALTOR' } },
          { contactType: { contains: 'buyer' } },
          { contactType: { contains: 'seller' } },
          { status: 'QUALIFIED' },
          { status: 'CONTACTED' },
        ],
      },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            notes: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    });

    // Score each lead
    const scoredContacts: ContactScore[] = leads.map((lead) => {
      const noteTexts = lead.notes.map((n: Note) => n.content || '');
      const daysSinceContact = calculateDaysSince(lead.lastContactedAt || lead.updatedAt);
      
      // Calculate sub-scores
      const engagementScore = Math.min((lead._count.notes || 0) * 3, 25);
      const timelineScore = calculateTimelineScore(lead.nextAction || null);
      const recencyScore = calculateRecencyScore(daysSinceContact);
      const { signals, intentScore } = detectSignals(lead, noteTexts);
      const activityScore = Math.min(engagementScore, 20);
      
      // Total score
      const totalScore = Math.min(
        Math.round(engagementScore + timelineScore + activityScore + intentScore + recencyScore),
        100
      );

      const type = determineContactType(lead, noteTexts);
      const { script, action } = generateCallScript(lead, type, signals);

      // Generate reason based on highest contributing factors
      let reason = '';
      if (intentScore >= 15) reason = 'Strong buying/selling signals detected';
      else if (timelineScore >= 20) reason = 'Active timeline - ready to move soon';
      else if (engagementScore >= 20) reason = 'High engagement - multiple touchpoints';
      else if (recencyScore >= 8) reason = 'Recent activity - warm lead';
      else reason = 'Consistent interest in real estate';

      const displayName = lead.contactPerson || lead.businessName || 'Unknown';

      return {
        id: lead.id,
        name: displayName,
        email: lead.email || '',
        phone: lead.phone || '',
        score: totalScore,
        type,
        reason,
        lastContact: formatTimeAgo(lead.lastContactedAt || lead.updatedAt),
        timeline: timelineScore >= 20 ? 'Soon (1-3 mo)' : timelineScore >= 15 ? '3-6 months' : '6+ months',
        suggestedAction: action,
        callScript: script,
        signals: signals.length > 0 ? signals : ['RE lead'],
      };
    });

    // Sort by score and return top 5
    const topContacts = scoredContacts
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      contacts: topContacts,
      totalScored: leads.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Priority contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority contacts', contacts: [] },
      { status: 500 }
    );
  }
}
