
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { purchasePhoneNumber } from '@/lib/twilio-phone-numbers';
import { prisma } from '@/lib/db';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { VOICE_AGENT_LIMIT } from '@/lib/voice-agent-templates';

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

    const body = await req.json();
    const { phoneNumber, friendlyName, voiceUrl, smsUrl, autoCreateAgent = true, twilioAccountId } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get base URL for webhooks - CRITICAL for SMS to work!
    const baseUrl = process.env.NEXTAUTH_URL || 'https://soshogleagents.com';
    
    console.log('🔧 Configuring webhooks for:', phoneNumber);
    console.log('   Voice URL:', `${baseUrl}/api/twilio/voice-callback`);
    console.log('   SMS URL:', `${baseUrl}/api/twilio/sms-webhook`);

    const result = await purchasePhoneNumber(session.user.id, phoneNumber, {
      friendlyName: friendlyName || 'Soshogle CRM Number',
      voiceUrl: voiceUrl || `${baseUrl}/api/twilio/voice-callback`,
      smsUrl: smsUrl || `${baseUrl}/api/twilio/sms-webhook`,
      twilioAccountId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    let voiceAgentId: string | null = null;

    // Auto-create VoiceAgent with industry-specific prompt when requested
    if (autoCreateAgent && result.phoneNumber) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { businessName: true, industry: true, businessDescription: true, language: true, role: true },
        });

        if (user) {
          const isSuperAdmin = user.role === 'SUPER_ADMIN';
          const existingCount = await prisma.voiceAgent.count({ where: { userId: session.user.id } });
          if (!isSuperAdmin && existingCount >= VOICE_AGENT_LIMIT) {
            console.warn('⚠️  Voice agent limit reached, skipping auto-creation');
          } else {
            const businessName = user.businessName || 'My Business';
            const industry = user.industry || null;
            const industryLabel = industry ? industry.replace(/_/g, ' ').toLowerCase() : 'general business';

            const voiceAgent = await prisma.voiceAgent.create({
              data: {
                userId: session.user.id,
                name: `${businessName} Receptionist`,
                businessName,
                businessIndustry: industryLabel,
                twilioPhoneNumber: result.phoneNumber,
                twilioAccountId: result.twilioAccountId || undefined,
                type: 'INBOUND',
                greetingMessage: `Thank you for calling ${businessName}. How can I help you today?`,
                systemPrompt: undefined,
                knowledgeBase: user.businessDescription || undefined,
                status: 'PENDING',
              },
            });

            const subscriptionCheck = await elevenLabsProvisioning.checkSubscription(session.user.id);
            if (subscriptionCheck.canUsePhoneNumbers) {
              const createResult = await elevenLabsProvisioning.createAgent({
                name: voiceAgent.name,
                businessName,
                businessIndustry: industryLabel,
                greetingMessage: voiceAgent.greetingMessage!,
                systemPrompt: voiceAgent.systemPrompt || undefined,
                knowledgeBase: voiceAgent.knowledgeBase || undefined,
                twilioPhoneNumber: result.phoneNumber,
                twilioAccountId: result.twilioAccountId || undefined,
                userId: session.user.id,
                voiceAgentId: voiceAgent.id,
                language: user.language || 'en',
              });

              if (createResult.success) {
                voiceAgentId = voiceAgent.id;
                console.log('✅ Auto-created voice agent:', voiceAgent.id, 'with ElevenLabs agent:', createResult.agentId);
              } else {
                console.warn('⚠️  ElevenLabs agent creation failed:', createResult.error);
              }
            } else {
              console.warn('⚠️  ElevenLabs plan does not support phone numbers, agent created in DB only');
            }
          }
        }
      } catch (agentError: any) {
        console.error('⚠️  Auto-create agent error (non-fatal):', agentError.message);
      }
    }

    // TODO: Add to platform invoice (Stripe or billing service)
    // The platform invoices owners for number purchases

    return NextResponse.json({
      success: true,
      phoneNumber: result.phoneNumber,
      voiceAgentId,
      message: 'Phone number purchased successfully!'
    });

  } catch (error) {
    console.error('Error in purchase phone number API:', error);
    return NextResponse.json(
      { error: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}
