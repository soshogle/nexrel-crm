import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyzeConversation, calculateLeadScoreAdjustment, determineNextLeadStatus } from '@/lib/conversation-intelligence';

/**
 * POST /api/conversations/analyze
 * Analyze a call transcript and update lead scoring
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { callLogId } = await req.json();

    if (!callLogId) {
      return NextResponse.json(
        { error: 'Call log ID is required' },
        { status: 400 }
      );
    }

    // Fetch the call log with lead data
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: {
        lead: true,
      },
    });

    if (!callLog) {
      return NextResponse.json(
        { error: 'Call log not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this call log
    if (callLog.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if already analyzed
    if (callLog.conversationAnalysis) {
      return NextResponse.json({
        message: 'Call already analyzed',
        analysis: callLog.conversationAnalysis,
        callLog,
      });
    }

    // Get transcript
    const transcript = callLog.transcript || 'No transcript available';
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
    const updatedCallLog = await prisma.callLog.update({
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
      const newStatus = determineNextLeadStatus(callLog.lead.status, analysis.callOutcome.outcome);

      await prisma.lead.update({
        where: { id: callLog.leadId },
        data: {
          leadScore: newScore,
          status: newStatus,
          lastContactedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      analysis,
      scoreAdjustment,
      callLog: updatedCallLog,
    });
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return NextResponse.json(
      { error: 'Failed to analyze conversation' },
      { status: 500 }
      );
  }
}
