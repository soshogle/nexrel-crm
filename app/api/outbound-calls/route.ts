
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { initiateOutboundCall } from '@/lib/twilio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/outbound-calls - List all outbound calls
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const voiceAgentId = searchParams.get('voiceAgentId');
    const status = searchParams.get('status');

    const where: any = { userId: user.id };
    if (voiceAgentId) where.voiceAgentId = voiceAgentId;
    if (status) where.status = status;

    const outboundCalls = await prisma.outboundCall.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        voiceAgent: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
          },
        },
        callLog: {
          select: {
            id: true,
            status: true,
            duration: true,
            outcome: true,
          },
        },
      },
    });

    return NextResponse.json(outboundCalls || []);
  } catch (error: any) {
    console.error('Error fetching outbound calls:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    // Return empty array on error to prevent filter crashes
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/outbound-calls - Schedule/Initiate an outbound call
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      voiceAgentId,
      leadId,
      name,
      phoneNumber,
      scheduledFor,
      maxAttempts,
      purpose,
      notes,
      customVariables,
      immediate = false, // If true, make call immediately
    } = body;

    // Validate required fields
    if (!voiceAgentId || !name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: voiceAgentId, name, phoneNumber' },
        { status: 400 }
      );
    }

    // Verify voice agent exists and belongs to user
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: {
        id: voiceAgentId,
        userId: user.id,
      },
    });

    if (!voiceAgent) {
      return NextResponse.json(
        { error: 'Voice agent not found' },
        { status: 404 }
      );
    }

    // Check if agent has ElevenLabs agent ID
    if (!voiceAgent.elevenLabsAgentId) {
      return NextResponse.json(
        { error: 'Voice agent is not configured properly. Please complete the voice AI setup.' },
        { status: 400 }
      );
    }

    // Validate agent exists in ElevenLabs before trying to make a call
    console.log('🔍 Validating agent exists in ElevenLabs:', voiceAgent.elevenLabsAgentId);
    const { elevenLabsProvisioning } = await import('@/lib/elevenlabs-provisioning');
    const validation = await elevenLabsProvisioning.validateAgentSetup(voiceAgent.elevenLabsAgentId, user.id);
    
    if (!validation.valid) {
      console.error('❌ Agent validation failed:', validation.error);
      return NextResponse.json(
        { 
          error: 'Voice agent not found in ElevenLabs. The agent may have been deleted or not properly configured.',
          details: validation.error,
          suggestion: 'Please delete this agent and create a new one, or use the "Auto-Configure" button to recreate it.'
        },
        { status: 400 }
      );
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('⚠️  Agent validation warnings:', validation.warnings);
    }
    
    console.log('✅ Agent validated successfully in ElevenLabs');

    // Create outbound call record
    const outboundCall = await prisma.outboundCall.create({
      data: {
        userId: user.id,
        voiceAgentId,
        leadId,
        name,
        phoneNumber,
        status: immediate ? 'IN_PROGRESS' : 'SCHEDULED',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        maxAttempts: maxAttempts || 3,
        purpose,
        notes,
        customVariables,
      },
      include: {
        voiceAgent: true,
      },
    });

    // If immediate call requested, initiate it now
    if (immediate && voiceAgent.elevenLabsAgentId) {
      try {
        console.log('🔵 [Outbound Call] Initiating call via ElevenLabs Native Integration');
        console.log('  - Agent ID:', voiceAgent.elevenLabsAgentId);
        console.log('  - To:', phoneNumber);
        console.log('  - From:', voiceAgent.twilioPhoneNumber);

        // CRITICAL FIX: Use ElevenLabs API to initiate calls (native integration)
        // NOT Twilio API directly - that's only for manual integration
        const { elevenLabsService } = await import('@/lib/elevenlabs');
        
        const callResult = await elevenLabsService.initiatePhoneCall(
          voiceAgent.elevenLabsAgentId,
          phoneNumber
        );

        console.log('✅ [Outbound Call] ElevenLabs call initiated:', callResult);

        // Create call log
        const callLog = await prisma.callLog.create({
          data: {
            userId: user.id,
            voiceAgentId,
            leadId,
            direction: 'OUTBOUND',
            status: 'INITIATED',
            fromNumber: voiceAgent.twilioPhoneNumber || 'System',
            toNumber: phoneNumber,
            // Store ElevenLabs conversation ID in the dedicated field
            elevenLabsConversationId: callResult.conversation_id || callResult.call_id || callResult.id || undefined,
          },
        });

        console.log('📝 [Outbound Call] Call log created with conversation ID:', callLog.elevenLabsConversationId);

        // Update outbound call with call log reference
        await prisma.outboundCall.update({
          where: { id: outboundCall.id },
          data: {
            status: 'IN_PROGRESS',
            callLogId: callLog.id,
            attemptCount: 1,
            lastAttemptAt: new Date(),
          },
        });

        return NextResponse.json({
          ...outboundCall,
          callInitiated: true,
          callId: callResult.conversation_id || callResult.call_id || callResult.id,
          conversationId: callResult.conversation_id,
          status: 'IN_PROGRESS',
        }, { status: 201 });
      } catch (callError: any) {
        console.error('❌ [Outbound Call] Error initiating call:', callError);
        console.error('   Error details:', {
          message: callError.message,
          stack: callError.stack,
        });
        
        // Provide helpful error messages based on common issues
        let userFriendlyError = callError.message;
        
        if (callError.message.includes('quota') || callError.message.includes('insufficient')) {
          userFriendlyError = 'ElevenLabs account quota exceeded. Please upgrade your plan or wait for quota reset. Free plan: 15 min/month. Starter: $5/month with 50 min.';
        } else if (callError.message.includes('phone') || callError.message.includes('number')) {
          userFriendlyError = 'Phone number not properly configured in ElevenLabs. Please ensure: 1) Phone is imported to ElevenLabs, 2) Phone is assigned to this agent, 3) Phone is purchased (not just verified) in Twilio.';
        } else if (callError.message.includes('agent') || callError.message.includes('not found')) {
          userFriendlyError = 'Voice agent not found in ElevenLabs. Please try using "Auto-Configure" to set up the agent properly.';
        } else if (callError.message.includes('unauthorized') || callError.message.includes('authentication')) {
          userFriendlyError = 'ElevenLabs API authentication failed. Please check your ElevenLabs API key in settings.';
        }
        
        // CRITICAL FIX: Create CallLog even for failed calls so users can see what went wrong
        const failedCallLog = await prisma.callLog.create({
          data: {
            userId: user.id,
            voiceAgentId,
            leadId,
            direction: 'OUTBOUND',
            status: 'FAILED',
            fromNumber: voiceAgent.twilioPhoneNumber || 'System',
            toNumber: phoneNumber,
            outcome: 'ERROR',
            conversationData: JSON.stringify({
              error: true,
              message: userFriendlyError,
              technicalError: callError.message,
              timestamp: new Date().toISOString(),
            }),
          },
        });

        // Update status to failed with call log reference
        await prisma.outboundCall.update({
          where: { id: outboundCall.id },
          data: {
            status: 'FAILED',
            callLogId: failedCallLog.id,
            attemptCount: 1,
            lastAttemptAt: new Date(),
          },
        });

        return NextResponse.json({
          ...outboundCall,
          callInitiated: false,
          error: userFriendlyError,
          technicalError: callError.message,
          callLogId: failedCallLog.id,
        }, { status: 201 });
      }
    }

    return NextResponse.json(outboundCall, { status: 201 });
  } catch (error: any) {
    console.error('Error creating outbound call:', error);
    return NextResponse.json(
      { error: 'Failed to create outbound call' },
      { status: 500 }
    );
  }
}
