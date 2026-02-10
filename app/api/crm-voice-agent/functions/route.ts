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
        result = await getStatistics(userId);
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
 * Get CRM statistics
 */
async function getStatistics(userId: string) {
  try {
    const [leads, deals, contacts, campaigns] = await Promise.all([
      prisma.lead.count({ where: { userId } }),
      prisma.deal.count({ where: { userId } }),
      prisma.lead.count({ where: { userId } }), // Contacts are leads
      prisma.campaign.count({ where: { userId } }),
    ]);

    // Get open deals (deals without actualCloseDate)
    const openDeals = await prisma.deal.findMany({
      where: { 
        userId, 
        actualCloseDate: null, // Open deals don't have a close date
      },
      select: { value: true },
    });

    const totalRevenue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

    const recentLeads = await prisma.lead.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { 
        businessName: true,
        contactPerson: true,
        status: true, 
        createdAt: true 
      },
    });

    return {
      success: true,
      statistics: {
        totalLeads: leads,
        totalDeals: deals,
        totalContacts: contacts,
        totalCampaigns: campaigns,
        openDeals: openDeals.length,
        totalRevenue: totalRevenue,
        recentLeads: recentLeads.map(lead => ({
          name: lead.contactPerson || lead.businessName || 'Unknown',
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        })),
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
