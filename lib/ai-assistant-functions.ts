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
        description: "Get CRM statistics and overview",
        parameters: {
          type: "object",
          properties: {},
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
        description: "Create an automation workflow",
        parameters: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Workflow description in natural language (required)",
            },
            goal: {
              type: "string",
              description: "Workflow goal (optional)",
            },
          },
          required: ["description"],
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
      return "/dashboard/voice-agents";
    case "setup_stripe":
    case "setup_twilio":
      return "/dashboard/settings";
    case "create_workflow":
      return "/dashboard/workflows";
    default:
      return null;
  }
}
