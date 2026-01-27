/**
 * Stale Listing Diagnostic
 * Analyzes why listings aren't selling
 */

import { prisma } from '@/lib/db';
import type { REDiagnosticStatus } from '../types';

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

export async function createStaleDiagnostic(
  input: DiagnosticInput,
  analysis: DiagnosticAnalysis
): Promise<{ success: boolean; diagnostic?: any; error?: string }> {
  try {
    const diagnostic = await prisma.rEStaleDiagnostic.create({
      data: {
        userId: input.userId,
        address: input.address,
        listPrice: input.listPrice,
        daysOnMarket: input.daysOnMarket,
        propertyId: input.propertyId,
        fsboListingId: input.fsboListingId,
        analysisJson: JSON.parse(JSON.stringify(analysis)),
        topReasons: JSON.parse(JSON.stringify(analysis.topReasons)),
        actionPlan: JSON.parse(JSON.stringify(analysis.actionPlan)),
        clientSummary: analysis.clientSummary,
        agentNotes: analysis.agentNotes,
        sellerEmailDraft: analysis.sellerEmailDraft,
        callScript: analysis.callScript,
        status: 'PENDING' as REDiagnosticStatus
      }
    });

    return { success: true, diagnostic };
  } catch (error: any) {
    console.error('Error creating diagnostic:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserDiagnostics(userId: string, limit = 50) {
  try {
    return await prisma.rEStaleDiagnostic.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    return [];
  }
}

export async function getDiagnosticById(id: string, userId: string) {
  try {
    return await prisma.rEStaleDiagnostic.findFirst({
      where: { id, userId }
    });
  } catch (error) {
    console.error('Error fetching diagnostic:', error);
    return null;
  }
}

export async function updateDiagnosticStatus(
  id: string, 
  userId: string, 
  status: REDiagnosticStatus
) {
  try {
    const updateData: any = { status };
    if (status === 'COMPLETED') {
      updateData.reviewedAt = new Date();
    }
    
    await prisma.rEStaleDiagnostic.updateMany({
      where: { id, userId },
      data: updateData
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStaleListings(userId: string, minDays = 30) {
  try {
    // Get FSBO listings that are stale
    const staleListings = await prisma.rEFSBOListing.findMany({
      where: {
        assignedUserId: userId,
        daysOnMarket: { gte: minDays },
        status: { not: 'CONVERTED' }
      },
      orderBy: { daysOnMarket: 'desc' },
      take: 100
    });

    return staleListings;
  } catch (error) {
    console.error('Error fetching stale listings:', error);
    return [];
  }
}

export async function analyzeStaleListing(
  userId: string,
  listingId: string
): Promise<{ success: boolean; analysis?: DiagnosticAnalysis; error?: string }> {
  try {
    const listing = await prisma.rEFSBOListing.findFirst({
      where: { id: listingId, assignedUserId: userId }
    });

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    // Basic analysis based on listing data
    const topReasons: string[] = [];
    const actionPlan: string[] = [];

    if (listing.daysOnMarket > 60) {
      topReasons.push('Extended time on market suggests pricing or condition issues');
      actionPlan.push('Consider price adjustment based on recent comparables');
    }

    if (!listing.sellerPhone && !listing.sellerEmail) {
      topReasons.push('No seller contact information available');
      actionPlan.push('Attempt to find contact information through other sources');
    }

    if (!listing.description || listing.description.length < 100) {
      topReasons.push('Minimal listing description may reduce buyer interest');
      actionPlan.push('Suggest enhanced marketing copy to seller');
    }

    const analysis: DiagnosticAnalysis = {
      topReasons,
      actionPlan,
      clientSummary: `This listing has been on the market for ${listing.daysOnMarket} days.`,
      agentNotes: 'Automated analysis - review and customize before client contact.'
    };

    return { success: true, analysis };
  } catch (error: any) {
    console.error('Error analyzing listing:', error);
    return { success: false, error: error.message };
  }
}
