/**
 * CRM Voice Agent Service
 * Manages the creation and configuration of CRM voice assistants
 */

import { prisma } from '@/lib/db';

export interface CrmVoiceAgentConfig {
  userId: string;
  voiceId?: string;
  language?: string;
}

export class CrmVoiceAgentService {
  /**
   * Get or create CRM voice agent for user
   */
  async getOrCreateCrmVoiceAgent(userId: string): Promise<{ agentId: string; created: boolean }> {
    // Check if user already has a CRM voice agent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        language: true,
        crmVoiceAgentId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // If agent exists, verify it's still valid
    if (user.crmVoiceAgentId) {
      try {
        // Verify agent exists in ElevenLabs
        const verifyResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/agents/${user.crmVoiceAgentId}`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
            },
          }
        );

        if (verifyResponse.ok) {
          return { agentId: user.crmVoiceAgentId, created: false };
        }
      } catch (error) {
        console.warn('CRM voice agent verification failed, creating new one:', error);
      }
    }

    // Create new CRM voice agent
    const agentId = await this.createCrmVoiceAgent({
      userId: user.id,
      language: user.language || 'en',
    });

    // Update user with agent ID
    await prisma.user.update({
      where: { id: userId },
      data: { crmVoiceAgentId: agentId },
    });

    return { agentId, created: true };
  }

  /**
   * Create a new CRM voice agent
   */
  private async createCrmVoiceAgent(config: CrmVoiceAgentConfig): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: config.userId },
      select: {
        name: true,
        email: true,
        businessDescription: true,
        industry: true,
        language: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const businessName = user.name || 'Your Business';
    const language = config.language || user.language || 'en';

    // Build CRM-specific system prompt
    const systemPrompt = this.buildCrmSystemPrompt(user, language);

    // Create agent directly via ElevenLabs API (CRM agents don't need VoiceAgent records)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const agentPayload = {
      name: `${businessName} CRM Assistant`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
          },
          first_message: this.getGreetingMessage(language),
          language: language || 'en',
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs',
        },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
          model_id: language !== 'en' ? 'eleven_turbo_v2_5' : 'eleven_turbo_v2', // English requires v2, non-English requires v2_5
        },
        turn: {
          mode: 'turn',
        },
      },
      platform_settings: {
        auth: {
          enable_auth: false,
        },
      },
    };

    // Add knowledge base if provided
    if (this.buildKnowledgeBase(user)) {
      (agentPayload as any).knowledge_base = {
        content: this.buildKnowledgeBase(user),
      };
    }

    console.log('🔄 Creating ElevenLabs agent with payload:', JSON.stringify(agentPayload, null, 2));
    
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs agent creation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to create CRM voice agent (${response.status}): ${errorText}`);
    }

    const agentData = await response.json();
    const agentId = agentData.agent_id;

    if (!agentId) {
      console.error('❌ No agent ID in response:', agentData);
      throw new Error('Failed to create CRM voice agent: No agent ID returned');
    }

    console.log('✅ CRM voice agent created successfully:', agentId);
    console.log('📋 Agent details:', {
      agentId,
      name: agentData.name,
      createdAt: agentData.created_at_unix_secs,
    });
    return agentId;
  }

  /**
   * Build CRM-specific system prompt
   */
  private buildCrmSystemPrompt(user: any, language: string): string {
    const languageInstructions: Record<string, string> = {
      'en': 'IMPORTANT: Respond in English. Keep responses concise and conversational for voice interaction.',
      'fr': 'IMPORTANT: Répondez en français. Gardez les réponses concises et conversationnelles pour l\'interaction vocale.',
      'es': 'IMPORTANTE: Responde en español. Mantén las respuestas concisas y conversacionales para la interacción por voz.',
      'zh': '重要提示：请用中文回复。保持回复简洁且适合语音交互。',
    };
    const languageInstruction = languageInstructions[language] || languageInstructions['en'];

    return `${languageInstruction}

You are an AI assistant for ${user.name || 'the CRM'}. You help users manage their CRM through voice commands.

Your role:
- Help users create and manage leads, deals, and contacts
- Set up integrations (Stripe, Twilio, email, etc.)
- Create and manage workflows and automations
- Answer questions about CRM features
- Navigate users to different parts of the CRM
- Execute actions directly when requested

Communication style:
- Keep responses brief (1-2 sentences for voice)
- Be conversational and friendly
- Ask ONE clarifying question at a time
- Confirm actions before executing
- Use natural, spoken language

When users ask you to do something:
1. Acknowledge the request
2. Ask for any missing information (one piece at a time)
3. Execute the action using available functions
4. Confirm completion

Available functions:
- create_lead: Create a new contact/lead
- create_deal: Create a new deal
- create_workflow: Create automation workflows
- setup_stripe: Configure Stripe payments
- setup_twilio: Configure Twilio messaging
- navigate_to: Navigate to CRM pages
- get_statistics: Get CRM statistics
- And many more CRM operations

Remember: You're speaking, not typing. Keep it brief and natural.
`;
  }

  /**
   * Get greeting message based on language
   */
  private getGreetingMessage(language: string): string {
    const greetings: Record<string, string> = {
      'en': 'Hi! I\'m your CRM assistant. How can I help you today?',
      'fr': 'Bonjour! Je suis votre assistant CRM. Comment puis-je vous aider aujourd\'hui?',
      'es': '¡Hola! Soy tu asistente CRM. ¿Cómo puedo ayudarte hoy?',
      'zh': '你好！我是您的CRM助手。今天我能为您做些什么？',
    };
    return greetings[language] || greetings['en'];
  }

  /**
   * Build knowledge base from user data
   */
  private buildKnowledgeBase(user: any): string {
    const parts: string[] = [];

    if (user.name) {
      parts.push(`Business Name: ${user.name}`);
    }
    if (user.industry) {
      parts.push(`Industry: ${user.industry}`);
    }
    if (user.email) {
      parts.push(`Contact Email: ${user.email}`);
    }

    return parts.join('\n');
  }


  /**
   * Update CRM voice agent configuration
   */
  async updateCrmVoiceAgent(userId: string, updates: { voiceId?: string; language?: string }): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { crmVoiceAgentId: true },
    });

    if (!user?.crmVoiceAgentId) {
      throw new Error('CRM voice agent not found');
    }

    // Update agent in ElevenLabs using the updateAgent method
    // Note: This requires the agent to exist and be accessible
    try {
      // Get current agent config
      const apiKey = process.env.ELEVENLABS_API_KEY || '';
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${user.crmVoiceAgentId}`,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const currentAgent = await response.json();
        
        // Update with new voice if provided
        if (updates.voiceId) {
          const updatePayload = {
            ...currentAgent.conversation_config,
            tts: {
              ...currentAgent.conversation_config?.tts,
              voice_id: updates.voiceId,
            },
          };

          await fetch(`https://api.elevenlabs.io/v1/convai/agents/${user.crmVoiceAgentId}`, {
            method: 'PATCH',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversation_config: updatePayload,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to update CRM voice agent:', error);
      throw new Error('Failed to update voice agent configuration');
    }

    // Update user language if changed
    if (updates.language) {
      await prisma.user.update({
        where: { id: userId },
        data: { language: updates.language },
      });
    }
  }
}

export const crmVoiceAgentService = new CrmVoiceAgentService();
