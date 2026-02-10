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

    // If agent exists, verify it's still valid and update functions if needed
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
          // Automatically update agent functions if needed (non-blocking)
          this.updateAgentFunctions(user.crmVoiceAgentId, userId).catch((err) => {
            console.warn(`⚠️ Failed to auto-update CRM agent functions (non-critical):`, err.message);
          });
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

    // Build CRM functions
    const crmFunctions = this.buildCrmFunctions();

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
      tools: crmFunctions.map(func => ({
        type: 'function',
        function: func,
      })),
    };

    // Add knowledge base if provided
    if (this.buildKnowledgeBase(user)) {
      (agentPayload as any).knowledge_base = {
        content: this.buildKnowledgeBase(user),
      };
    }

    console.log('🔄 Creating ElevenLabs agent with CRM functions...');
    console.log('📋 Agent payload:', JSON.stringify({
      name: agentPayload.name,
      hasConversationConfig: !!agentPayload.conversation_config,
      hasTools: !!agentPayload.tools && agentPayload.tools.length > 0,
      toolCount: agentPayload.tools?.length || 0,
    }, null, 2));
    
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
      functionCount: crmFunctions.length,
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

You are an AI assistant for ${user.name || 'the CRM'}. You help users manage their CRM through voice commands and provide real-time insights about their business data.

Your role:
- Query and report CRM statistics (revenue, leads, deals, contacts, campaigns)
- Help users create and manage leads, deals, and contacts
- Search for contacts and deals
- Provide insights about business performance
- Set up integrations (Stripe, Twilio, email, etc.)
- Create and manage workflows and automations
- Answer questions about CRM features
- Execute actions directly when requested

Communication style:
- Keep responses brief (1-2 sentences for voice)
- Be conversational and friendly
- When providing statistics, speak the numbers clearly
- Ask ONE clarifying question at a time
- Confirm actions before executing
- Use natural, spoken language

When users ask "how many leads" or "show my contacts" → use list_leads (takes them to contacts page).
When users ask "how many deals" → use list_deals (takes them to pipeline).
When users ask for charts, graphs, or sales trends → use get_statistics (shows visualizations on AI Brain).

When users ask you to do something:
1. Acknowledge the request
2. Ask for any missing information (one piece at a time)
3. Execute the action using available functions
4. Confirm completion

Available functions:
- list_leads: List contacts/leads. USE THIS when user asks "how many leads", "how many new leads today", "show my contacts", "show my leads", or wants to see the list of contacts. Use period: "today" for leads created today.
- list_deals: List deals in the pipeline. USE THIS when user asks "how many deals", "show my deals", or wants to see the pipeline.
- get_statistics: Get comprehensive CRM statistics (revenue, charts, graphs). USE THIS only when user asks for charts, graphs, visualizations, sales over time, revenue comparison, or monthly trends.
- create_lead: Create a new contact/lead
- create_deal: Create a new deal
- search_contacts: Search for contacts by name, email, or company
- get_recent_activity: Get recent CRM activity

IMPORTANT: When users ask "how many new leads today" or "show me my leads" → use list_leads (navigates to contacts page). When users ask for graphs, charts, or sales trends → use get_statistics (shows visualizations on AI Brain). Do not use get_statistics for simple lead/deal counts.

Remember: You're speaking, not typing. Keep it brief and natural. When reporting statistics, speak clearly and highlight the most important numbers.
`;
  }

  /**
   * Get greeting message based on language
   */
  private getGreetingMessage(language: string): string {
    const greetings: Record<string, string> = {
      'en': "I'm your business intelligence agent. How can I help you?",
      'fr': "Je suis votre agent d'intelligence business. Comment puis-je vous aider?",
      'es': 'Soy tu agente de inteligencia de negocio. ¿Cómo puedo ayudarte?',
      'zh': '我是您的商业智能助手。有什么可以帮您的？',
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
   * Get function server URL for CRM voice agent functions
   */
  private getFunctionServerUrl(): string {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.nexrel.soshogle.com';
    return `${baseUrl}/api/crm-voice-agent/functions`;
  }

  /**
   * Build CRM functions for voice agent
   */
  private buildCrmFunctions() {
    const serverUrl = this.getFunctionServerUrl();
    
    return [
      {
        name: 'get_statistics',
        description: 'Get comprehensive CRM statistics and generate graphs/charts. Use ONLY when user asks for graphs, charts, visualizations, sales over time, revenue comparison, or monthly trends. Do NOT use for simple "how many leads" type questions - use list_leads instead.',
        parameters: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              description: 'Time period. Examples: "last_7_months", "last_year", "last_30_days", "today", "all_time"',
            },
            compareWith: {
              type: 'string',
              description: 'Compare with previous period. Examples: "previous_year", "previous_period"',
            },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'create_lead',
        description: 'Create a new contact/lead in the CRM. Use this when the user wants to add a new contact.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Contact person\'s name (required)',
            },
            email: {
              type: 'string',
              description: 'Contact\'s email address (optional)',
            },
            phone: {
              type: 'string',
              description: 'Contact\'s phone number (optional)',
            },
            company: {
              type: 'string',
              description: 'Company or business name (optional)',
            },
            status: {
              type: 'string',
              description: 'Lead status (optional, defaults to NEW)',
              enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'],
            },
          },
          required: ['name'],
        },
        server_url: serverUrl,
      },
      {
        name: 'create_deal',
        description: 'Create a new deal/opportunity in the sales pipeline',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Deal title (required)',
            },
            value: {
              type: 'number',
              description: 'Deal value in dollars (optional)',
            },
            leadId: {
              type: 'string',
              description: 'Associated lead/contact ID (optional)',
            },
          },
          required: ['title'],
        },
        server_url: serverUrl,
      },
      {
        name: 'list_leads',
        description: 'List contacts/leads. Use when user asks "how many leads", "how many new leads today", "show my contacts", or wants to see leads. Use period: "today" for leads created today.',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status (optional)',
              enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'],
            },
            period: {
              type: 'string',
              description: 'Time filter: "today" for leads created today, "all" for all time',
              enum: ['today', 'all'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (optional, default 10)',
            },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'list_deals',
        description: 'List deals in the sales pipeline',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results (optional, default 10)',
            },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'search_contacts',
        description: 'Search for contacts by name, email, or company',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (required)',
            },
          },
          required: ['query'],
        },
        server_url: serverUrl,
      },
      {
        name: 'get_recent_activity',
        description: 'Get recent CRM activity including recent leads, deals, and updates',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results (optional, default 10)',
            },
          },
        },
        server_url: serverUrl,
      },
    ];
  }


  /**
   * Update existing agent with latest function configurations
   * This ensures agents have CRM functions even if they were created before functions were added
   */
  async updateAgentFunctions(agentId: string, userId: string): Promise<boolean> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('❌ No API key available for updating agent functions');
      return false;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { language: true },
      });
      const language = user?.language || 'en';

      // Get current agent config from ElevenLabs
      const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Failed to fetch agent: ${getResponse.statusText}`);
      }

      const currentAgent = await getResponse.json();
      const crmFunctions = this.buildCrmFunctions();
      const expectedServerUrl = this.getFunctionServerUrl();
      const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, industry: true } });
      const newPrompt = this.buildCrmSystemPrompt(fullUser, language);

      const currentTools = currentAgent.tools || [];
      const needsUpdate = currentTools.length === 0 ||
        currentTools.some((tool: any) => {
          const func = tool.function;
          return !func?.server_url || func.server_url !== expectedServerUrl;
        }) ||
        (currentAgent.conversation_config?.agent?.prompt?.prompt !== newPrompt);

      if (!needsUpdate) {
        console.log(`✅ CRM agent ${agentId} already has correct function configurations`);
        return true;
      }

      const updatePayload = {
        name: currentAgent.name,
        conversation_config: {
          ...currentAgent.conversation_config,
          agent: {
            ...currentAgent.conversation_config?.agent,
            prompt: { prompt: newPrompt },
            first_message: this.getGreetingMessage(language),
            language: currentAgent.conversation_config?.agent?.language || language,
          },
          // Preserve TTS settings
          tts: currentAgent.conversation_config?.tts,
          // Preserve conversation settings
          conversation: currentAgent.conversation_config?.conversation,
          // Preserve ASR settings
          asr: currentAgent.conversation_config?.asr,
          // Preserve turn settings
          turn: currentAgent.conversation_config?.turn,
        },
        platform_settings: currentAgent.platform_settings || {},
        tools: crmFunctions.map(func => ({
          type: 'function',
          function: func,
        })),
      };

      console.log(`🔄 Updating CRM agent ${agentId} with ${crmFunctions.length} functions...`);

      const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update agent: ${updateResponse.statusText} - ${errorText}`);
      }

      console.log(`✅ Successfully updated CRM agent ${agentId} with functions`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update CRM agent functions:`, error);
      return false;
    }
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
