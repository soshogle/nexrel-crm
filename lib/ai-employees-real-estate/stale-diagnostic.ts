/**
 * Stale Listing Diagnostic AI Employee
 * Analyzes why listings haven't sold and generates action plans
 */

import { prisma } from '@/lib/db';
import { aiOrchestrator } from '@/lib/ai-employee-orchestrator';
import { AIEmployeeType } from '@prisma/client';
import { getREEmployeeConfig } from './configs';

interface StaleDiagnosticInput {
  userId: string;
  propertyId?: string;
  address: string;
  listPrice: number;
  daysOnMarket: number;
  originalPrice?: number;
  showingCount?: number;
  feedbackSummary?: string;
  photoCount?: number;
  descriptionLength?: number;
}

interface DiagnosticIssue {
  category: 'PRICING' | 'MARKETING' | 'CONDITION' | 'LOCATION' | 'TIMING';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string;
  recommendation: string;
}

interface StaleDiagnosticOutput {
  diagnosticId: string;
  propertyAddress: string;
  daysOnMarket: number;
  issues: DiagnosticIssue[];
  topReasons: string[];
  actionPlan: Array<{ priority: number; action: string; timeline: string }>;
  priceRecommendation?: {
    currentPrice: number;
    suggestedPrice: number;
    reduction: number;
    percentReduction: number;
  };
  clientSummary: string;
  sellerEmailDraft: string;
  callScript: string;
}

/**
 * Run stale listing diagnostic
 */
export async function runStaleDiagnostic(input: StaleDiagnosticInput): Promise<StaleDiagnosticOutput> {
  const config = getREEmployeeConfig('RE_STALE_DIAGNOSTIC' as AIEmployeeType);
  
  console.log(`🔍 Stale Diagnostic: Analyzing ${input.address} (${input.daysOnMarket} DOM)`);
  
  // Analyze the listing
  const issues = await analyzeListingIssues(input);
  
  // Rank top reasons
  const topReasons = issues
    .filter(i => i.severity === 'HIGH')
    .map(i => i.issue)
    .slice(0, 3);
  
  // Generate action plan
  const actionPlan = generateActionPlan(issues);
  
  // Price recommendation if needed
  const priceRecommendation = analyzePricing(input, issues);
  
  // Generate client communications
  const clientSummary = generateClientSummary(input, issues, actionPlan);
  const sellerEmailDraft = generateSellerEmail(input, issues, actionPlan);
  const callScript = generateCallScript(input, issues, actionPlan);
  
  // Save diagnostic
  const diagnostic = await prisma.rEStaleDiagnostic.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      address: input.address,
      listPrice: input.listPrice,
      daysOnMarket: input.daysOnMarket,
      analysisJson: JSON.parse(JSON.stringify({ issues, showingCount: input.showingCount })),
      topReasons: topReasons as any,
      actionPlan: actionPlan as any,
      clientSummary,
      sellerEmailDraft,
      callScript,
      status: 'PENDING'
    }
  });
  
  // Log execution
  await prisma.rEAIEmployeeExecution.create({
    data: {
      userId: input.userId,
      employeeType: 'STALE_DIAGNOSTIC',
      employeeName: config?.name || 'Stale Diagnostic',
      targetType: 'property',
      targetId: input.propertyId || diagnostic.id,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      result: { diagnosticId: diagnostic.id } as any
    }
  });
  
  console.log(`✅ Diagnostic completed: ${diagnostic.id}`);
  
  return {
    diagnosticId: diagnostic.id,
    propertyAddress: input.address,
    daysOnMarket: input.daysOnMarket,
    issues,
    topReasons,
    actionPlan,
    priceRecommendation,
    clientSummary,
    sellerEmailDraft,
    callScript
  };
}

/**
 * Analyze listing for issues
 */
async function analyzeListingIssues(input: StaleDiagnosticInput): Promise<DiagnosticIssue[]> {
  const issues: DiagnosticIssue[] = [];
  
  // Pricing analysis
  if (input.originalPrice && input.listPrice === input.originalPrice && input.daysOnMarket > 21) {
    issues.push({
      category: 'PRICING',
      severity: 'HIGH',
      issue: 'No price adjustments despite extended market time',
      recommendation: 'Consider a strategic price reduction of 3-5% to generate renewed interest'
    });
  }
  
  // Showing analysis
  if (input.showingCount !== undefined) {
    const showingsPerWeek = input.showingCount / (input.daysOnMarket / 7);
    if (showingsPerWeek < 2) {
      issues.push({
        category: 'MARKETING',
        severity: 'HIGH',
        issue: `Low showing activity (${showingsPerWeek.toFixed(1)} showings/week)`,
        recommendation: 'Increase online exposure, refresh photos, and consider open houses'
      });
    } else if (showingsPerWeek > 5 && input.daysOnMarket > 30) {
      issues.push({
        category: 'PRICING',
        severity: 'HIGH',
        issue: 'High showing activity but no offers suggests pricing issue',
        recommendation: 'Buyers are interested but balking at price - consider reduction'
      });
    }
  }
  
  // Photo quality (placeholder - would use AI image analysis)
  if (input.photoCount !== undefined && input.photoCount < 20) {
    issues.push({
      category: 'MARKETING',
      severity: 'MEDIUM',
      issue: `Limited photos (${input.photoCount}) - MLS average is 25-30`,
      recommendation: 'Add more high-quality photos, especially of key features'
    });
  }
  
  // Description analysis
  if (input.descriptionLength !== undefined && input.descriptionLength < 200) {
    issues.push({
      category: 'MARKETING',
      severity: 'LOW',
      issue: 'Property description is too brief',
      recommendation: 'Expand description with lifestyle benefits and unique features'
    });
  }
  
  // Days on market thresholds
  if (input.daysOnMarket > 60) {
    issues.push({
      category: 'TIMING',
      severity: 'HIGH',
      issue: 'Extended days on market creates negative buyer perception',
      recommendation: 'Consider withdrawing and relisting to reset DOM counter'
    });
  } else if (input.daysOnMarket > 30) {
    issues.push({
      category: 'TIMING',
      severity: 'MEDIUM',
      issue: 'Approaching critical 30-day threshold',
      recommendation: 'Take action now before buyer perception worsens'
    });
  }
  
  // Feedback analysis
  if (input.feedbackSummary) {
    if (input.feedbackSummary.toLowerCase().includes('price')) {
      issues.push({
        category: 'PRICING',
        severity: 'HIGH',
        issue: 'Buyer feedback consistently mentions pricing concerns',
        recommendation: 'Address pricing based on direct market feedback'
      });
    }
    if (input.feedbackSummary.toLowerCase().includes('condition') || 
        input.feedbackSummary.toLowerCase().includes('dated')) {
      issues.push({
        category: 'CONDITION',
        severity: 'MEDIUM',
        issue: 'Buyer feedback indicates condition concerns',
        recommendation: 'Consider minor updates or adjust price to reflect condition'
      });
    }
  }
  
  // Sort by severity
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return issues;
}

/**
 * Generate prioritized action plan
 */
function generateActionPlan(issues: DiagnosticIssue[]): Array<{ priority: number; action: string; timeline: string }> {
  const plan: Array<{ priority: number; action: string; timeline: string }> = [];
  let priority = 1;
  
  // Add actions based on issues
  const highPriorityIssues = issues.filter(i => i.severity === 'HIGH');
  const mediumPriorityIssues = issues.filter(i => i.severity === 'MEDIUM');
  
  for (const issue of highPriorityIssues) {
    plan.push({
      priority: priority++,
      action: issue.recommendation,
      timeline: 'Immediate (within 48 hours)'
    });
  }
  
  for (const issue of mediumPriorityIssues) {
    plan.push({
      priority: priority++,
      action: issue.recommendation,
      timeline: 'This week'
    });
  }
  
  // Always recommend these if not already covered
  if (!plan.some(p => p.action.toLowerCase().includes('photo'))) {
    plan.push({
      priority: priority++,
      action: 'Review and refresh listing photos',
      timeline: 'Within 1 week'
    });
  }
  
  return plan.slice(0, 5); // Top 5 actions
}

/**
 * Analyze pricing and generate recommendation
 */
function analyzePricing(input: StaleDiagnosticInput, issues: DiagnosticIssue[]): {
  currentPrice: number;
  suggestedPrice: number;
  reduction: number;
  percentReduction: number;
} | undefined {
  const pricingIssues = issues.filter(i => i.category === 'PRICING' && i.severity === 'HIGH');
  
  if (pricingIssues.length === 0) return undefined;
  
  // Calculate recommended reduction based on DOM
  let reductionPercent = 0;
  if (input.daysOnMarket > 60) {
    reductionPercent = 0.07; // 7%
  } else if (input.daysOnMarket > 45) {
    reductionPercent = 0.05; // 5%
  } else if (input.daysOnMarket > 21) {
    reductionPercent = 0.03; // 3%
  }
  
  const reduction = Math.round(input.listPrice * reductionPercent);
  const suggestedPrice = input.listPrice - reduction;
  
  return {
    currentPrice: input.listPrice,
    suggestedPrice,
    reduction,
    percentReduction: reductionPercent * 100
  };
}

/**
 * Generate client-facing summary
 */
function generateClientSummary(
  input: StaleDiagnosticInput,
  issues: DiagnosticIssue[],
  actionPlan: Array<{ priority: number; action: string; timeline: string }>
): string {
  const highCount = issues.filter(i => i.severity === 'HIGH').length;
  
  let summary = `**Listing Analysis for ${input.address}**\n\n`;
  summary += `Your home has been on the market for ${input.daysOnMarket} days. `;
  
  if (highCount > 0) {
    summary += `Our analysis identified ${highCount} area(s) that need immediate attention.\n\n`;
  } else {
    summary += `The listing is performing reasonably well, but we see opportunities to improve.\n\n`;
  }
  
  summary += `**Recommended Actions:**\n`;
  for (const action of actionPlan.slice(0, 3)) {
    summary += `${action.priority}. ${action.action} (${action.timeline})\n`;
  }
  
  return summary;
}

/**
 * Generate seller email draft
 */
function generateSellerEmail(
  input: StaleDiagnosticInput,
  issues: DiagnosticIssue[],
  actionPlan: Array<{ priority: number; action: string; timeline: string }>
): string {
  return `Subject: ${input.address} - Market Update & Action Plan

Dear [Seller Name],

I wanted to provide you with an update on your listing at ${input.address}.

As we approach ${input.daysOnMarket} days on market, I've conducted a comprehensive analysis of your listing's performance and current market conditions.

**Key Findings:**
${issues.slice(0, 3).map(i => `• ${i.issue}`).join('\n')}

**My Recommendations:**
${actionPlan.slice(0, 3).map(a => `${a.priority}. ${a.action}`).join('\n')}

I'd like to schedule a brief call to discuss these findings and our strategy moving forward. Are you available this week?

Best regards,
[Agent Name]
[Phone]
[Email]`;
}

/**
 * Generate phone call script
 */
function generateCallScript(
  input: StaleDiagnosticInput,
  issues: DiagnosticIssue[],
  actionPlan: Array<{ priority: number; action: string; timeline: string }>
): string {
  const topIssue = issues[0];
  
  return `**Call Script for ${input.address} Seller**

[Opening]
"Hi [Seller Name], this is [Agent Name]. Do you have a few minutes to discuss your listing?"

[Transition]
"Great. As we're at ${input.daysOnMarket} days on market, I've been analyzing what's happening with your property and similar homes in the area."

[Main Point]
"The main thing I'm seeing is: ${topIssue?.issue || 'We have some opportunities to improve'}"

[Ask Permission]
"I have some ideas that I think could help. Would you be open to hearing my recommendations?"

[Present Solution]
"My top recommendation is: ${actionPlan[0]?.action || 'Let\'s review our strategy together'}"

[Handle Objection if Price Reduction]
If they resist: "I completely understand. Let me share what the market data is telling us..."

[Close]
"When would be a good time for us to meet and go over this in detail?"  `;
}

/**
 * Create stale diagnostic job
 */
export async function createStaleDiagnosticJob(input: StaleDiagnosticInput) {
  return await aiOrchestrator.createJob({
    userId: input.userId,
    employeeType: 'RE_STALE_DIAGNOSTIC' as AIEmployeeType,
    jobType: 'stale_listing_diagnostic',
    input,
    priority: 'MEDIUM',
    estimatedTime: 20
  });
}
