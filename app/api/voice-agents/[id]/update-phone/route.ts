
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsService } from '@/lib/elevenlabs';

// PATCH /api/voice-agents/[id]/update-phone - Update voice agent phone number

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if voice agent exists and belongs to user
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Voice agent not found' }, { status: 404 });
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Step 1: Import phone number into ElevenLabs (Native Integration)
    let elevenLabsPhoneNumberId: string | null = null;
    let elevenLabsRegistered = false;
    let elevenLabsError = null;

    if (agent.elevenLabsAgentId) {
      try {
        console.log(`📞 Importing phone ${phoneNumber} into ElevenLabs for agent ${agent.name}`);
        
        // Import the phone number into ElevenLabs
        const importResult = await elevenLabsService.importTwilioPhoneNumber(
          phoneNumber,
          `${agent.name} - ${agent.businessName}`
        );
        elevenLabsPhoneNumberId = importResult.phone_number_id;

        // Assign the phone number to the agent
        await elevenLabsService.assignPhoneNumberToAgent(
          elevenLabsPhoneNumberId,
          agent.elevenLabsAgentId
        );

        elevenLabsRegistered = true;
        console.log('✅ Phone number successfully imported and assigned in ElevenLabs');
      } catch (elevenLabsErr: any) {
        console.error('⚠️ ElevenLabs import failed:', elevenLabsErr);
        elevenLabsError = elevenLabsErr.message;
        // Don't fail the entire request
      }
    } else {
      console.warn('⚠️ Voice agent has no ElevenLabs ID - skipping ElevenLabs import');
      elevenLabsError = 'No ElevenLabs agent ID configured. Please configure the agent first.';
    }

    // Step 2: Update the voice agent in our database
    const updatedAgent = await prisma.voiceAgent.update({
      where: { id: params.id },
      data: {
        twilioPhoneNumber: phoneNumber,
        elevenLabsPhoneNumberId: elevenLabsPhoneNumberId,
        status: elevenLabsRegistered ? 'ACTIVE' : agent.status, // Only activate if ElevenLabs succeeded
      },
    });

    console.log(`Phone number ${phoneNumber} assigned to voice agent ${updatedAgent.name}`);

    return NextResponse.json({
      id: updatedAgent.id,
      name: updatedAgent.name,
      phoneNumber: updatedAgent.twilioPhoneNumber,
      status: updatedAgent.status,
      elevenLabsRegistered,
      elevenLabsError,
      message: elevenLabsRegistered 
        ? 'Phone number imported into ElevenLabs successfully! ElevenLabs will handle all calls automatically.'
        : 'Phone number updated in database, but ElevenLabs import failed. Agent may not receive calls until configured.',
    });

  } catch (error: any) {
    console.error('Error updating voice agent phone number:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update phone number' },
      { status: 500 }
    );
  }
}
