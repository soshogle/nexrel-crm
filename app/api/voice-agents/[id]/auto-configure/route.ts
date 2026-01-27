
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';

/**
 * Auto-configure ElevenLabs agent
 * This endpoint automatically provisions an ElevenLabs conversational AI agent
 * without requiring the user to manually configure it
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔧 [Auto-Configure] Starting for agent ID:', params.id);

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('❌ [Auto-Configure] Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const voiceAgentId = params.id;
    console.log('🔍 [Auto-Configure] Fetching voice agent for user:', session.user.id);

    // Get the voice agent
    const voiceAgent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgentId },
      include: {
        user: true,
      },
    });

    if (!voiceAgent) {
      console.log('❌ [Auto-Configure] Voice agent not found:', voiceAgentId);
      return NextResponse.json(
        { error: 'Voice agent not found' },
        { status: 404 }
      );
    }

    // Check if user owns this agent
    if (voiceAgent.userId !== session.user.id) {
      console.log('❌ [Auto-Configure] Unauthorized - user does not own agent');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if already configured and validate it exists in ElevenLabs
    if (voiceAgent.elevenLabsAgentId) {
      console.log('🔍 [Auto-Configure] Agent has ID, validating in ElevenLabs:', voiceAgent.elevenLabsAgentId);
      const validation = await elevenLabsProvisioning.validateAgentSetup(voiceAgent.elevenLabsAgentId, session.user.id);
      
      if (validation.valid) {
        // Agent exists in ElevenLabs - update its configuration to ensure all fields are present
        console.log('🔧 [Auto-Configure] Agent exists, updating configuration to ensure completeness...');
        
        const greeting = voiceAgent.type === 'OUTBOUND'
          ? (voiceAgent.outboundGreeting || voiceAgent.greetingMessage || `Hello! I'm calling from ${voiceAgent.businessName}. How can I help you today?`)
          : (voiceAgent.inboundGreeting || voiceAgent.greetingMessage || `Thank you for calling ${voiceAgent.businessName}. How can I help you today?`);
        
        const updateResult = await elevenLabsProvisioning.updateAgentConfiguration(
          voiceAgent.elevenLabsAgentId,
          {
            name: voiceAgent.name,
            businessName: voiceAgent.businessName,
            businessIndustry: voiceAgent.businessIndustry || voiceAgent.user.industry || 'general business',
            greetingMessage: greeting,
            systemPrompt: voiceAgent.systemPrompt || undefined,
            knowledgeBase: voiceAgent.knowledgeBase || voiceAgent.user.businessDescription || undefined,
            voiceId: voiceAgent.voiceId || 'EXAVITQu4vr4xnSDxMaL',
            language: voiceAgent.language || 'en',
            userId: session.user.id,
            voiceAgentId: voiceAgent.id,
          }
        );
        
        if (!updateResult.success) {
          console.warn('⚠️  [Auto-Configure] Failed to update agent configuration:', updateResult.error);
        } else {
          console.log('✅ [Auto-Configure] Agent configuration updated successfully');
        }
        
        if (!validation.warnings?.some(w => w.includes('No phone number'))) {
          // Agent is valid AND has a phone number assigned
          console.log('✅ [Auto-Configure] Agent fully configured with phone');
          return NextResponse.json({
            success: true,
            message: 'Agent configuration updated and verified',
            agentId: voiceAgent.elevenLabsAgentId,
          });
        } else {
          // Agent exists but no phone - need to re-import phone
          console.warn('⚠️  [Auto-Configure] Agent exists but missing phone number. Will re-import phone.');
          // Clear stale phone number ID and continue to re-import
          await prisma.voiceAgent.update({
            where: { id: voiceAgent.id },
            data: { 
              elevenLabsPhoneNumberId: null // Clear stale phone number ID
            },
          });
          // Don't clear elevenLabsAgentId - we'll reuse the existing agent
        }
      } else {
        console.warn('⚠️  [Auto-Configure] Agent ID exists but agent not found in ElevenLabs. Will recreate.');
        console.warn('   Reason:', validation.error);
        // Clear the invalid agent ID and phone number ID (in case it's stale) before recreating
        await prisma.voiceAgent.update({
          where: { id: voiceAgent.id },
          data: { 
            elevenLabsAgentId: null,
            elevenLabsPhoneNumberId: null // Clear stale phone number ID too
          },
        });
      }
    }

    // Reload agent data to check if we're creating new or just importing phone
    const reloadedAgent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgent.id },
      include: { user: true },
    });

    if (!reloadedAgent) {
      return NextResponse.json(
        { error: 'Agent not found after validation' },
        { status: 404 }
      );
    }

    let result: any;
    let phoneRegistered = false;

    // IMPORTANT: Always check if phone is already assigned to an existing agent FIRST
    // This prevents creating duplicate agents
    if (reloadedAgent.twilioPhoneNumber) {
      console.log('🔍 [Auto-Configure] Checking if phone is already assigned to an agent...');
      
      try {
        const phoneResponse = await fetch(
          'https://api.elevenlabs.io/v1/convai/phone-numbers',
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            }
          }
        );

        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json();
          
          // Check if this is an array or has phone_numbers property
          const phoneNumbers = Array.isArray(phoneData) ? phoneData : phoneData.phone_numbers || [];
          
          const existingPhone = phoneNumbers.find(
            (p: any) => p.phone_number?.replace(/\s/g, '') === reloadedAgent.twilioPhoneNumber?.replace(/\s/g, '')
          );

          if (existingPhone?.assigned_agent?.agent_id) {
            console.log('✅ [Auto-Configure] Found existing agent with this phone!');
            console.log('   Agent ID:', existingPhone.assigned_agent.agent_id);
            console.log('   Agent Name:', existingPhone.assigned_agent.name);
            console.log('   Phone ID:', existingPhone.phone_number_id);
            console.log('   Database Agent Name:', reloadedAgent.name);
            
            // Verify this is the correct agent by comparing names
            const agentNameMatch = existingPhone.assigned_agent.name === reloadedAgent.name;
            
            if (!agentNameMatch) {
              console.warn('⚠️  [Auto-Configure] Agent name mismatch - this phone is assigned to a different agent');
              console.warn(`   Expected: "${reloadedAgent.name}", Found: "${existingPhone.assigned_agent.name}"`);
              console.warn('   This may be a duplicate agent. Creating a new agent instead...');
              // Don't use this agent - fall through to create new one
            } else {
              // CRITICAL: Re-assign the phone to the agent via phone number API
              // This ensures the agent.phone_numbers array is populated
              console.log('🔗 [Auto-Configure] Re-assigning phone to ensure proper linkage...');
              
              const assignResponse = await fetch(
                `https://api.elevenlabs.io/v1/convai/phone-numbers/${existingPhone.phone_number_id}`,
                {
                  method: 'PATCH',
                  headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    agent_id: existingPhone.assigned_agent.agent_id,
                  }),
                }
              );
              
              if (assignResponse.ok) {
                console.log('✅ [Auto-Configure] Phone re-assigned successfully');
              } else {
                console.warn('⚠️  [Auto-Configure] Phone re-assignment failed, but continuing...');
              }
              
              // Use the existing agent instead of creating a new one
              await prisma.voiceAgent.update({
                where: { id: reloadedAgent.id },
                data: {
                  elevenLabsAgentId: existingPhone.assigned_agent.agent_id,
                  elevenLabsPhoneNumberId: existingPhone.phone_number_id,
                  status: 'ACTIVE',
                },
              });

              return NextResponse.json({
                success: true,
                message: 'Connected to existing ElevenLabs agent',
                agentId: existingPhone.assigned_agent.agent_id,
                phoneRegistered: true,
              });
            }
          }
        }
      } catch (error) {
        console.warn('⚠️  [Auto-Configure] Could not check for existing agents:', error);
        // Continue to check if agent exists or create new
      }
    }
    
    // Check if agent already exists in ElevenLabs (just needs phone)
    if (reloadedAgent.elevenLabsAgentId) {
      console.log('🔗 [Auto-Configure] Agent exists, importing phone number to:', reloadedAgent.elevenLabsAgentId);
      
      if (reloadedAgent.twilioPhoneNumber) {
        const phoneResult = await elevenLabsProvisioning.importPhoneNumber(
          reloadedAgent.twilioPhoneNumber,
          reloadedAgent.elevenLabsAgentId,
          session.user.id
        );

        if (phoneResult.success) {
          console.log('✅ [Auto-Configure] Phone imported and assigned:', phoneResult.phoneNumberId);
          
          // CRITICAL: Re-assign phone via phone number API to ensure agent.phone_numbers is populated
          console.log('🔗 [Auto-Configure] Re-assigning phone to ensure proper linkage...');
          
          const assignResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneResult.phoneNumberId}`,
            {
              method: 'PATCH',
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                agent_id: reloadedAgent.elevenLabsAgentId,
              }),
            }
          );
          
          if (assignResponse.ok) {
            console.log('✅ [Auto-Configure] Phone re-assigned successfully');
          } else {
            console.warn('⚠️  [Auto-Configure] Phone re-assignment may have failed');
          }
          
          // Update database with phone number ID
          await prisma.voiceAgent.update({
            where: { id: reloadedAgent.id },
            data: { elevenLabsPhoneNumberId: phoneResult.phoneNumberId },
          });
          
          phoneRegistered = true;
          result = {
            success: true,
            agentId: reloadedAgent.elevenLabsAgentId,
            phoneNumberId: phoneResult.phoneNumberId,
          };
        } else {
          console.error('❌ [Auto-Configure] Phone import failed:', phoneResult.error);
          return NextResponse.json(
            { 
              error: phoneResult.error || 'Failed to import phone number',
              details: phoneResult.errorDetails
            },
            { status: 500 }
          );
        }
      } else {
        console.log('ℹ️ [Auto-Configure] No phone number to import');
        result = {
          success: true,
          agentId: reloadedAgent.elevenLabsAgentId,
        };
      }
    } else {
      // Create new agent with phone
      console.log('🤖 [Auto-Configure] Creating new ElevenLabs agent for:', reloadedAgent.name);

      // Determine which greeting to use based on agent type
      const greetingForElevenLabs = reloadedAgent.type === 'OUTBOUND'
        ? (reloadedAgent.outboundGreeting || reloadedAgent.greetingMessage || `Hello! I'm calling from ${reloadedAgent.businessName}. How can I help you today?`)
        : (reloadedAgent.inboundGreeting || reloadedAgent.greetingMessage || `Thank you for calling ${reloadedAgent.businessName}. How can I help you today?`);

      result = await elevenLabsProvisioning.createAgent({
        name: reloadedAgent.name,
        businessName: reloadedAgent.businessName,
        businessIndustry: reloadedAgent.businessIndustry || reloadedAgent.user.industry || 'general business',
        greetingMessage: greetingForElevenLabs,
        systemPrompt: reloadedAgent.systemPrompt || undefined,
        knowledgeBase: reloadedAgent.knowledgeBase || reloadedAgent.user.businessDescription || undefined,
        voiceId: reloadedAgent.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        language: reloadedAgent.language || 'en',
        twilioPhoneNumber: reloadedAgent.twilioPhoneNumber || undefined,
        userId: session.user.id,
        voiceAgentId: reloadedAgent.id,
      });

      if (!result.success) {
        console.log('❌ [Auto-Configure] ElevenLabs provisioning failed:', result.error);
        return NextResponse.json(
          { 
            error: result.error || 'Failed to configure voice agent',
            details: 'Could not create ElevenLabs conversational AI agent'
          },
          { status: 500 }
        );
      }

      console.log('✅ [Auto-Configure] ElevenLabs agent created:', result.agentId);
      phoneRegistered = !!result.phoneNumberId;
      
      console.log('📋 [Auto-Configure] Phone registration status:', {
        phoneNumberId: result.phoneNumberId || 'NOT ASSIGNED',
        twilioPhoneNumber: reloadedAgent.twilioPhoneNumber || 'NOT SET',
        phoneRegistered
      });
      
      // CRITICAL: Re-assign phone via phone number API if phone was imported
      if (result.phoneNumberId && result.agentId) {
        console.log('🔗 [Auto-Configure] Re-assigning phone to ensure proper linkage...');
        
        const assignResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/phone-numbers/${result.phoneNumberId}`,
          {
            method: 'PATCH',
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agent_id: result.agentId,
            }),
          }
        );
        
        if (assignResponse.ok) {
          console.log('✅ [Auto-Configure] Phone re-assigned successfully');
        } else {
          console.warn('⚠️  [Auto-Configure] Phone re-assignment may have failed');
        }
      }

      // CRITICAL FIX: Update database with new agent ID and phone number ID
      console.log('💾 [Auto-Configure] Saving new agent ID to database...');
      await prisma.voiceAgent.update({
        where: { id: reloadedAgent.id },
        data: {
          elevenLabsAgentId: result.agentId,
          elevenLabsPhoneNumberId: result.phoneNumberId || null,
        },
      });
      console.log('✅ [Auto-Configure] Database updated with new agent ID');
    }

    console.log('✅ [Auto-Configure] Complete! Agent ID:', result.agentId);

    return NextResponse.json({
      success: true,
      message: 'Voice agent configured successfully',
      agentId: result.agentId,
      phoneRegistered,
    });

  } catch (error: any) {
    console.error('❌ [Auto-Configure] Unexpected error:', error);
    console.error('❌ [Auto-Configure] Stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to configure voice agent',
        details: 'An unexpected error occurred during auto-configuration'
      },
      { status: 500 }
    );
  }
}
