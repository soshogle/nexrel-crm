/**
 * Auto-analyze calls utility
 * Automatically triggers conversation analysis for completed calls
 */

import { prisma, Prisma } from './db';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService } from '@/lib/dal';
import { analyzeConversation, calculateLeadScoreAdjustment, determineNextLeadStatus } from './conversation-intelligence';

export async function autoAnalyzeCall(callLogId: string) {
  try {
    // Fetch the call log with lead data
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: {
        lead: true,
      },
    });

    if (!callLog) {
      console.error('Call log not found:', callLogId);
      return null;
    }

    // Skip if already analyzed
    if (callLog.conversationAnalysis) {
      return callLog.conversationAnalysis;
    }

    // Get transcript - try both field names
    const transcript = callLog.transcript || callLog.transcription;
    
    // Skip if no transcript
    if (!transcript) {
      console.log('No transcript available for call:', callLogId);
      return null;
    }

    const duration = callLog.duration || 0;

    // Get lead context
    const leadContext = callLog.lead ? {
      status: callLog.lead.status,
      currentScore: callLog.lead.leadScore || 0,
      previousInteractions: await prisma.callLog.count({
        where: {
          leadId: callLog.leadId || undefined,
          id: { not: callLogId },
        },
      }),
    } : undefined;

    // Analyze the conversation
    const analysis = await analyzeConversation(transcript, duration, leadContext);

    // Calculate score adjustment
    const scoreAdjustment = calculateLeadScoreAdjustment(analysis, duration);

    // Update the call log with analysis
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        conversationAnalysis: analysis as any,
        sentiment: analysis.sentiment.overall,
        callOutcome: analysis.callOutcome.outcome,
      },
    });

    // Update lead if exists
    if (callLog.leadId && callLog.lead) {
      const currentLeadScore = callLog.lead.leadScore || 0;
      const newScore = Math.max(0, Math.min(100, currentLeadScore + scoreAdjustment));
      const newStatus = determineNextLeadStatus(callLog.lead.status, analysis.callOutcome.outcome) as any;

      const ctx = createDalContext(callLog.lead.userId);
      await leadService.update(ctx, callLog.leadId, {
        leadScore: newScore,
        status: newStatus,
        lastContactedAt: new Date(),
      });
    }

    return analysis;
  } catch (error) {
    console.error('Error auto-analyzing call:', error);
    return null;
  }
}

/**
 * Batch analyze unanalyzed calls
 */
export async function batchAnalyzeUnanalyzedCalls(userId: string, limit = 10) {
  try {
    // Find completed calls without analysis
    // For JSON fields in Prisma with PostgreSQL, use OR condition with path check
    const unanalyzedCalls = await prisma.callLog.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        OR: [
          { conversationAnalysis: { equals: Prisma.DbNull } },
          { conversationAnalysis: { equals: Prisma.JsonNull } },
        ],
        transcription: { not: null },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${unanalyzedCalls.length} unanalyzed calls`);

    const results = [];
    for (const call of unanalyzedCalls) {
      const analysis = await autoAnalyzeCall(call.id);
      results.push({ callId: call.id, success: !!analysis });
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  } catch (error) {
    console.error('Error in batch analysis:', error);
    return [];
  }
}
