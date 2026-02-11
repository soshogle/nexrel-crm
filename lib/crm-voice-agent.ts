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
- list_voice_agents: List user's voice AI agents. USE when user asks "which agents do I have" or to confirm agent choice before calling.
- make_outbound_call: Call a single contact. USE when user says "call [contact] and [explain/discuss] [topic]" - e.g. "call John and explain our new promo", "call contact Be about the discount". If user specifies an agent ("use Sarah"), pass voiceAgentName. Otherwise system picks the best agent.
- call_leads: Call multiple leads. USE when user says "call all my leads from today", "call today's leads and give them 10% off", "call all new leads and explain the promo". Use period: "today" for leads created today. If user specifies an agent, pass voiceAgentName.
- send_sms: Text a single contact. USE when user says "text [contact] and [message]", "send SMS to [contact]", "message [contact]". E.g. "text John about our new promo".
- send_email: Email a single contact. USE when user says "email [contact] about [topic]", "send email to [contact]". E.g. "email John about our new promo".
- sms_leads: Text multiple leads. USE when user says "text all my leads from today", "SMS today's leads with [message]". Use period: "today" for leads created today.
- email_leads: Email multiple leads. USE when user says "email all my leads from today", "send email to today's leads about [topic]". Use period: "today" for leads created today.

IMPORTANT: When users ask "how many new leads today" or "show me my leads" → use list_leads (navigates to contacts page). When users ask for graphs, charts, or sales trends → use get_statistics (shows visualizations on AI Brain). Do not use get_statistics for simple lead/deal counts.
For calling: "call John and tell him about the promo" → make_outbound_call. "call all leads from today with 10% off" → call_leads. If user has a preference for which agent ("use Sarah"), pass voiceAgentName. If unsure, use list_voice_agents and ask which agent they want.

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
        description: 'Get CRM statistics, graphs/charts, and "what if" scenario predictions. Use when user asks for: graphs, charts, visualizations, sales data, revenue comparisons, statistics, OR "what if" scenarios (e.g. "what if I convert 10 more leads?", "what if I get 50 more leads?", "what if conversion improved 5%?").',
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
      {
        name: 'list_voice_agents',
        description: 'List the user\'s voice AI agents/employees. Use when user asks which agents they have, or to confirm which agent to use before making calls.',
        parameters: { type: 'object', properties: {} },
        server_url: serverUrl,
      },
      {
        name: 'make_outbound_call',
        description: 'Call a single contact with a specific purpose. Use when user says "call [contact] and [explain/discuss/tell them about] [purpose]". E.g. "call John and explain our new promo", "call contact Be about the discount". If user specifies an agent ("use Sarah"), pass voiceAgentName.',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact to call (required)' },
            phoneNumber: { type: 'string', description: 'Phone number (optional if contact exists)' },
            purpose: { type: 'string', description: 'What to discuss - e.g. new promo, 10% discount (required)' },
            notes: { type: 'string', description: 'Talking points or script for the call (optional)' },
            voiceAgentName: { type: 'string', description: 'Which agent to use if user has a preference (optional)' },
            immediate: { type: 'boolean', description: 'Call now (true) or schedule (false). Default true.' },
          },
          required: ['contactName', 'purpose'],
        },
        server_url: serverUrl,
      },
      {
        name: 'call_leads',
        description: 'Call multiple leads that match criteria. Use when user says "call all my leads from today", "call today\'s leads and give them 10% off product B", "call all new leads and explain the promo". System auto-selects best agent for the task unless user specifies one.',
        parameters: {
          type: 'object',
          properties: {
            purpose: { type: 'string', description: 'What to tell them - e.g. 10% off product B, new promo (required)' },
            notes: { type: 'string', description: 'Talking points (optional)' },
            period: {
              type: 'string',
              description: 'Which leads: "today" (created today), "yesterday", "last_7_days", "last_30_days"',
              enum: ['today', 'yesterday', 'last_7_days', 'last_30_days'],
            },
            status: { type: 'string', description: 'Filter by lead status (optional)' },
            limit: { type: 'number', description: 'Max leads to call (default 50)' },
            voiceAgentName: { type: 'string', description: 'Which agent to use if user has a preference (optional)' },
          },
          required: ['purpose'],
        },
        server_url: serverUrl,
      },
      {
        name: 'draft_sms',
        description: 'Draft an SMS to show the user before sending. ALWAYS use first when user asks to text a contact. Creates draft and asks "Should I send it now or schedule it for later?" Do NOT send until user confirms.',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact to text (required)' },
            message: { type: 'string', description: 'SMS message content (required)' },
            phoneNumber: { type: 'string', description: 'Phone number (optional if contact exists)' },
          },
          required: ['contactName', 'message'],
        },
        server_url: serverUrl,
      },
      {
        name: 'send_sms',
        description: 'Send SMS immediately. Use ONLY when user explicitly confirmed ("yes send it", "send it now"). Do NOT use for initial requests - use draft_sms first.',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact to text (required)' },
            message: { type: 'string', description: 'SMS message content (required)' },
            phoneNumber: { type: 'string', description: 'Phone number (optional if contact exists)' },
          },
          required: ['contactName', 'message'],
        },
        server_url: serverUrl,
      },
      {
        name: 'schedule_sms',
        description: 'Schedule SMS for later. Use when user says "schedule it", "send it tomorrow", "text them at 9am". Requires scheduledFor (ISO date).',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact (required)' },
            message: { type: 'string', description: 'SMS message (required)' },
            scheduledFor: { type: 'string', description: 'ISO date/time when to send' },
          },
          required: ['contactName', 'message', 'scheduledFor'],
        },
        server_url: serverUrl,
      },
      {
        name: 'draft_email',
        description: 'Draft an email to show the user before sending. ALWAYS use first when user asks to email a contact. Creates draft and asks "Should I send it now or schedule it for later?" Do NOT send until user confirms.',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact to email (required)' },
            subject: { type: 'string', description: 'Email subject (required)' },
            body: { type: 'string', description: 'Email body content (required)' },
            email: { type: 'string', description: 'Email address (optional if contact exists)' },
          },
          required: ['contactName', 'subject', 'body'],
        },
        server_url: serverUrl,
      },
      {
        name: 'send_email',
        description: 'Send email immediately. Use ONLY when user explicitly confirmed ("yes send it", "send it now"). Do NOT use for initial requests - use draft_email first.',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact to email (required)' },
            subject: { type: 'string', description: 'Email subject (required)' },
            body: { type: 'string', description: 'Email body content (required)' },
            email: { type: 'string', description: 'Email address (optional if contact exists)' },
          },
          required: ['contactName', 'subject', 'body'],
        },
        server_url: serverUrl,
      },
      {
        name: 'schedule_email',
        description: 'Schedule email for later. Use when user says "schedule it", "send it tomorrow", "send at 9am". Requires scheduledFor (ISO date).',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Name of contact (required)' },
            subject: { type: 'string', description: 'Email subject (required)' },
            body: { type: 'string', description: 'Email body (required)' },
            scheduledFor: { type: 'string', description: 'ISO date/time when to send' },
          },
          required: ['contactName', 'subject', 'body', 'scheduledFor'],
        },
        server_url: serverUrl,
      },
      {
        name: 'sms_leads',
        description: 'Send SMS to multiple leads by criteria. Use when user says "text all my leads from today", "SMS today\'s leads with [message]", "send SMS to all new leads". Use period: "today" for leads created today.',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'SMS message content (required). Use {name} for personalization.' },
            period: {
              type: 'string',
              description: 'Which leads: today, yesterday, last_7_days, last_30_days',
              enum: ['today', 'yesterday', 'last_7_days', 'last_30_days'],
            },
            status: { type: 'string', description: 'Filter by lead status (optional)' },
            limit: { type: 'number', description: 'Max leads (default 50)' },
          },
          required: ['message'],
        },
        server_url: serverUrl,
      },
      {
        name: 'email_leads',
        description: 'Send email to multiple leads by criteria. Use when user says "email all my leads from today", "send email to today\'s leads about [topic]", "email all new leads". Use period: "today" for leads created today.',
        parameters: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Email subject (required)' },
            message: { type: 'string', description: 'Email body content (required). Use {name} for personalization.' },
            period: {
              type: 'string',
              description: 'Which leads: today, yesterday, last_7_days, last_30_days',
              enum: ['today', 'yesterday', 'last_7_days', 'last_30_days'],
            },
            status: { type: 'string', description: 'Filter by lead status (optional)' },
            limit: { type: 'number', description: 'Max leads (default 50)' },
          },
          required: ['subject', 'message'],
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
