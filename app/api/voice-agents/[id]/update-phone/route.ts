import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { apiErrors } from '@/lib/api-error';

// PATCH /api/voice-agents/[id]/update-phone - Update voice agent phone number

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    // Check if voice agent exists and belongs to user
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!agent) {
      return apiErrors.notFound('Voice agent not found');
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return apiErrors.badRequest('Phone number is required');
    }

    // Step 1: Import phone number into ElevenLabs (Native Integration)
    let elevenLabsPhoneNumberId: string | null = null;
    let elevenLabsRegistered = false;
    let elevenLabsError = null;

    if (agent.elevenLabsAgentId) {
      try {
        console.log(`📞 Importing phone ${phoneNumber} into ElevenLabs for agent ${agent.name}`);

        const importResult = await elevenLabsProvisioning.importPhoneNumber(
          phoneNumber,
          agent.elevenLabsAgentId,
          user.id,
          agent.twilioAccountId ?? undefined
        );

        if (importResult.success && importResult.phoneNumberId) {
          elevenLabsPhoneNumberId = importResult.phoneNumberId;
          elevenLabsRegistered = true;
          console.log('✅ Phone number successfully imported and assigned in ElevenLabs');
        } else {
          throw new Error(importResult.error || 'Import failed');
        }
      } catch (elevenLabsErr: any) {
        console.error('⚠️ ElevenLabs import failed:', elevenLabsErr);
        elevenLabsError = elevenLabsErr.message;
        // Don't fail the entire request
      }
    } else {
      console.warn('⚠️ Voice agent has no ElevenLabs ID - skipping ElevenLabs import');
      elevenLabsError = 'No Soshogle Voice AI agent ID configured. Please configure the agent first.';
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
        ? 'Phone number imported into Soshogle Voice AI successfully! Calls will be handled automatically.'
        : 'Phone number updated in database, but Soshogle Voice AI import failed. Agent may not receive calls until configured.',
    });

  } catch (error: any) {
    console.error('Error updating voice agent phone number:', error);
    return apiErrors.internal(error.message || 'Failed to update phone number');
  }
}
