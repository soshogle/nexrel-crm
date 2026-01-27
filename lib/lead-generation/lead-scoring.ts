/**
 * Lead Scoring Engine
 * 
 * Implements rule-based lead scoring (0-100 scale) with weighted criteria:
 * - Firmographics: 40%
 * - Intent Signals: 30%
 * - Engagement: 20%
 * - Fit: 10%
 * 
 * This is a pure calculation function, not an LLM call, to minimize token usage.
 */

export interface LeadData {
  // Firmographics
  companySize?: string; // '1-10', '10-50', '50+'
  industry?: string;
  businessAge?: number; // Years in business
  location?: string;
  
  // Intent Signals
  source?: string; // 'google_maps', 'linkedin', 'inbound', 'referral', etc.
  lastEngagement?: Date;
  websiteBehavior?: {
    visitedPricing?: boolean;
    requestedDemo?: boolean;
    downloadedContent?: boolean;
  };
  
  // Engagement
  emailOpens?: number;
  emailClicks?: number;
  emailReplies?: number;
  smsReplies?: number;
  callsAnswered?: number;
  
  // Fit
  budget?: 'high' | 'medium' | 'low' | 'unknown';
  timeline?: 'immediate' | '30-60' | '90+' | 'unknown';
  decisionMaker?: boolean;
  
  // Additional data
  enrichedData?: any;
}

export interface ScoreBreakdown {
  firmographics: number; // 0-40
  intent: number; // 0-30
  engagement: number; // 0-20
  fit: number; // 0-10
  total: number; // 0-100
}

export interface LeadScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  routing: {
    action: 'voice_call' | 'email_sms' | 'email_nurture' | 'monthly_checkin';
    priority: 'hot' | 'warm' | 'cool' | 'cold';
    nextActionDate: Date;
  };
}

/**
 * Calculate lead score based on weighted criteria
 */
export function calculateLeadScore(lead: LeadData): LeadScoreResult {
  const breakdown: ScoreBreakdown = {
    firmographics: scoreFirmographics(lead),
    intent: scoreIntent(lead),
    engagement: scoreEngagement(lead),
    fit: scoreFit(lead),
    total: 0
  };
  
  breakdown.total = Math.min(
    breakdown.firmographics + breakdown.intent + breakdown.engagement + breakdown.fit,
    100
  );
  
  const routing = determineRouting(breakdown.total);
  
  return {
    score: breakdown.total,
    breakdown,
    routing
  };
}

/**
 * Score firmographics (0-40 points)
 */
function scoreFirmographics(lead: LeadData): number {
  let score = 0;
  
  // Company size (0-20 points)
  if (lead.companySize) {
    if (lead.companySize === '50+') score += 20;
    else if (lead.companySize === '10-50') score += 15;
    else if (lead.companySize === '1-10') score += 10;
  }
  
  // Industry match (0-10 points) - simplified, should match against ICP
  if (lead.industry) {
    // High-value industries
    const highValueIndustries = [
      'technology', 'finance', 'healthcare', 'real estate',
      'professional services', 'consulting', 'saas'
    ];
    if (highValueIndustries.some(ind => 
      lead.industry?.toLowerCase().includes(ind.toLowerCase())
    )) {
      score += 10;
    } else {
      score += 5; // Some industry match
    }
  }
  
  // Business age (0-10 points)
  if (lead.businessAge !== undefined) {
    if (lead.businessAge < 1) score += 10; // New businesses are hot leads
    else if (lead.businessAge <= 3) score += 7;
    else score += 5; // Established businesses
  }
  
  return Math.min(score, 40);
}

/**
 * Score intent signals (0-30 points)
 */
function scoreIntent(lead: LeadData): number {
  let score = 0;
  
  // Source quality (0-15 points)
  const sourceScores: Record<string, number> = {
    'inbound': 15,
    'referral': 13,
    'voice_ai': 12,
    'form_submission': 12,
    'linkedin': 8,
    'google_maps': 7,
    'scraped': 5,
    'manual': 5
  };
  if (lead.source) {
    score += sourceScores[lead.source] || 5;
  }
  
  // Website behavior (0-10 points)
  if (lead.websiteBehavior) {
    if (lead.websiteBehavior.requestedDemo) score += 10;
    else if (lead.websiteBehavior.visitedPricing) score += 7;
    else if (lead.websiteBehavior.downloadedContent) score += 5;
  }
  
  // Recency (0-5 points)
  if (lead.lastEngagement) {
    const daysSince = Math.floor(
      (new Date().getTime() - new Date(lead.lastEngagement).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 7) score += 5;
    else if (daysSince <= 30) score += 3;
    else score += 1;
  }
  
  return Math.min(score, 30);
}

/**
 * Score engagement (0-20 points)
 */
function scoreEngagement(lead: LeadData): number {
  let score = 0;
  
  // Email engagement (0-10 points)
  const emailOpens = lead.emailOpens || 0;
  const emailClicks = lead.emailClicks || 0;
  const emailReplies = lead.emailReplies || 0;
  
  if (emailReplies > 0) score += 10; // Replied = very engaged
  else if (emailClicks >= 3) score += 8;
  else if (emailClicks >= 1) score += 5;
  else if (emailOpens >= 3) score += 3;
  else if (emailOpens >= 1) score += 1;
  
  // SMS engagement (0-5 points)
  const smsReplies = lead.smsReplies || 0;
  if (smsReplies > 0) score += 5;
  
  // Call engagement (0-5 points)
  const callsAnswered = lead.callsAnswered || 0;
  if (callsAnswered > 0) score += 5;
  
  return Math.min(score, 20);
}

/**
 * Score fit (0-10 points)
 */
function scoreFit(lead: LeadData): number {
  let score = 0;
  
  // Budget alignment (0-5 points)
  if (lead.budget) {
    if (lead.budget === 'high') score += 5;
    else if (lead.budget === 'medium') score += 3;
    else if (lead.budget === 'low') score += 1;
  }
  
  // Timeline (0-5 points)
  if (lead.timeline) {
    if (lead.timeline === 'immediate') score += 5;
    else if (lead.timeline === '30-60') score += 3;
    else if (lead.timeline === '90+') score += 1;
  }
  
  return Math.min(score, 10);
}

/**
 * Determine routing based on total score
 */
function determineRouting(score: number): LeadScoreResult['routing'] {
  const now = new Date();
  
  if (score >= 80) {
    // Hot lead: Voice AI call within 1 hour
    const nextActionDate = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      action: 'voice_call',
      priority: 'hot',
      nextActionDate
    };
  } else if (score >= 60) {
    // Warm lead: Email + SMS sequence
    const nextActionDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    return {
      action: 'email_sms',
      priority: 'warm',
      nextActionDate
    };
  } else if (score >= 40) {
    // Cool lead: Email nurture sequence
    const nextActionDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    return {
      action: 'email_nurture',
      priority: 'cool',
      nextActionDate
    };
  } else {
    // Cold lead: Monthly check-in
    const nextActionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    return {
      action: 'monthly_checkin',
      priority: 'cold',
      nextActionDate
    };
  }
}

/**
 * Batch score multiple leads at once (for efficiency)
 */
export function batchScoreLeads(leads: LeadData[]): LeadScoreResult[] {
  return leads.map(lead => calculateLeadScore(lead));
}

/**
 * Update lead score in real-time based on new event
 */
export function updateScoreOnEvent(
  currentScore: number,
  currentBreakdown: ScoreBreakdown,
  event: {
    type: 'email_opened' | 'email_clicked' | 'email_replied' | 'sms_replied' | 'call_answered' | 'form_submitted';
    data?: any;
  }
): LeadScoreResult {
  // Adjust engagement score based on event
  let engagementBoost = 0;
  
  switch (event.type) {
    case 'email_opened':
      engagementBoost = 1;
      break;
    case 'email_clicked':
      engagementBoost = 3;
      break;
    case 'email_replied':
      engagementBoost = 10;
      break;
    case 'sms_replied':
      engagementBoost = 5;
      break;
    case 'call_answered':
      engagementBoost = 5;
      break;
    case 'form_submitted':
      engagementBoost = 8;
      break;
  }
  
  const newEngagementScore = Math.min(currentBreakdown.engagement + engagementBoost, 20);
  const newTotal = Math.min(
    currentBreakdown.firmographics + currentBreakdown.intent + newEngagementScore + currentBreakdown.fit,
    100
  );
  
  const breakdown: ScoreBreakdown = {
    ...currentBreakdown,
    engagement: newEngagementScore,
    total: newTotal
  };
  
  return {
    score: newTotal,
    breakdown,
    routing: determineRouting(newTotal)
  };
}
