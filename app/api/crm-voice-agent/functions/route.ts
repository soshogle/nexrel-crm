/**
 * API Route: Handle CRM Voice Agent Function Calls
 * 
 * POST - Process custom function calls from ElevenLabs CRM voice agent
 * These are called via webhook when the agent uses custom functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Handle function calls from ElevenLabs CRM voice agent
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { function_name, parameters, user_id } = body;

    console.log(`🧰 [CRM Voice Functions] Received call: ${function_name}`, parameters);

    // Get user from session or user_id
    let userId = user_id;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized - user_id required or valid session' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    let result: any;

    switch (function_name) {
      case 'get_statistics':
        result = await getStatistics(userId, parameters || {});
        break;

      case 'create_lead':
        result = await createLead(userId, parameters);
        break;

      case 'create_deal':
        result = await createDeal(userId, parameters);
        break;

      case 'list_leads':
        result = await listLeads(userId, parameters);
        break;

      case 'list_deals':
        result = await listDeals(userId, parameters);
        break;

      case 'search_contacts':
        result = await searchContacts(userId, parameters);
        break;

      case 'get_recent_activity':
        result = await getRecentActivity(userId, parameters);
        break;

      default:
        result = { error: `Unknown function: ${function_name}` };
    }

    console.log(`✅ [CRM Voice Functions] ${function_name} result:`, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[CRM Voice Functions] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Function execution failed' },
      { status: 500 }
    );
  }
}

/**
 * Get CRM statistics with time-based queries and comparison support
 */
async function getStatistics(userId: string, params: any = {}) {
  try {
    const { period = 'all_time', compareWith } = params;
    
    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date | null = null;
    let compareStartDate: Date | null = null;
    let compareEndDate: Date | null = null;
    
    if (period === 'last_7_months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 7, 1);
      if (compareWith === 'previous_year' || compareWith === 'previous_period') {
        compareStartDate = new Date(now.getFullYear() - 1, now.getMonth() - 7, 1);
        compareEndDate = new Date(now.getFullYear() - 1, now.getMonth(), 0);
      }
    } else if (period === 'last_year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    } else if (period === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clauses
    const whereClause: any = { userId };
    const compareWhereClause: any = { userId };
    
    if (startDate) {
      whereClause.createdAt = { gte: startDate };
    }
    
    if (compareStartDate && compareEndDate) {
      compareWhereClause.createdAt = { gte: compareStartDate, lte: compareEndDate };
    }

    const [leads, deals, contacts, campaigns] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.deal.count({ where: whereClause }),
      prisma.lead.count({ where: whereClause }), // Contacts are leads
      prisma.campaign.count({ where: whereClause }),
    ]);

    // Get all deals with dates for time-series analysis
    const allDeals = await prisma.deal.findMany({
      where: whereClause,
      select: { 
        value: true,
        actualCloseDate: true,
        createdAt: true,
        expectedCloseDate: true,
      },
    });
    
    const openDeals = allDeals.filter(deal => deal.actualCloseDate === null);
    const totalRevenue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    
    // Calculate revenue by month for the last 7 months
    const monthlyRevenue: Record<string, number> = {};
    const monthlyDeals: Record<string, number> = {};
    
    for (let i = 6; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = 0;
      monthlyDeals[monthKey] = 0;
    }
    
    // Calculate revenue and deals by month
    allDeals.forEach(deal => {
      const dealDate = deal.actualCloseDate || deal.createdAt || deal.expectedCloseDate;
      if (dealDate) {
        const date = new Date(dealDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += deal.value || 0;
          monthlyDeals[monthKey] += 1;
        }
      }
    });
    
    // Get comparison data if requested
    let comparisonData: any = null;
    if (compareStartDate && compareEndDate) {
      const compareDeals = await prisma.deal.findMany({
        where: compareWhereClause,
        select: { 
          value: true,
          actualCloseDate: true,
          createdAt: true,
        },
      });
      
      const compareMonthlyRevenue: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear() - 1, now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        compareMonthlyRevenue[monthKey] = 0;
      }
      
      compareDeals.forEach(deal => {
        const dealDate = deal.actualCloseDate || deal.createdAt;
        if (dealDate) {
          const date = new Date(dealDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (compareMonthlyRevenue.hasOwnProperty(monthKey)) {
            compareMonthlyRevenue[monthKey] += deal.value || 0;
          }
        }
      });
      
      comparisonData = {
        monthlyRevenue: compareMonthlyRevenue,
        totalRevenue: compareDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
      };
    }

    const recentLeads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { 
        businessName: true,
        contactPerson: true,
        status: true, 
        createdAt: true 
      },
    });

    // Prepare chart-ready data formats
    const chartData = {
      // Line/Bar chart data for monthly revenue
      monthlyRevenueChart: {
        labels: Object.keys(monthlyRevenue).map(month => 
          new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })
        ),
        datasets: [{
          label: 'Revenue',
          data: Object.values(monthlyRevenue),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
        }],
      },
      // Pie chart data for CRM metrics distribution
      metricsPieChart: {
        labels: ['Leads', 'Deals', 'Open Deals', 'Campaigns'],
        datasets: [{
          label: 'CRM Metrics',
          data: [leads, deals, openDeals.length, campaigns],
          backgroundColor: [
            'rgba(139, 92, 246, 0.8)',  // Purple for Leads
            'rgba(59, 130, 246, 0.8)',  // Blue for Deals
            'rgba(16, 185, 129, 0.8)',  // Green for Open Deals
            'rgba(245, 158, 11, 0.8)',  // Amber for Campaigns
          ],
        }],
      },
      // Bar chart data for metrics comparison
      metricsBarChart: {
        labels: ['Leads', 'Deals', 'Open Deals', 'Campaigns'],
        datasets: [{
          label: 'Count',
          data: [leads, deals, openDeals.length, campaigns],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
        }],
      },
    };

    return {
      success: true,
      statistics: {
        totalLeads: leads,
        totalDeals: deals,
        totalContacts: contacts,
        totalCampaigns: campaigns,
        openDeals: openDeals.length,
        totalRevenue: totalRevenue,
        monthlyRevenue,
        monthlyDeals,
        comparisonData,
        recentLeads: recentLeads.map(lead => ({
          name: lead.contactPerson || lead.businessName || 'Unknown',
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        })),
        // Chart-ready data formats
        charts: chartData,
      },
      message: `You have ${leads} leads, ${deals} deals, ${openDeals.length} open deals worth $${totalRevenue.toLocaleString()}, and ${campaigns} campaigns.`,
    };
  } catch (error: any) {
    console.error('Error getting statistics:', error);
    return { error: 'Failed to get statistics', details: error.message };
  }
}

/**
 * Create a new lead
 */
async function createLead(userId: string, params: any) {
  try {
    const { name, email, phone, company, status = 'NEW' } = params;

    if (!name) {
      return { error: 'Name is required' };
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        company,
        status,
        userId,
        source: 'Voice AI',
      },
    });

    return {
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
      },
      message: `Created contact ${name}${email ? ` (${email})` : ''}`,
    };
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return { error: 'Failed to create lead', details: error.message };
  }
}

/**
 * Create a new deal
 */
async function createDeal(userId: string, params: any) {
  try {
    const { title, value, leadId } = params;

    if (!title) {
      return { error: 'Title is required' };
    }

    const deal = await prisma.deal.create({
      data: {
        title,
        value: value ? parseFloat(value) : null,
        leadId,
        userId,
        status: 'OPEN',
      },
    });

    return {
      success: true,
      deal: {
        id: deal.id,
        title: deal.title,
        value: deal.value,
        status: deal.status,
      },
      message: `Created deal "${title}"${value ? ` worth $${value.toLocaleString()}` : ''}`,
    };
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return { error: 'Failed to create deal', details: error.message };
  }
}

/**
 * List leads
 */
async function listLeads(userId: string, params: any) {
  try {
    const { status, limit = 10 } = params;

    const leads = await prisma.lead.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
      },
    });

    return {
      success: true,
      leads: leads,
      count: leads.length,
      message: `Found ${leads.length} ${status ? status.toLowerCase() : ''} lead${leads.length !== 1 ? 's' : ''}`,
    };
  } catch (error: any) {
    console.error('Error listing leads:', error);
    return { error: 'Failed to list leads', details: error.message };
  }
}

/**
 * List deals
 */
async function listDeals(userId: string, params: any) {
  try {
    const { limit = 10 } = params;

    const deals = await prisma.deal.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        value: true,
        status: true,
      },
    });

    return {
      success: true,
      deals: deals,
      count: deals.length,
      message: `Found ${deals.length} deal${deals.length !== 1 ? 's' : ''}`,
    };
  } catch (error: any) {
    console.error('Error listing deals:', error);
    return { error: 'Failed to list deals', details: error.message };
  }
}

/**
 * Search contacts
 */
async function searchContacts(userId: string, params: any) {
  try {
    const { query } = params;

    if (!query) {
      return { error: 'Search query is required' };
    }

    const leads = await prisma.lead.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
      },
    });

    return {
      success: true,
      contacts: leads,
      count: leads.length,
      message: `Found ${leads.length} contact${leads.length !== 1 ? 's' : ''} matching "${query}"`,
    };
  } catch (error: any) {
    console.error('Error searching contacts:', error);
    return { error: 'Failed to search contacts', details: error.message };
  }
}

/**
 * Get recent activity
 */
async function getRecentActivity(userId: string, params: any) {
  try {
    const { limit = 10 } = params;

    const [recentLeads, recentDeals] = await Promise.all([
      prisma.lead.findMany({
        where: { userId },
        take: Math.floor(limit / 2),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.deal.findMany({
        where: { userId },
        take: Math.floor(limit / 2),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          value: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      activity: {
        recentLeads,
        recentDeals,
      },
      message: `Recent activity: ${recentLeads.length} new leads and ${recentDeals.length} new deals`,
    };
  } catch (error: any) {
    console.error('Error getting recent activity:', error);
    return { error: 'Failed to get recent activity', details: error.message };
  }
}
