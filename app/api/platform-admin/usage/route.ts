import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/platform-admin/usage - Get usage statistics for all users or specific user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verify super admin access
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Super Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    if (userId) {
      // Get usage for specific user
      const usage = await getUserUsageStats(userId, startDate);
      return NextResponse.json(usage);
    } else {
      // Get usage for all users
      const users = await prisma.user.findMany({
        where: {
          role: { not: 'SUPER_ADMIN' },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          industry: true,
          businessCategory: true,
        },
      });

      const usageStats = await Promise.all(
        users.map(async (user) => {
          const stats = await getUserUsageStats(user.id, startDate);
          return {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              industry: user.industry,
              businessCategory: user.businessCategory,
            },
            ...stats,
          };
        })
      );

      // Sort by total cost descending
      usageStats.sort((a, b) => b.totalCost - a.totalCost);

      return NextResponse.json({
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        users: usageStats,
      });
    }
  } catch (error: any) {
    console.error('Error fetching usage statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics', details: error.message },
      { status: 500 }
    );
  }
}

async function getUserUsageStats(userId: string, startDate: Date) {
  const now = new Date();
  
  // Phone Call Statistics
  const callLogs = await prisma.callLog.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    select: {
      duration: true,
      status: true,
      direction: true,
      createdAt: true,
    },
  });

  const totalCalls = callLogs.length;
  const completedCalls = callLogs.filter((c) => c.status === 'COMPLETED').length;
  const totalCallMinutes = callLogs.reduce((sum, c) => sum + (c.duration || 0), 0) / 60;
  const inboundCalls = callLogs.filter((c) => c.direction === 'INBOUND').length;
  const outboundCalls = callLogs.filter((c) => c.direction === 'OUTBOUND').length;
  
  // Estimate call costs (adjust rates as needed)
  const callCostPerMinute = 0.02; // $0.02 per minute
  const callCosts = totalCallMinutes * callCostPerMinute;

  // SMS Statistics
  const smsMessages = await prisma.conversationMessage.findMany({
    where: {
      conversation: {
        userId,
        channelConnection: {
          channelType: 'SMS',
        },
      },
      createdAt: { gte: startDate },
    },
    select: {
      direction: true,
      createdAt: true,
    },
  });

  const totalSMS = smsMessages.length;
  const inboundSMS = smsMessages.filter((m) => m.direction === 'INBOUND').length;
  const outboundSMS = smsMessages.filter((m) => m.direction === 'OUTBOUND').length;
  
  // Estimate SMS costs
  const smsCostPerMessage = 0.01; // $0.01 per SMS
  const smsCosts = totalSMS * smsCostPerMessage;

  // Email Statistics
  const emailMessages = await prisma.conversationMessage.findMany({
    where: {
      conversation: {
        userId,
        channelConnection: {
          channelType: 'EMAIL',
        },
      },
      createdAt: { gte: startDate },
    },
    select: {
      direction: true,
      createdAt: true,
    },
  });

  const totalEmails = emailMessages.length;
  const inboundEmails = emailMessages.filter((m) => m.direction === 'INBOUND').length;
  const outboundEmails = emailMessages.filter((m) => m.direction === 'OUTBOUND').length;
  
  // Email costs (typically lower than SMS)
  const emailCostPerMessage = 0.001; // $0.001 per email
  const emailCosts = totalEmails * emailCostPerMessage;

  // AI/LLM Token Usage Estimation
  // We'll estimate based on conversation messages and call transcriptions
  const aiConversations = await prisma.conversationMessage.findMany({
    where: {
      conversation: {
        userId,
      },
      createdAt: { gte: startDate },
    },
    select: {
      content: true,
    },
  });

  const transcriptions = callLogs
    .map((c) => c as any)
    .filter((c) => c.transcription)
    .map((c) => c.transcription);

  // Rough token estimation: 1 token ~= 4 characters
  const totalCharacters =
    aiConversations.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) +
    transcriptions.reduce((sum, t) => sum + (t?.length || 0), 0);
  
  const estimatedTokens = Math.ceil(totalCharacters / 4);
  
  // Token costs (adjust based on your LLM provider)
  const tokenCostPer1k = 0.002; // $0.002 per 1k tokens (GPT-3.5 Turbo rate)
  const aiTokenCosts = (estimatedTokens / 1000) * tokenCostPer1k;

  // Voice Agent Usage
  const voiceAgentCount = await prisma.voiceAgent.count({
    where: { userId },
  });

  // Storage Usage (approximate)
  const recordingsCount = callLogs.filter((c) => c.status === 'COMPLETED').length;
  const storageGB = recordingsCount * 0.05; // ~50MB per recording
  const storageCostPerGB = 0.05; // $0.05 per GB
  const storageCosts = storageGB * storageCostPerGB;

  // Total Costs
  const totalCost = callCosts + smsCosts + emailCosts + aiTokenCosts + storageCosts;

  // Daily breakdown for the last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const dayCalls = callLogs.filter(
      (c) => c.createdAt >= dayStart && c.createdAt <= dayEnd
    ).length;
    const daySMS = smsMessages.filter(
      (m) => m.createdAt >= dayStart && m.createdAt <= dayEnd
    ).length;
    const dayEmails = emailMessages.filter(
      (m) => m.createdAt >= dayStart && m.createdAt <= dayEnd
    ).length;

    last7Days.push({
      date: dayStart.toISOString().split('T')[0],
      calls: dayCalls,
      sms: daySMS,
      emails: dayEmails,
    });
  }

  return {
    calls: {
      total: totalCalls,
      completed: completedCalls,
      inbound: inboundCalls,
      outbound: outboundCalls,
      totalMinutes: Math.round(totalCallMinutes),
      estimatedCost: Number(callCosts.toFixed(2)),
    },
    sms: {
      total: totalSMS,
      inbound: inboundSMS,
      outbound: outboundSMS,
      estimatedCost: Number(smsCosts.toFixed(2)),
    },
    emails: {
      total: totalEmails,
      inbound: inboundEmails,
      outbound: outboundEmails,
      estimatedCost: Number(emailCosts.toFixed(2)),
    },
    ai: {
      estimatedTokens,
      estimatedCost: Number(aiTokenCosts.toFixed(2)),
    },
    storage: {
      recordings: recordingsCount,
      sizeGB: Number(storageGB.toFixed(2)),
      estimatedCost: Number(storageCosts.toFixed(2)),
    },
    voiceAgents: voiceAgentCount,
    totalCost: Number(totalCost.toFixed(2)),
    dailyBreakdown: last7Days,
  };
}
