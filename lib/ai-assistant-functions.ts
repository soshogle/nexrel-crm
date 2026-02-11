/**
 * OpenAI Function Definitions for AI Assistant
 * These functions are passed to OpenAI's Function Calling API
 */

export interface FunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Get all available function definitions for the AI assistant
 */
export function getAIAssistantFunctions(): FunctionDefinition[] {
  return [
    // CRM Operations - Most Common
    {
      type: "function",
      function: {
        name: "create_lead",
        description: "Create a new contact/lead in the CRM. Use this when the user wants to add a new contact.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Contact person's name (required)",
            },
            email: {
              type: "string",
              description: "Contact's email address (optional)",
            },
            phone: {
              type: "string",
              description: "Contact's phone number (optional)",
            },
            company: {
              type: "string",
              description: "Company or business name (optional)",
            },
            status: {
              type: "string",
              description: "Lead status (optional, defaults to NEW)",
              enum: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
            },
          },
          required: ["name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_deal",
        description: "Create a new deal/opportunity in the sales pipeline",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Deal title (required)",
            },
            value: {
              type: "number",
              description: "Deal value in dollars (optional)",
            },
            leadId: {
              type: "string",
              description: "Associated lead/contact ID (optional)",
            },
          },
          required: ["title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_leads",
        description: "List contacts/leads. Use this when user wants to see their contacts.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Filter by status (optional)",
              enum: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
            },
            limit: {
              type: "number",
              description: "Maximum number of results (optional, default 10)",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_deals",
        description: "List deals in the sales pipeline",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of results (optional, default 10)",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_contacts",
        description: "Search for contacts by name, email, or company",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (required)",
            },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "delete_duplicate_contacts",
        description: "Find and delete duplicate contacts from the contacts list. This will identify duplicates based on email, phone, or business name and remove them, keeping the oldest contact.",
        parameters: {
          type: "object",
          properties: {
            confirm: {
              type: "boolean",
              description: "Confirmation to proceed with deletion (optional, defaults to true)",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_campaign",
        description: "Create a new marketing campaign",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Campaign name (required)",
            },
            type: {
              type: "string",
              description: "Campaign type (optional)",
              enum: ["SMS", "EMAIL", "VOICE"],
            },
          },
          required: ["name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_campaigns",
        description: "List all marketing campaigns",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of results (optional)",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_statistics",
        description: "Get CRM statistics, sales data, graphs/charts, and 'what if' scenario predictions. Use when user asks for: graphs, charts, visualizations, sales data, revenue comparisons, statistics, OR 'what if' scenarios (e.g. 'what if I convert 10 more leads?', 'what if I get 50 more leads?', 'what if conversion rate improved 5%?'). Displays results on AI Brain page.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              description: "Time period for statistics (optional). Examples: 'last_7_months', 'last_year', 'last_30_days', 'all_time'",
            },
            compareWith: {
              type: "string",
              description: "Compare with previous period (optional). Examples: 'previous_year', 'previous_period'",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_appointment",
        description: "Schedule an appointment or meeting",
        parameters: {
          type: "object",
          properties: {
            customerName: {
              type: "string",
              description: "Customer or attendee name (required)",
            },
            customerEmail: {
              type: "string",
              description: "Customer email (required)",
            },
            customerPhone: {
              type: "string",
              description: "Customer phone number (optional)",
            },
            date: {
              type: "string",
              description: "Appointment date in YYYY-MM-DD format (required)",
            },
            time: {
              type: "string",
              description: "Appointment time in HH:MM format (required)",
            },
            duration: {
              type: "number",
              description: "Duration in minutes (optional, default 30)",
            },
          },
          required: ["customerName", "customerEmail", "date", "time"],
        },
      },
    },
    // Setup & Configuration
    {
      type: "function",
      function: {
        name: "setup_stripe",
        description: "Configure Stripe payment processor",
        parameters: {
          type: "object",
          properties: {
            publishableKey: {
              type: "string",
              description: "Stripe publishable key (starts with pk_)",
            },
            secretKey: {
              type: "string",
              description: "Stripe secret key (starts with sk_)",
            },
          },
          required: ["publishableKey", "secretKey"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "setup_twilio",
        description: "Configure Twilio for SMS and voice calls",
        parameters: {
          type: "object",
          properties: {
            accountSid: {
              type: "string",
              description: "Twilio Account SID",
            },
            authToken: {
              type: "string",
              description: "Twilio Auth Token",
            },
            phoneNumber: {
              type: "string",
              description: "Twilio phone number",
            },
          },
          required: ["accountSid", "authToken", "phoneNumber"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_voice_agent",
        description: "Create a new AI voice agent for calls",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Voice agent name (required)",
            },
            voiceId: {
              type: "string",
              description: "Voice ID (optional, defaults to rachel)",
            },
            prompt: {
              type: "string",
              description: "Greeting message or prompt (optional)",
            },
            businessName: {
              type: "string",
              description: "Business name (optional)",
            },
          },
          required: ["name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_voice_agents",
        description: "List all voice agents",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    {
      type: "function",
      function: {
        name: "debug_voice_agent",
        description: "Run diagnostics on a voice agent to identify issues",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Voice agent name (optional)",
            },
            agentId: {
              type: "string",
              description: "Voice agent ID (optional)",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "fix_voice_agent",
        description: "Automatically fix issues with a voice agent",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Voice agent name (optional)",
            },
            agentId: {
              type: "string",
              description: "Voice agent ID (optional)",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_workflow",
        description: "Create a complex automation workflow with multiple steps, timing, and personalization. Use this when the user wants to automate a sequence of actions like calling contacts, sending emails/SMS, scheduling follow-ups, etc. The workflow can include delays (wait X days/weeks/hours), personalization, and conditional logic.",
        parameters: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Detailed workflow description in natural language describing all steps, timing, and personalization (required). Example: 'Call contacts on their birthday with personalized message, then wait a week, invite them to webinar, email invitation, SMS link, remind day before and 2 hours before'",
            },
            goal: {
              type: "string",
              description: "Workflow goal or objective (optional)",
            },
            name: {
              type: "string",
              description: "Workflow name (optional - will be generated from description if not provided)",
            },
          },
          required: ["description"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "add_workflow_task",
        description: "Add a task/step to an existing workflow that the user is currently editing. Use when the user says things like 'add a trigger when lead is created', 'add a step to send email', 'add an action to call them', 'add a delay of 2 days'. Requires workflowId from context (active workflow draft).",
        parameters: {
          type: "object",
          properties: {
            workflowId: {
              type: "string",
              description: "The workflow ID to add the task to (from active workflow draft context - REQUIRED when user is editing a workflow)",
            },
            name: {
              type: "string",
              description: "Task name (required). E.g. 'Send welcome email', 'Call on birthday', '2-day delay'",
            },
            taskType: {
              type: "string",
              description: "Task type - TRIGGER for enrollment/start triggers, or action type like EMAIL, SMS, VOICE_CALL, DELAY, CUSTOM",
              enum: ["TRIGGER", "EMAIL", "SMS", "VOICE_CALL", "DELAY", "CREATE_TASK", "CUSTOM"],
            },
            description: {
              type: "string",
              description: "Optional task description",
            },
          },
          required: ["workflowId", "name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "make_outbound_call",
        description: "Call a single contact with a specific purpose. Use when user says 'call [contact] and [explain/discuss] [topic]' - e.g. 'call John and explain our new promo', 'call contact Be about the discount'. If user specifies an agent ('use Sarah'), pass voiceAgentName. Otherwise system auto-selects the best agent for the task.",
        parameters: {
          type: "object",
          properties: {
            contactName: {
              type: "string",
              description: "Name of the contact to call (required). Can be a contact name or lead name.",
            },
            phoneNumber: {
              type: "string",
              description: "Phone number to call (optional if contactName is provided and contact exists)",
            },
            purpose: {
              type: "string",
              description: "What to discuss - e.g. new promo, 10% discount (required)",
            },
            notes: {
              type: "string",
              description: "Call script or talking points (optional but recommended)",
            },
            voiceAgentId: {
              type: "string",
              description: "Voice agent ID to use (optional - auto-selects best agent if not provided)",
            },
            voiceAgentName: {
              type: "string",
              description: "Voice agent name to use if user has a preference, e.g. 'use Sarah' (optional)",
            },
            immediate: {
              type: "boolean",
              description: "Whether to call immediately (true) or schedule for later (false). Defaults to true.",
            },
            scheduledFor: {
              type: "string",
              description: "When to schedule the call (ISO date string). Required if immediate is false.",
            },
            leadId: {
              type: "string",
              description: "Lead/contact ID if calling a specific lead (optional)",
            },
          },
          required: ["contactName", "purpose"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "call_leads",
        description: "Call multiple leads that match criteria. Use when user says 'call all my leads from today', 'call today's leads and give them 10% off product B', 'call all new leads and explain the promo'. System auto-selects the best agent unless user specifies one. Use list_voice_agents first if user asks which agent to use.",
        parameters: {
          type: "object",
          properties: {
            purpose: {
              type: "string",
              description: "What to tell them - e.g. 10% off product B, new promo (required)",
            },
            notes: {
              type: "string",
              description: "Talking points for the call (optional)",
            },
            period: {
              type: "string",
              description: "Which leads: 'today' (created today), 'yesterday', 'last_7_days', 'last_30_days'",
              enum: ["today", "yesterday", "last_7_days", "last_30_days"],
            },
            status: {
              type: "string",
              description: "Filter by lead status (optional)",
            },
            limit: {
              type: "number",
              description: "Max leads to call (default 50)",
            },
            voiceAgentName: {
              type: "string",
              description: "Which agent to use if user has a preference (optional)",
            },
          },
          required: ["purpose"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "draft_sms",
        description: "Draft an SMS to show the user before sending. ALWAYS use first when user asks to text a contact. Creates draft and displays on screen. Do NOT send until user confirms. After drafting, ask: 'Should I send it now or schedule it for later?'",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Name of contact to text (required)" },
            message: { type: "string", description: "SMS message content (required)" },
            phoneNumber: { type: "string", description: "Phone number (optional if contact exists)" },
          },
          required: ["contactName", "message"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "send_sms",
        description: "Send SMS immediately. Use ONLY when user has explicitly confirmed ('yes send it', 'send it now'). Do NOT use for initial requests - use draft_sms first.",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Name of contact to text (required)" },
            message: { type: "string", description: "SMS message content (required)" },
            phoneNumber: { type: "string", description: "Phone number (optional if contact exists)" },
          },
          required: ["contactName", "message"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "schedule_sms",
        description: "Schedule SMS for later. Use when user says 'schedule it', 'send it tomorrow', 'text them at 9am'. Requires scheduledFor (ISO date).",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Name of contact (required)" },
            message: { type: "string", description: "SMS message (required)" },
            scheduledFor: { type: "string", description: "ISO date/time when to send" },
          },
          required: ["contactName", "message", "scheduledFor"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "draft_email",
        description: "Draft an email to show the user before sending. ALWAYS use this first when user asks to email a contact. Generates the email and displays it on screen. Do NOT send until user confirms. After drafting, ask: 'Should I send it now or schedule it for later?'",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Name of contact to email (required)" },
            subject: { type: "string", description: "Email subject (required)" },
            body: { type: "string", description: "Email body content (required)" },
            email: { type: "string", description: "Email address (optional if contact exists)" },
          },
          required: ["contactName", "subject", "body"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "send_email",
        description: "Send an email immediately. Use ONLY when user has explicitly confirmed (e.g. 'yes send it', 'send it now'). Do NOT use for initial email requests - use draft_email first.",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Name of contact to email (required)" },
            subject: { type: "string", description: "Email subject (required)" },
            body: { type: "string", description: "Email body content (required)" },
            email: { type: "string", description: "Email address (optional if contact exists)" },
          },
          required: ["contactName", "subject", "body"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "schedule_email",
        description: "Schedule an email to be sent at a later time. Use when user says 'schedule it for later', 'send it tomorrow', 'send it at 9am', etc. Creates a workflow to send at the requested time.",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Name of contact (required)" },
            subject: { type: "string", description: "Email subject (required)" },
            body: { type: "string", description: "Email body (required)" },
            scheduledFor: { type: "string", description: "ISO date/time when to send (e.g. 2026-02-12T09:00:00)" },
          },
          required: ["contactName", "subject", "body", "scheduledFor"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "sms_leads",
        description: "Send SMS to multiple leads by criteria. Use when user says 'text all my leads from today', 'SMS today's leads with [message]', 'send SMS to all new leads'. Use period: 'today' for leads created today.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string", description: "SMS message content (required). Use {name} for personalization." },
            period: {
              type: "string",
              description: "Which leads: today, yesterday, last_7_days, last_30_days",
              enum: ["today", "yesterday", "last_7_days", "last_30_days"],
            },
            status: { type: "string", description: "Filter by lead status (optional)" },
            limit: { type: "number", description: "Max leads (default 50)" },
          },
          required: ["message"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "email_leads",
        description: "Send email to multiple leads by criteria. Use when user says 'email all my leads from today', 'send email to today's leads about [topic]', 'email all new leads'. Use period: 'today' for leads created today.",
        parameters: {
          type: "object",
          properties: {
            subject: { type: "string", description: "Email subject (required)" },
            message: { type: "string", description: "Email body content (required). Use {name} for personalization." },
            period: {
              type: "string",
              description: "Which leads: today, yesterday, last_7_days, last_30_days",
              enum: ["today", "yesterday", "last_7_days", "last_30_days"],
            },
            status: { type: "string", description: "Filter by lead status (optional)" },
            limit: { type: "number", description: "Max leads (default 50)" },
          },
          required: ["subject", "message"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "navigate_to",
        description: "Navigate the user to a specific page in the application. Use this when the user wants to go somewhere or after completing an action.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The path to navigate to (e.g., /dashboard/contacts, /dashboard/pipeline)",
              enum: [
                "/dashboard/contacts",
                "/dashboard/pipeline",
                "/dashboard/campaigns",
                "/dashboard/calendar",
                "/dashboard/analytics",
                "/dashboard/messages",
                "/dashboard/workflows",
                "/dashboard/voice-agents",
                "/dashboard/settings",
                "/dashboard/team",
                "/onboarding",
              ],
            },
          },
          required: ["path"],
        },
      },
    },
  ];
}

/**
 * Map function names to their corresponding action names
 */
export function mapFunctionToAction(functionName: string): string {
  const mapping: Record<string, string> = {
    create_lead: "create_lead",
    create_deal: "create_deal",
    list_leads: "list_leads",
    list_deals: "list_deals",
    search_contacts: "search_contacts",
    delete_duplicate_contacts: "delete_duplicate_contacts",
    create_campaign: "create_campaign",
    list_campaigns: "list_campaigns",
    get_statistics: "get_statistics",
    create_appointment: "create_appointment",
    setup_stripe: "setup_stripe",
    setup_twilio: "setup_twilio",
    create_voice_agent: "create_voice_agent",
    list_voice_agents: "list_voice_agents",
    debug_voice_agent: "debug_voice_agent",
    fix_voice_agent: "fix_voice_agent",
    create_workflow: "create_workflow",
    add_workflow_task: "add_workflow_task",
    make_outbound_call: "make_outbound_call",
    call_leads: "call_leads",
    draft_sms: "draft_sms",
    send_sms: "send_sms",
    schedule_sms: "schedule_sms",
    draft_email: "draft_email",
    send_email: "send_email",
    schedule_email: "schedule_email",
    sms_leads: "sms_leads",
    email_leads: "email_leads",
    navigate_to: "navigate_to", // Special case - handled differently
  };
  return mapping[functionName] || functionName;
}

/**
 * Get navigation URL for an action result
 */
export function getNavigationUrlForAction(
  action: string,
  result: any
): string | null {
  console.log(`🧭 [getNavigationUrlForAction] Called with action: ${action}`);
  console.log(`🧭 [getNavigationUrlForAction] Result structure:`, {
    hasResult: !!result,
    hasResultResult: !!result?.result,
    resultKeys: result ? Object.keys(result) : [],
    resultResultKeys: result?.result ? Object.keys(result.result) : [],
  });
  
  switch (action) {
    case "create_lead":
      // The action endpoint returns: { success: true, action: "create_lead", result: { lead: {...} } }
      const leadId = result?.result?.lead?.id;
      console.log(`🧭 [getNavigationUrlForAction] create_lead - leadId:`, leadId);
      const navUrl = leadId ? `/dashboard/contacts?id=${leadId}` : "/dashboard/contacts";
      console.log(`🧭 [getNavigationUrlForAction] create_lead - returning:`, navUrl);
      return navUrl;
    case "list_leads":
    case "search_contacts":
      return "/dashboard/contacts";
    case "create_deal":
      const dealId = result?.result?.deal?.id;
      return dealId ? `/dashboard/pipeline?id=${dealId}` : "/dashboard/pipeline";
    case "list_deals":
      return "/dashboard/pipeline";
    case "list_campaigns":
      return "/dashboard/campaigns";
    case "create_appointment":
      return "/dashboard/calendar";
    case "create_voice_agent":
    case "list_voice_agents":
    case "debug_voice_agent":
    case "fix_voice_agent":
    case "make_outbound_call":
      return "/dashboard/voice-agents";
    case "setup_stripe":
    case "setup_twilio":
      return "/dashboard/settings";
    case "create_workflow":
    case "add_workflow_task":
      return "/dashboard/workflows";
    case "make_outbound_call":
    case "call_leads":
      return "/dashboard/voice-agents";
    case "draft_sms":
    case "send_sms":
    case "schedule_sms":
    case "send_email":
    case "draft_email":
    case "schedule_email":
    case "sms_leads":
    case "email_leads":
      return "/dashboard/messages";
    case "delete_duplicate_contacts":
      return "/dashboard/contacts";
    default:
      return null;
  }
}
