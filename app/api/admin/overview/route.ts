
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an agency admin
    if (session.user.role !== 'AGENCY_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const agencyId = session.user.agencyId;

    // Get agency information
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId || undefined },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    // Get total sub-accounts
    const totalSubAccounts = await prisma.user.count({
      where: {
        agencyId,
        role: 'USER',
      },
    });

    // Get active sub-accounts (had activity in last 30 days)
    const activeSubAccounts = await prisma.user.count({
      where: {
        agencyId,
        role: 'USER',
        OR: [
          {
            leads: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
          {
            conversationMessages: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        ],
      },
    });

    // Get total revenue across all sub-accounts (deals with actualCloseDate are considered won)
    const allDeals = await prisma.deal.findMany({
      where: {
        user: {
          agencyId,
        },
        actualCloseDate: {
          not: null,
        },
      },
      select: {
        value: true,
      },
    });

    const totalRevenue = allDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

    // Get total leads across all sub-accounts
    const totalLeads = await prisma.lead.count({
      where: {
        user: {
          agencyId,
        },
      },
    });

    // Get total converted leads
    const convertedLeads = await prisma.lead.count({
      where: {
        user: {
          agencyId,
        },
        status: 'CONVERTED',
      },
    });

    const overallConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Get total campaigns
    const totalCampaigns = await prisma.campaign.count({
      where: {
        user: {
          agencyId,
        },
      },
    });

    // Get total conversations
    const totalConversations = await prisma.conversation.count({
      where: {
        user: {
          agencyId,
        },
      },
    });

    // Get total appointments
    const totalAppointments = await prisma.bookingAppointment.count({
      where: {
        user: {
          agencyId,
        },
      },
    });

    // Get monthly growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyLeads = await prisma.lead.groupBy({
      by: ['createdAt'],
      where: {
        user: {
          agencyId,
        },
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      agency,
      overview: {
        totalSubAccounts,
        activeSubAccounts,
        totalRevenue,
        totalLeads,
        convertedLeads,
        overallConversionRate: Math.round(overallConversionRate * 10) / 10,
        totalCampaigns,
        totalConversations,
        totalAppointments,
      },
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin overview' },
      { status: 500 }
    );
  }
}
