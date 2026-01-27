/**
 * Database operations for lead scoring
 */

import { PrismaClient } from '@prisma/client';
import { calculateLeadScore, LeadData, LeadScoreResult } from './lead-scoring';

const prisma = new PrismaClient();

/**
 * Score a lead and save to database
 */
export async function scoreAndSaveLead(leadId: string): Promise<LeadScoreResult> {
  // Fetch lead from database
  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });
  
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }
  
  // Prepare lead data for scoring
  const enrichedData = lead.enrichedData as any;
  const engagementHistory = lead.engagementHistory as any;
  
  const leadData: LeadData = {
    companySize: enrichedData?.companySize,
    industry: lead.businessCategory || enrichedData?.industry,
    businessAge: enrichedData?.businessAge,
    location: (lead.city || lead.state) || undefined,
    source: lead.source,
    lastEngagement: lead.lastContactedAt || undefined,
    websiteBehavior: engagementHistory?.websiteBehavior,
    emailOpens: engagementHistory?.emailOpens || 0,
    emailClicks: engagementHistory?.emailClicks || 0,
    emailReplies: engagementHistory?.emailReplies || 0,
    smsReplies: engagementHistory?.smsReplies || 0,
    callsAnswered: engagementHistory?.callsAnswered || 0,
    budget: enrichedData?.budget,
    timeline: enrichedData?.timeline,
    decisionMaker: enrichedData?.decisionMaker,
    enrichedData: lead.enrichedData
  };
  
  // Calculate score
  const result = calculateLeadScore(leadData);
  
  // Update lead in database
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: result.score,
      nextAction: result.routing.action,
      nextActionDate: result.routing.nextActionDate
    }
  });
  
  // Save score history
  await prisma.leadScore.create({
    data: {
      leadId,
      score: result.score,
      scoreBreakdown: result.breakdown as any
    }
  });
  
  return result;
}

/**
 * Batch score multiple leads
 */
export async function batchScoreLeads(
  userId: string,
  filter?: {
    source?: string;
    status?: string;
    minScore?: number;
    maxScore?: number;
  }
): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const whereClause: any = {
    userId
  };
  
  if (filter?.source) {
    whereClause.source = filter.source;
  }
  
  if (filter?.status) {
    whereClause.status = filter.status;
  }
  
  // Fetch leads
  const leads = await prisma.lead.findMany({
    where: whereClause,
    select: {
      id: true,
      businessCategory: true,
      city: true,
      state: true,
      source: true,
      lastContactedAt: true,
      enrichedData: true,
      engagementHistory: true
    }
  });
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (lead) => {
        try {
          const enrichedData = lead.enrichedData as any;
          const engagementHistory = lead.engagementHistory as any;
          
          const leadData: LeadData = {
            companySize: enrichedData?.companySize,
            industry: lead.businessCategory || enrichedData?.industry,
            businessAge: enrichedData?.businessAge,
            location: (lead.city || lead.state) || undefined,
            source: lead.source,
            lastEngagement: lead.lastContactedAt || undefined,
            websiteBehavior: engagementHistory?.websiteBehavior,
            emailOpens: engagementHistory?.emailOpens || 0,
            emailClicks: engagementHistory?.emailClicks || 0,
            emailReplies: engagementHistory?.emailReplies || 0,
            smsReplies: engagementHistory?.smsReplies || 0,
            callsAnswered: engagementHistory?.callsAnswered || 0,
            budget: enrichedData?.budget,
            timeline: enrichedData?.timeline,
            decisionMaker: enrichedData?.decisionMaker,
            enrichedData: lead.enrichedData
          };
          
          const result = calculateLeadScore(leadData);
          
          // Update lead
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              leadScore: result.score,
              nextAction: result.routing.action,
              nextActionDate: result.routing.nextActionDate
            }
          });
          
          // Save score history
          await prisma.leadScore.create({
            data: {
              leadId: lead.id,
              score: result.score,
              scoreBreakdown: result.breakdown as any
            }
          });
          
          processed++;
          updated++;
        } catch (error) {
          console.error(`Error scoring lead ${lead.id}:`, error);
          errors++;
          processed++;
        }
      })
    );
  }
  
  return { processed, updated, errors };
}

/**
 * Get lead score history
 */
export async function getLeadScoreHistory(leadId: string) {
  return await prisma.leadScore.findMany({
    where: { leadId },
    orderBy: { calculatedAt: 'desc' },
    take: 10
  });
}

/**
 * Get leads by score range
 */
export async function getLeadsByScore(
  userId: string,
  minScore: number,
  maxScore: number = 100
) {
  return await prisma.lead.findMany({
    where: {
      userId,
      leadScore: {
        gte: minScore,
        lte: maxScore
      }
    },
    orderBy: {
      leadScore: 'desc'
    }
  });
}

/**
 * Get hot leads (score >= 80)
 */
export async function getHotLeads(userId: string) {
  return await getLeadsByScore(userId, 80, 100);
}

/**
 * Get warm leads (score 60-79)
 */
export async function getWarmLeads(userId: string) {
  return await getLeadsByScore(userId, 60, 79);
}

/**
 * Get cool leads (score 40-59)
 */
export async function getCoolLeads(userId: string) {
  return await getLeadsByScore(userId, 40, 59);
}

/**
 * Update lead score on engagement event
 */
export async function updateLeadScoreOnEvent(
  leadId: string,
  event: {
    type: 'email_opened' | 'email_clicked' | 'email_replied' | 'sms_replied' | 'call_answered' | 'form_submitted';
    data?: any;
  }
) {
  // Fetch current lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });
  
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }
  
  // Update engagement history
  const engagementHistory: any = lead.engagementHistory || {};
  
  switch (event.type) {
    case 'email_opened':
      engagementHistory.emailOpens = (engagementHistory.emailOpens || 0) + 1;
      break;
    case 'email_clicked':
      engagementHistory.emailClicks = (engagementHistory.emailClicks || 0) + 1;
      break;
    case 'email_replied':
      engagementHistory.emailReplies = (engagementHistory.emailReplies || 0) + 1;
      break;
    case 'sms_replied':
      engagementHistory.smsReplies = (engagementHistory.smsReplies || 0) + 1;
      break;
    case 'call_answered':
      engagementHistory.callsAnswered = (engagementHistory.callsAnswered || 0) + 1;
      break;
  }
  
  // Update last contacted
  const now = new Date();
  
  // Recalculate score
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      engagementHistory,
      lastContactedAt: now
    }
  });
  
  // Re-score the lead
  return await scoreAndSaveLead(leadId);
}
