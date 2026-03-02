import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCrmDb } from '@/lib/dal/db';
import { resolveDalContext } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    // Check if user is an agency admin
    if (session.user.role !== 'AGENCY_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Forbidden: Admin access required');
    }

    // Get all sub-accounts under this agency
    const subAccounts = await prisma.user.findMany({
      where: {
        agencyId: session.user.agencyId || undefined,
        role: 'USER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        image: true,
        _count: {
          select: {
            leads: true,
            deals: true,
            campaigns: true,
            conversations: true,
            appointments: true,
            voiceAgents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate performance metrics for each sub-account
    const subAccountsWithMetrics = await Promise.all(
      subAccounts.map(async (account) => {
        const accountCtx = await resolveDalContext(account.id);
        const db = getCrmDb(accountCtx);
        const deals = await db.deal.findMany({
          where: {
            userId: account.id,
            actualCloseDate: {
              not: null,
            },
          },
          select: {
            value: true,
          },
        });

        const totalRevenue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);

        const totalLeads = account._count.leads;
        const convertedLeads = await db.lead.count({
          where: {
            userId: account.id,
            status: 'CONVERTED',
          },
        });

        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        // Get recent activity
        const recentMessages = await prisma.conversationMessage.count({
          where: {
            userId: account.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        });

        return {
          id: account.id,
          name: account.name,
          email: account.email,
          createdAt: account.createdAt,
          image: account.image,
          metrics: {
            leads: account._count.leads,
            deals: account._count.deals,
            campaigns: account._count.campaigns,
            conversations: account._count.conversations,
            appointments: account._count.appointments,
            voiceAgents: account._count.voiceAgents,
            totalRevenue,
            conversionRate: Math.round(conversionRate * 10) / 10,
            recentActivity: recentMessages,
          },
        };
      })
    );

    return NextResponse.json({ subAccounts: subAccountsWithMetrics });
  } catch (error) {
    console.error('Error fetching sub-accounts:', error);
    return apiErrors.internal('Failed to fetch sub-accounts');
  }
}
