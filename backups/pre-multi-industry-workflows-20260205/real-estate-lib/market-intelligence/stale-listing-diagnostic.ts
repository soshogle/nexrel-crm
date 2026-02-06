/**
 * Stale Listing Diagnostic
 * Analyzes why listings aren't selling and provides action plans
 */

import { prisma } from '@/lib/db';
import { REDiagnosticStatus } from '@prisma/client';

export interface DiagnosticInput {
  userId: string;
  address: string;
  listPrice?: number;
  daysOnMarket: number;
  propertyId?: string;
  fsboListingId?: string;
}

export interface DiagnosticAnalysis {
  topReasons: string[];
  actionPlan: string[];
  clientSummary?: string;
  agentNotes?: string;
  sellerEmailDraft?: string;
  callScript?: string;
}

/**
 * Create a stale listing diagnostic
 */
export async function createStaleDiagnostic(input: DiagnosticInput, analysis: DiagnosticAnalysis) {
  const diagnostic = await prisma.rEStaleDiagnostic.create({
    data: {
      userId: input.userId,
      address: input.address,
      listPrice: input.listPrice,
      daysOnMarket: input.daysOnMarket,
      propertyId: input.propertyId,
      fsboListingId: input.fsboListingId,
      analysisJson: analysis as any,
      topReasons: analysis.topReasons as any,
      actionPlan: analysis.actionPlan as any,
      clientSummary: analysis.clientSummary,
      agentNotes: analysis.agentNotes,
      sellerEmailDraft: analysis.sellerEmailDraft,
      callScript: analysis.callScript,
      status: 'PENDING'
    }
  });
  return { success: true, diagnostic };
}

/**
 * Analyze a listing and generate diagnostic
 */
export async function analyzeStaleListing(userId: string, listingId: string) {
  const listing = await prisma.rEFSBOListing.findFirst({
    where: { id: listingId, assignedUserId: userId }
  });

  if (!listing) {
    return { success: false, error: 'Listing not found' };
  }

  // Generate analysis based on listing data
  const topReasons: string[] = [];
  const actionPlan: string[] = [];

  if (listing.daysOnMarket > 60) {
    topReasons.push('Extended time on market suggests pricing or condition issues');
    actionPlan.push('Consider price adjustment of 3-5% based on recent comparables');
  }

  if (listing.daysOnMarket > 30 && listing.daysOnMarket <= 60) {
    topReasons.push('Listing has been on market longer than average');
    actionPlan.push('Review marketing strategy and online presence');
  }

  if (!listing.sellerPhone && !listing.sellerEmail) {
    topReasons.push('No seller contact information available');
    actionPlan.push('Research alternative contact methods');
  }

  if (!listing.description || listing.description.length < 100) {
    topReasons.push('Listing description may be insufficient');
    actionPlan.push('Suggest enhanced marketing copy highlighting key features');
  }

  if (!listing.photos) {
    topReasons.push('No listing photos available');
    actionPlan.push('Recommend professional photography');
  }

  // Default items if none detected
  if (topReasons.length === 0) {
    topReasons.push('Market conditions may be affecting sale time');
  }
  if (actionPlan.length === 0) {
    actionPlan.push('Schedule follow-up call with seller');
    actionPlan.push('Prepare CMA to reassess pricing');
  }

  const analysis: DiagnosticAnalysis = {
    topReasons,
    actionPlan,
    clientSummary: `This listing at ${listing.address} has been on the market for ${listing.daysOnMarket} days. Our analysis has identified ${topReasons.length} potential factors affecting the sale.`,
    agentNotes: 'Automated analysis - review and customize before client contact.',
    sellerEmailDraft: `Dear ${listing.sellerName || 'Homeowner'},\n\nI noticed your property at ${listing.address} has been on the market for ${listing.daysOnMarket} days. I'd like to share some insights that could help attract more qualified buyers.\n\nWould you have 15 minutes this week for a quick call?\n\nBest regards`,
    callScript: `Hi, this is [Your Name]. I'm reaching out about your property at ${listing.address}. I specialize in helping FSBO sellers and noticed your listing has been on the market for a while. I have some market insights that might be helpful - do you have a few minutes to chat?`
  };

  // Save the diagnostic
  return createStaleDiagnostic(
    {
      userId,
      address: listing.address,
      listPrice: listing.listPrice || undefined,
      daysOnMarket: listing.daysOnMarket,
      fsboListingId: listing.id
    },
    analysis
  );
}

/**
 * Get user's diagnostics
 */
export async function getUserDiagnostics(userId: string, limit = 50) {
  return prisma.rEStaleDiagnostic.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Update diagnostic status
 */
export async function updateDiagnosticStatus(id: string, userId: string, status: REDiagnosticStatus) {
  const data: any = { status };
  if (status === 'REVIEWED') data.reviewedAt = new Date();
  if (status === 'ACTIONED') data.actionedAt = new Date();

  await prisma.rEStaleDiagnostic.updateMany({
    where: { id, userId },
    data
  });
  return { success: true };
}
