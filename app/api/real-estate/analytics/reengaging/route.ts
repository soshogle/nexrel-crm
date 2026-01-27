export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface ReengagingContact {
  id: string;
  name: string;
  email: string;
  lastActivity: string;
  activityType: string;
  inactiveDays: number;
  reason: string;
}

interface ReferralOpportunity {
  id: string;
  name: string;
  closedDate: string;
  satisfaction: number;
  lastContact: string;
  reason: string;
}

function calculateDaysSince(date: Date | null): number {
  if (!date) return 999;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const days = calculateDaysSince(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Find leads who were inactive but recently became active
    const reengagingContacts: ReengagingContact[] = [];
    
    const leadsWithRecentNotes = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        notes: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      take: 20,
    });

    for (const lead of leadsWithRecentNotes) {
      const notes = lead.notes;
      if (notes.length >= 2) {
        const latestNote = notes[0];
        const previousNote = notes[1];
        const gapDays = Math.floor(
          (new Date(latestNote.createdAt).getTime() - new Date(previousNote.createdAt).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        // If there was a 14+ day gap before their recent activity
        if (gapDays >= 14 && calculateDaysSince(latestNote.createdAt) <= 7) {
          reengagingContacts.push({
            id: lead.id,
            name: lead.contactPerson || lead.businessName || 'Unknown',
            email: lead.email || '',
            lastActivity: formatTimeAgo(latestNote.createdAt),
            activityType: 'New interaction',
            inactiveDays: gapDays,
            reason: `Re-engaged after ${gapDays} days of inactivity`,
          });
        }
      }
    }

    // 2. Find referral opportunities (converted/won deals)
    const referralOpportunities: ReferralOpportunity[] = [];
    
    // Get closed/won deals
    const closedDeals = await prisma.deal.findMany({
      where: {
        userId: session.user.id,
        actualCloseDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          not: null,
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            contactPerson: true,
            businessName: true,
            email: true,
            lastContactedAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        actualCloseDate: 'desc',
      },
      take: 20,
    });

    for (const deal of closedDeals) {
      if (!deal.lead || !deal.actualCloseDate) continue;
      
      const daysSinceClose = calculateDaysSince(deal.actualCloseDate);
      const daysSinceContact = calculateDaysSince(deal.lead.lastContactedAt || deal.lead.updatedAt);
      
      // Good referral candidates:
      // - Closed 30-180 days ago
      // - Haven't been contacted for referral recently
      if (daysSinceClose >= 30 && daysSinceClose <= 180 && daysSinceContact >= 30) {
        const satisfaction = Math.min(5, Math.max(3, 5 - Math.floor(daysSinceClose / 60)));
        
        let reason = '';
        if (daysSinceClose <= 60) reason = 'Recent close - perfect time for referral ask';
        else if (daysSinceClose <= 90) reason = 'Settled in - happy client window';
        else reason = 'Established relationship - time to reconnect';

        referralOpportunities.push({
          id: deal.lead.id,
          name: deal.lead.contactPerson || deal.lead.businessName || 'Past Client',
          closedDate: formatDate(deal.actualCloseDate),
          satisfaction,
          lastContact: formatTimeAgo(deal.lead.lastContactedAt || deal.lead.updatedAt),
          reason,
        });
      }
    }

    // Also check converted leads
    const convertedLeads = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        status: 'CONVERTED',
        lastContactedAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      take: 10,
    });

    for (const lead of convertedLeads) {
      // Avoid duplicates
      if (referralOpportunities.some((r) => r.id === lead.id)) continue;

      const daysSinceContact = calculateDaysSince(lead.lastContactedAt || lead.updatedAt);
      
      referralOpportunities.push({
        id: lead.id,
        name: lead.contactPerson || lead.businessName || 'Past Client',
        closedDate: 'Past transaction',
        satisfaction: 4,
        lastContact: formatTimeAgo(lead.lastContactedAt || lead.updatedAt),
        reason: daysSinceContact > 90 ? 'Overdue for check-in' : 'Good time for referral conversation',
      });
    }

    // Sort referrals by satisfaction
    referralOpportunities.sort((a, b) => b.satisfaction - a.satisfaction);

    return NextResponse.json({
      contacts: reengagingContacts.slice(0, 10),
      referrals: referralOpportunities.slice(0, 10),
      summary: {
        reengaging: reengagingContacts.length,
        referralReady: referralOpportunities.length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reengaging contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reengaging contacts', contacts: [], referrals: [] },
      { status: 500 }
    );
  }
}
