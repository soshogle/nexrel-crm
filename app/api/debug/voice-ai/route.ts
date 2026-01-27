/**
 * Debug endpoint for Voice AI booking system
 * Helps diagnose issues with voice booking and email notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      voiceAgents: [] as any[],
      reservations: [] as any[],
      callLogs: [] as any[],
      emailConnections: [] as any[],
    };

    // Check Voice Agents
    console.log('🔍 Checking voice agents...');
    const agents = await prisma.voiceAgent.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true,
        twilioPhoneNumber: true,
        enableCallRecording: true,
        enableTranscription: true,
        sendRecordingEmail: true,
        recordingEmailAddress: true,
      },
    });

    diagnostics.voiceAgents = agents;

    // Check Reservations (last 10)
    console.log('🔍 Checking reservations...');
    const reservations = await prisma.reservation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        reservationDate: true,
        reservationTime: true,
        partySize: true,
        status: true,
        confirmationCode: true,
        source: true,
        createdAt: true,
      },
    });

    diagnostics.reservations = reservations;

    // Check Call Logs
    console.log('🔍 Checking call logs...');
    const callLogs = await prisma.callLog.findMany({
      where: {
        voiceAgent: { userId: session.user.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fromNumber: true,
        toNumber: true,
        status: true,
        duration: true,
        createdAt: true,
        voiceAgent: {
          select: {
            name: true,
          },
        },
      },
    });

    diagnostics.callLogs = callLogs;

    // Check Email Connections
    console.log('🔍 Checking email connections...');
    const emailConnections = await prisma.channelConnection.findMany({
      where: {
        userId: session.user.id,
        channelType: 'EMAIL',
      },
      select: {
        id: true,
        providerType: true,
        channelIdentifier: true,
        displayName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    diagnostics.emailConnections = emailConnections;

    // Summary
    const summary = {
      voiceAgentsCount: agents.length,
      agentsWithEmailNotifications: agents.filter(a => a.sendRecordingEmail).length,
      totalReservations: reservations.length,
      voiceAIReservations: reservations.filter(r => r.source === 'VOICE_AI').length,
      totalCallLogs: callLogs.length,
      gmailConnected: emailConnections.some(e => e.providerType === 'GMAIL' && e.status === 'CONNECTED'),
      issuesDetected: [] as string[],
    };

    // Detect issues
    if (agents.length === 0) {
      summary.issuesDetected.push('No voice agents configured');
    }

    if (agents.length > 0 && callLogs.length === 0) {
      summary.issuesDetected.push('Voice agents exist but no call logs found - calls may not be working');
    }

    if (agents.some(a => a.sendRecordingEmail) && !summary.gmailConnected) {
      summary.issuesDetected.push('Email notifications enabled but Gmail not properly connected');
    }

    if (callLogs.length > 0 && reservations.filter(r => r.source === 'VOICE_AI').length === 0) {
      summary.issuesDetected.push('Call logs exist but no voice AI reservations found - booking function may not be triggering');
    }

    const emailAgents = agents.filter(a => a.sendRecordingEmail);
    for (const agent of emailAgents) {
      if (!agent.recordingEmailAddress || agent.recordingEmailAddress === '') {
        summary.issuesDetected.push(`Agent "${agent.name}" has email notifications enabled but no recipient email address`);
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      diagnostics,
    });
  } catch (error) {
    console.error('Error in voice AI diagnostics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to run diagnostics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
