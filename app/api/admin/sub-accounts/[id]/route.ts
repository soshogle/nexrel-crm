
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an agency admin
    if (session.user.role !== 'AGENCY_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const subAccountId = params.id;

    // Get sub-account details
    const subAccount = await prisma.user.findUnique({
      where: {
        id: subAccountId,
        agencyId: session.user.agencyId || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        agency: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!subAccount) {
      return NextResponse.json({ error: 'Sub-account not found' }, { status: 404 });
    }

    // Get detailed metrics
    const [
      totalLeads,
      convertedLeads,
      totalDeals,
      wonDeals,
      totalCampaigns,
      activeCampaigns,
      totalConversations,
      totalAppointments,
      completedAppointments,
      totalVoiceAgents,
    ] = await Promise.all([
      prisma.lead.count({ where: { userId: subAccountId } }),
      prisma.lead.count({ where: { userId: subAccountId, status: 'CONVERTED' } }),
      prisma.deal.count({ where: { userId: subAccountId } }),
      prisma.deal.count({ where: { userId: subAccountId, actualCloseDate: { not: null } } }),
      prisma.campaign.count({ where: { userId: subAccountId } }),
      prisma.campaign.count({ where: { userId: subAccountId, status: 'ACTIVE' } }),
      prisma.conversation.count({ where: { userId: subAccountId } }),
      prisma.bookingAppointment.count({ where: { userId: subAccountId } }),
      prisma.bookingAppointment.count({ where: { userId: subAccountId, status: 'CONFIRMED' } }),
      prisma.voiceAgent.count({ where: { userId: subAccountId } }),
    ]);

    // Get revenue (deals with actualCloseDate are considered won)
    const deals = await prisma.deal.findMany({
      where: {
        userId: subAccountId,
        actualCloseDate: {
          not: null,
        },
      },
      select: {
        value: true,
      },
    });

    const totalRevenue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);

    // Get recent activity
    const recentLeads = await prisma.lead.findMany({
      where: { userId: subAccountId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        businessName: true,
        status: true,
        createdAt: true,
      },
    });

    const recentDeals = await prisma.deal.findMany({
      where: { userId: subAccountId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        value: true,
        createdAt: true,
        stage: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      subAccount,
      metrics: {
        leads: {
          total: totalLeads,
          converted: convertedLeads,
          conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0,
        },
        deals: {
          total: totalDeals,
          won: wonDeals,
          winRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 1000) / 10 : 0,
          totalRevenue,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        conversations: {
          total: totalConversations,
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
        },
        voiceAgents: {
          total: totalVoiceAgents,
        },
      },
      recentActivity: {
        leads: recentLeads,
        deals: recentDeals,
      },
    });
  } catch (error) {
    console.error('Error fetching sub-account details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sub-account details' },
      { status: 500 }
    );
  }
}
