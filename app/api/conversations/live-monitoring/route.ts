import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/conversations/live-monitoring
 * Get real-time monitoring data for active calls
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'IN_PROGRESS';
    // Map common status strings to valid enum values
    const statusMap: Record<string, 'INITIATED' | 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY'> = {
      'in-progress': 'IN_PROGRESS',
      'in_progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'initiated': 'INITIATED',
      'ringing': 'RINGING',
      'failed': 'FAILED',
      'no_answer': 'NO_ANSWER',
      'busy': 'BUSY',
    };
    const status = statusMap[statusParam.toLowerCase()] || (statusParam.toUpperCase() as 'INITIATED' | 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY');

    // Fetch active calls
    const activeCalls = await prisma.callLog.findMany({
      where: {
        userId: session.user.id,
        status: status,
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
            status: true,
            leadScore: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Transform for real-time monitoring
    const monitoringData = activeCalls.map((call) => ({
      callId: call.id,
      leadId: call.leadId,
      leadName: call.lead?.contactPerson || call.lead?.businessName || 'Unknown',
      leadCompany: call.lead?.businessName || '',
      phoneNumber: call.phoneNumber,
      status: call.status,
      duration: call.duration || 0,
      createdAt: call.createdAt,
      sentiment: call.sentiment || 'neutral',
      callOutcome: call.callOutcome || 'unknown',
      transcript: call.transcript || '',
      recordingUrl: call.recordingUrl,
    }));

    return NextResponse.json({
      success: true,
      calls: monitoringData,
      totalActive: monitoringData.length,
    });
  } catch (error) {
    console.error('Error fetching live monitoring data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
