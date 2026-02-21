/**
 * CRM Voice Agent Service
 * Manages the creation and configuration of CRM voice assistants
 */

import { prisma } from '@/lib/db';
import { PLATFORM_SETTINGS_WITH_OVERRIDES } from '@/lib/elevenlabs-overrides';
import { EASTERN_TIME_SYSTEM_INSTRUCTION } from '@/lib/voice-time-context';
import { LANGUAGE_PROMPT_SECTION } from '@/lib/voice-languages';

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
      throw new Error('Soshogle AI voice is not configured');
    }

    const agentPayload = {
      name: `${businessName} CRM Assistant`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
          },
          first_message: this.getGreetingMessage(language),
          language: 'en', // API only accepts single codes. Multilingual via prompt.
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs',
        },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
          model_id: 'eleven_turbo_v2_5', // v2_5 required for multilingual
        },
        turn: {
          mode: 'turn',
          turn_timeout_seconds: 30, // Max — prevents premature cutoff when user pauses
        },
        conversation: {
          max_duration_seconds: 1800, // 30 min
          turn_timeout_seconds: 30,
        },
      },
      platform_settings: {
        auth: {
          enable_auth: false,
        },
        allowed_overrides: {
          agent: ['prompt', 'language'],
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
  private buildCrmSystemPrompt(user: any, _language: string): string {
    const { getConfidentialityGuard } = require('@/lib/ai-confidentiality-guard');

    return `${LANGUAGE_PROMPT_SECTION}

You are an AI assistant for ${user.name || 'the CRM'}. You help users manage their CRM through voice commands and provide real-time insights about their business data.

Your role:
- Query and report CRM statistics (revenue, leads, deals, contacts, campaigns)
- Help users create and manage leads, deals, and contacts
- Search for contacts and deals
- Provide insights about business performance
- Set up integrations (payments, SMS, email, etc.)
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
When users ask to "generate a report", "create a sales report", "build a report for last month", "give me a leads report" → use create_report. The report will be saved and displayed on the Reports page.

When users ask you to do something:
1. Acknowledge the request
2. Ask for any missing information (one piece at a time)
3. Execute the action using available functions
4. Confirm completion

Available functions:
- list_leads: List contacts/leads. USE THIS when user asks "how many leads", "how many new leads today", "show my contacts", "show my leads", or wants to see the list of contacts. Use period: "today" for leads created today.
- list_deals: List deals in the pipeline. USE THIS when user asks "how many deals", "show my deals", or wants to see the pipeline.
- get_statistics: Get comprehensive CRM statistics (revenue, charts, graphs). USE THIS only when user asks for charts, graphs, visualizations, sales over time, revenue comparison, or monthly trends.
- create_report: Create and save a report to the Reports page. USE when user says "generate a report", "create a sales report", "build a report for last month", "give me a leads report". Report is saved and visible on Reports page.
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
- add_workflow_task: Add a step to the workflow. USE when user describes a step: "add send email", "add call them", "add 2 day delay", "add trigger when lead created". Call for EACH step. workflowId is auto-filled from active draft.
- create_task: Create a task. USE when user says "remind me to follow up with John tomorrow", "create a task to call back Acme Corp". Requires title, optional dueDate/description.
- list_tasks: List tasks. USE when user says "show my overdue tasks", "what's due today?", "my tasks". Use overdue: true for overdue.
- complete_task: Mark task done. USE when user says "mark X as done", "complete the task". Use taskTitle to match.
- add_note: Add note to contact or deal. USE when user says "add a note to John: interested in enterprise", "log note on Acme deal: sent proposal Tuesday". Requires content, contactName or dealTitle.
- create_appointment: Schedule an appointment. USE when user says "schedule meeting with John", "book appointment for Tuesday 2pm", "create appointment with Acme Corp". Requires customerName, customerEmail, date, time.
- list_appointments: List appointments. USE when user says "show my appointments", "what's on my calendar?", "list today's appointments".
- update_deal_stage: Move deal in pipeline. USE when user says "move Acme deal to Negotiation", "mark Big Corp deal as won". Requires dealTitle, stageName.
- create_invoice: Create invoice. USE when user says "send invoice to John for $500". Requires contactName, amount.
- list_overdue_invoices: List overdue invoices. USE when user says "show unpaid invoices", "what's overdue?".
- get_daily_briefing: Get daily summary. USE when user says "what do I need to focus on today?", "morning digest", "what should I prioritize?".
- update_deal: Update deal value or close date. USE when user says "update Acme deal to $15,000", "set close date to March 15". Requires dealTitle, optional value/expectedCloseDate.
- get_follow_up_suggestions: Get who to contact. USE when user says "who haven't I contacted in 2 weeks?", "who should I follow up with?". Use period: last_week, last_2_weeks, last_month.
- get_meeting_prep: Pre-call briefing. USE when user says "what should I know before my call with John?", "prep me for my meeting with Acme". Requires contactName.
- create_bulk_tasks: Create tasks for leads. USE when user says "create follow-up tasks for all leads from this week", "add tasks for today's leads". Use taskTitle with {name} for contact name, period: today/last_week/last_2_weeks.
- clone_website: Clone a site from URL. USE when user says "clone example.com", "clone my website from [URL]". Requires sourceUrl.
- create_website: Create new site from template. USE when user says "create a website", "build a site for my business". Optional name, templateType, businessDescription.
- list_websites: List user's websites. USE when user says "show my websites", "how many sites do I have".
- modify_website: Change website content via AI. USE when user says "change the hero text", "update the about section". Requires websiteId (use active_website_id when editing) and message.
- create_ai_employee: Create an AI Team employee. USE when user says "create an employee", "add an employee", "add an AI employee", "create a sales assistant named Sarah". In this CRM, "employee" means AI assistant. Requires profession (role) and customName. If missing, ask: "What role? (e.g. Sales Assistant) And what name?"
- list_ai_employees: List AI Team employees. USE when user says "show my AI team", "list my employees", "who are my AI assistants?".

IMPORTANT: When users ask "how many new leads today" or "show me my leads" → use list_leads (navigates to contacts page). When users ask for graphs, charts, or sales trends → use get_statistics (shows visualizations on AI Brain). Do not use get_statistics for simple lead/deal counts.
For workflows: when user says "create workflow", acknowledge and say you've opened the builder (client opens it). Then for each step ("add email", "add delay", "add call") → add_workflow_task.
WORKFLOW BUILDER MODE: When in_workflow_builder dynamic variable is "true" (user has active workflow draft), the user is building a workflow. Do NOT use list_leads, list_deals, or search_contacts. Only use add_workflow_task. When user says "contacts", "pipeline", "leads" in this context, they mean workflow steps (e.g. "when lead created" = trigger, "email contacts" = email step, "add step for pipeline" = deal stage step). Use add_workflow_task for each step they describe.
WEBSITE BUILDER MODE: When in_website_builder dynamic variable is "true" (user is on websites page), prefer website functions: clone_website, create_website, list_websites, modify_website. When active_website_id is set, the user is editing that site—ALWAYS pass websiteId: active_website_id for modify_website. When website_builder_context is set, use it to understand what the user sees (e.g. "choosing clone or template", "in clone mode with URL X", "editing website Y"). Follow along with what they see and help them through the build.
SCREEN CONTEXT: When visible_screen_content dynamic variable is provided, it describes the visible text on the user's screen (headings, labels, form fields, buttons). Use it to understand what they're looking at and provide relevant help. Reference specific elements they see when explaining.
CONTEXT AWARENESS: Use current_path, active_lead_id, active_deal_id when available. When user is viewing a contact (active_lead_id), use it for add_note, create_deal. When viewing a deal (active_deal_id), use it for add_note, update_deal_stage.
For calling: "call John and tell him about the promo" → make_outbound_call. "call all leads from today with 10% off" → call_leads. If user has a preference for which agent ("use Sarah"), pass voiceAgentName. If unsure, use list_voice_agents and ask which agent they want.

Remember: You're speaking, not typing. Keep it brief and natural. When reporting statistics, speak clearly and highlight the most important numbers.
${EASTERN_TIME_SYSTEM_INSTRUCTION}
${getConfidentialityGuard()}`;
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
        name: 'create_report',
        description: 'Create and save a report to the Reports page. Use when user says "generate a report", "create a sales report", "build a report for last month", "give me a leads report". The report will be saved and displayed on the Reports page.',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Report title (required). E.g. "Sales Report Q1", "Leads Overview"',
            },
            reportType: {
              type: 'string',
              description: 'Type of report',
              enum: ['sales', 'leads', 'revenue', 'overview', 'custom'],
            },
            period: {
              type: 'string',
              description: 'Time period. Examples: "last_7_days", "last_month", "all_time"',
            },
          },
          required: ['title'],
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
      {
        name: 'add_workflow_task',
        description: 'Add a task/step to the workflow the user is currently building. Use when user describes a step: "add send email", "add a step to call them", "add 2 day delay", "add trigger when lead created". Call for EACH step. workflowId is auto-filled from active draft.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Task name (required). E.g. "Send welcome email", "Call contact", "2 day delay"' },
            taskType: {
              type: 'string',
              description: 'Task type - TRIGGER, EMAIL, SMS, VOICE_CALL, DELAY, or CUSTOM',
              enum: ['TRIGGER', 'EMAIL', 'SMS', 'VOICE_CALL', 'DELAY', 'CREATE_TASK', 'CUSTOM'],
            },
            workflowId: { type: 'string', description: 'Workflow ID (optional - uses active draft if not provided)' },
          },
          required: ['name'],
        },
        server_url: serverUrl,
      },
      {
        name: 'create_task',
        description: 'Create a CRM task. Use when user says "remind me to follow up with John tomorrow", "create a task to call back Acme Corp".',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title (required)' },
            description: { type: 'string', description: 'Task description (optional)' },
            dueDate: { type: 'string', description: 'Due date YYYY-MM-DD (optional)' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Priority (optional)' },
          },
          required: ['title'],
        },
        server_url: serverUrl,
      },
      {
        name: 'list_tasks',
        description: 'List tasks. Use when user says "show my overdue tasks", "what\'s due today?", "my tasks".',
        parameters: {
          type: 'object',
          properties: {
            overdue: { type: 'boolean', description: 'Show only overdue tasks (optional)' },
            limit: { type: 'number', description: 'Max results (default 20)' },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'complete_task',
        description: 'Mark a task as done. Use when user says "mark X as done", "complete the task".',
        parameters: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID (optional)' },
            taskTitle: { type: 'string', description: 'Task title to match (use if taskId not known)' },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'create_ai_employee',
        description: 'Create an AI Team employee. In this CRM, "employee" means AI assistant. Use when user says "create an employee", "add an employee", "add an AI employee", "create a sales assistant named Sarah". Requires profession (role) and customName. If missing, ask for role and name.',
        parameters: {
          type: 'object',
          properties: {
            profession: { type: 'string', description: 'Role e.g. Sales Assistant, Follow-up Specialist (required)' },
            customName: { type: 'string', description: 'Display name e.g. Sarah, Alex (required)' },
          },
          required: ['profession', 'customName'],
        },
        server_url: serverUrl,
      },
      {
        name: 'list_ai_employees',
        description: 'List AI Team employees. Use when user says "show my AI team", "list my employees", "who are my AI assistants?".',
        parameters: { type: 'object', properties: {} },
        server_url: serverUrl,
      },
      {
        name: 'add_note',
        description: 'Add a note to a contact or deal. Use when user says "add a note to John: interested in enterprise", "log note on Acme deal: sent proposal Tuesday".',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Contact name (for contact notes)' },
            dealTitle: { type: 'string', description: 'Deal title (for deal notes)' },
            content: { type: 'string', description: 'Note content (required)' },
          },
          required: ['content'],
        },
        server_url: serverUrl,
      },
      {
        name: 'create_appointment',
        description: 'Schedule an appointment or meeting. Use when user says "schedule meeting with John", "book appointment for Tuesday 2pm", "create appointment with Acme Corp".',
        parameters: {
          type: 'object',
          properties: {
            customerName: { type: 'string', description: 'Customer or attendee name (required)' },
            customerEmail: { type: 'string', description: 'Customer email (required)' },
            customerPhone: { type: 'string', description: 'Customer phone (optional)' },
            date: { type: 'string', description: 'Appointment date YYYY-MM-DD (required)' },
            time: { type: 'string', description: 'Appointment time HH:MM (required)' },
            duration: { type: 'number', description: 'Duration in minutes (optional, default 30)' },
          },
          required: ['customerName', 'customerEmail', 'date', 'time'],
        },
        server_url: serverUrl,
      },
      {
        name: 'list_appointments',
        description: 'List appointments. Use when user says "show my appointments", "what\'s on my calendar?", "list today\'s appointments".',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Filter by date YYYY-MM-DD (optional)' },
            limit: { type: 'number', description: 'Max results (default 20)' },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'update_deal_stage',
        description: 'Move a deal to a pipeline stage. Use when user says "move Acme deal to Negotiation", "mark Big Corp deal as won".',
        parameters: {
          type: 'object',
          properties: {
            dealTitle: { type: 'string', description: 'Deal title (required)' },
            stageName: { type: 'string', description: 'Target stage: Negotiation, Won, Lost, Proposal (required)' },
          },
          required: ['dealTitle', 'stageName'],
        },
        server_url: serverUrl,
      },
      {
        name: 'create_invoice',
        description: 'Create an invoice. Use when user says "send invoice to John for $500", "create invoice for Acme deal".',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Customer name (required)' },
            amount: { type: 'number', description: 'Amount in dollars (required)' },
            description: { type: 'string', description: 'Line item description (optional)' },
          },
          required: ['contactName', 'amount'],
        },
        server_url: serverUrl,
      },
      {
        name: 'list_overdue_invoices',
        description: 'List unpaid/overdue invoices. Use when user says "show unpaid invoices", "what\'s overdue?".',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results (default 20)' },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'get_daily_briefing',
        description: 'Get daily summary. Use when user says "what do I need to focus on today?", "morning digest", "what should I prioritize?".',
        parameters: { type: 'object', properties: {} },
        server_url: serverUrl,
      },
      {
        name: 'update_deal',
        description: 'Update deal value or close date. Use when user says "update Acme deal to $15,000", "set close date to March 15".',
        parameters: {
          type: 'object',
          properties: {
            dealTitle: { type: 'string', description: 'Deal title (required)' },
            value: { type: 'number', description: 'New value in dollars (optional)' },
            expectedCloseDate: { type: 'string', description: 'Close date YYYY-MM-DD (optional)' },
          },
          required: ['dealTitle'],
        },
        server_url: serverUrl,
      },
      {
        name: 'get_follow_up_suggestions',
        description: 'Get who to contact next. Use when user says "who haven\'t I contacted in 2 weeks?", "who should I follow up with?".',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['last_week', 'last_2_weeks', 'last_month'], description: 'Time period' },
            limit: { type: 'number', description: 'Max suggestions (default 10)' },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'get_meeting_prep',
        description: 'Pre-call briefing. Use when user says "what should I know before my call with John?", "prep me for my meeting with Acme".',
        parameters: {
          type: 'object',
          properties: {
            contactName: { type: 'string', description: 'Contact name (required)' },
          },
          required: ['contactName'],
        },
        server_url: serverUrl,
      },
      {
        name: 'create_bulk_tasks',
        description: 'Create follow-up tasks for leads. Use when user says "create follow-up tasks for all leads from this week", "add tasks for today\'s leads".',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: { type: 'string', description: 'Task title, use {name} for contact name (required)' },
            period: { type: 'string', enum: ['today', 'last_week', 'last_2_weeks'], description: 'Which leads' },
            dueInDays: { type: 'number', description: 'Days from now for due date (default 1)' },
          },
          required: ['taskTitle'],
        },
        server_url: serverUrl,
      },
      {
        name: 'clone_website',
        description: 'Clone a website from an existing URL. Use when user says "clone my website from example.com", "clone example.com", "rebuild my site from a URL". Requires sourceUrl. Optional name for the new site.',
        parameters: {
          type: 'object',
          properties: {
            sourceUrl: { type: 'string', description: 'URL of website to clone (required). E.g. "example.com" or "https://example.com"' },
            name: { type: 'string', description: 'Name for the new cloned website (optional)' },
          },
          required: ['sourceUrl'],
        },
        server_url: serverUrl,
      },
      {
        name: 'create_website',
        description: 'Create a new website from a template. Use when user says "create a new website", "build a website for my plumbing business", "make me a service website". Optional: name, templateType (SERVICE or PRODUCT), businessDescription, services, products.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Website name (optional, defaults to New Website)' },
            templateType: { type: 'string', enum: ['SERVICE', 'PRODUCT'], description: 'SERVICE for service business, PRODUCT for store/ecommerce' },
            businessDescription: { type: 'string', description: 'Brief business description (optional)' },
            services: { type: 'string', description: 'Comma-separated services (optional)' },
            products: { type: 'string', description: 'Comma-separated products (optional)' },
          },
        },
        server_url: serverUrl,
      },
      {
        name: 'list_websites',
        description: 'List the user\'s websites. Use when user says "show my websites", "how many websites do I have", "list my sites".',
        parameters: { type: 'object', properties: {} },
        server_url: serverUrl,
      },
      {
        name: 'modify_website',
        description: 'Modify website content via AI. Use when user says "change the hero text to Welcome", "update the about section", "add a pricing section". Requires websiteId (from active_website_id when editing) and message describing the change.',
        parameters: {
          type: 'object',
          properties: {
            websiteId: { type: 'string', description: 'Website ID to modify (required). Use active_website_id from context when user is editing a site.' },
            message: { type: 'string', description: 'Description of the change (required). E.g. "Change the hero title to Welcome to Acme"' },
          },
          required: ['websiteId', 'message'],
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
        platform_settings: {
          ...(currentAgent.platform_settings || {}),
          ...PLATFORM_SETTINGS_WITH_OVERRIDES,
        },
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
