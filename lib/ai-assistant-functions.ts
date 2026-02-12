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
        name: "update_lead",
        description: "Update a contact/lead. Use when user says 'change John's email to X', 'update contact status', 'edit lead phone number'.",
        parameters: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID (optional if contactName provided)" },
            contactName: { type: "string", description: "Contact name to find (optional if leadId provided)" },
            email: { type: "string", description: "New email (optional)" },
            phone: { type: "string", description: "New phone (optional)" },
            status: { type: "string", enum: ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"], description: "New status (optional)" },
            company: { type: "string", description: "New company name (optional)" },
            name: { type: "string", description: "New contact person name (optional)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_lead_details",
        description: "Get full details for a contact. Use when user says 'show me John's details', 'what do we know about Acme Corp?', 'tell me about this lead'. Returns notes, tasks, deal history.",
        parameters: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID (optional if contactName provided)" },
            contactName: { type: "string", description: "Contact or company name (optional if leadId provided)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "delete_lead",
        description: "Delete or archive a contact. Use when user says 'delete this lead', 'remove John from contacts', 'archive Acme Corp'.",
        parameters: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID (optional if contactName provided)" },
            contactName: { type: "string", description: "Contact name to delete (optional if leadId provided)" },
          },
          required: [],
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
        name: "get_deal_details",
        description: "Get full details for a deal. Use when user says 'show me the Acme deal', 'what are the details of this deal?'.",
        parameters: {
          type: "object",
          properties: {
            dealId: { type: "string", description: "Deal ID (optional if dealTitle provided)" },
            dealTitle: { type: "string", description: "Deal title/name (optional if dealId provided)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "delete_deal",
        description: "Delete or archive a deal. Use when user says 'delete this deal', 'remove the Acme deal'.",
        parameters: {
          type: "object",
          properties: {
            dealId: { type: "string", description: "Deal ID (optional if dealTitle provided)" },
            dealTitle: { type: "string", description: "Deal title to delete (optional if dealId provided)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_pipeline",
        description: "Create a new sales pipeline. Use when user says 'create a pipeline for X', 'add a new pipeline'.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Pipeline name (required)" },
            description: { type: "string", description: "Pipeline description (optional)" },
          },
          required: ["name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_pipeline_stage",
        description: "Add a stage to a pipeline. Use when user says 'add a stage to pipeline X', 'create a stage called Negotiation'.",
        parameters: {
          type: "object",
          properties: {
            pipelineName: { type: "string", description: "Pipeline name (required)" },
            stageName: { type: "string", description: "Stage name (required)" },
            probability: { type: "number", description: "Win probability 0-100 (optional)" },
          },
          required: ["pipelineName", "stageName"],
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
    // Task Management
    {
      type: "function",
      function: {
        name: "create_task",
        description: "Create a CRM task/to-do. Use when user says 'remind me to follow up with John tomorrow', 'create a task to call back Acme Corp', 'add a task for...'",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Task title (required)" },
            description: { type: "string", description: "Task description (optional)" },
            dueDate: { type: "string", description: "Due date in ISO format YYYY-MM-DD (optional)" },
            leadId: { type: "string", description: "Associate with contact/lead (optional)" },
            dealId: { type: "string", description: "Associate with deal (optional)" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], description: "Task priority (optional)" },
          },
          required: ["title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_tasks",
        description: "List tasks. Use when user says 'show my overdue tasks', 'what's due today?', 'my tasks', 'list tasks'",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"], description: "Filter by status (optional)" },
            overdue: { type: "boolean", description: "Show only overdue tasks (optional)" },
            limit: { type: "number", description: "Max results (default 20)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "complete_task",
        description: "Mark a task as done. Use when user says 'mark X as done', 'complete the task', 'I finished the follow up'",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID (required if known)" },
            taskTitle: { type: "string", description: "Task title to match (use if taskId not known - will search by title)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_task",
        description: "Update a task. Use when user says 'change task due date', 'edit task title', 'update task priority'.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID (optional if taskTitle provided)" },
            taskTitle: { type: "string", description: "Task title to find (optional if taskId provided)" },
            title: { type: "string", description: "New title (optional)" },
            dueDate: { type: "string", description: "New due date YYYY-MM-DD (optional)" },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], description: "New priority (optional)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "cancel_task",
        description: "Cancel a task. Use when user says 'cancel this task', 'don't need this task anymore'.",
        parameters: {
          type: "object",
          properties: {
            taskId: { type: "string", description: "Task ID (optional if taskTitle provided)" },
            taskTitle: { type: "string", description: "Task title to cancel (optional if taskId provided)" },
          },
          required: [],
        },
      },
    },
    // Notes
    {
      type: "function",
      function: {
        name: "add_note",
        description: "Add a note to a contact or deal. Use when user says 'add a note to John Smith: interested in enterprise plan', 'log a note on the Acme deal: sent proposal Tuesday'",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Contact/lead name (use for contact notes)" },
            dealTitle: { type: "string", description: "Deal title (use for deal notes)" },
            content: { type: "string", description: "Note content (required)" },
            leadId: { type: "string", description: "Lead ID if known (optional)" },
            dealId: { type: "string", description: "Deal ID if known (optional)" },
          },
          required: ["content"],
        },
      },
    },
    // Deal stage
    {
      type: "function",
      function: {
        name: "update_deal_stage",
        description: "Move a deal to a different pipeline stage. Use when user says 'move Acme deal to Negotiation', 'mark the Big Corp deal as won'",
        parameters: {
          type: "object",
          properties: {
            dealTitle: { type: "string", description: "Deal title/name (required)" },
            stageName: { type: "string", description: "Target stage name: e.g. Negotiation, Won, Lost, Proposal (required)" },
            dealId: { type: "string", description: "Deal ID if known (optional)" },
          },
          required: ["dealTitle", "stageName"],
        },
      },
    },
    // Invoices
    {
      type: "function",
      function: {
        name: "create_invoice",
        description: "Create an invoice for a contact. Use when user says 'send an invoice to John for $500', 'create invoice for the Acme deal'",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Customer/contact name (required)" },
            amount: { type: "number", description: "Total amount in dollars (required)" },
            description: { type: "string", description: "Line item description (optional, e.g. 'Consulting services')" },
            leadId: { type: "string", description: "Lead ID if known (optional)" },
            dealId: { type: "string", description: "Deal ID if known (optional)" },
            dueDate: { type: "string", description: "Due date YYYY-MM-DD (optional)" },
          },
          required: ["contactName", "amount"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_overdue_invoices",
        description: "List unpaid/overdue invoices. Use when user says 'show unpaid invoices', 'what invoices are overdue?'",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max results (default 20)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_invoice_status",
        description: "Update invoice status. Use when user says 'mark invoice as paid', 'mark invoice #X as paid', 'void this invoice'.",
        parameters: {
          type: "object",
          properties: {
            invoiceId: { type: "string", description: "Invoice ID (optional if invoiceNumber provided)" },
            invoiceNumber: { type: "string", description: "Invoice number e.g. INV-xxx (optional if invoiceId provided)" },
            status: { type: "string", enum: ["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"], description: "New status (required)" },
          },
          required: ["status"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "send_invoice",
        description: "Send an invoice to the customer. Use when user says 'send invoice to John', 'email the invoice'.",
        parameters: {
          type: "object",
          properties: {
            invoiceId: { type: "string", description: "Invoice ID (optional if invoiceNumber provided)" },
            invoiceNumber: { type: "string", description: "Invoice number (optional if invoiceId provided)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_daily_briefing",
        description: "Get a daily summary of what to focus on. Use when user says 'what do I need to focus on today?', 'give me my morning digest', 'what should I prioritize?' Returns overdue tasks, today's appointments, hot deals, new leads, unpaid invoices.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "update_deal",
        description: "Update deal value or expected close date. Use when user says 'update the Acme deal value to $15,000', 'set expected close date to March 15'",
        parameters: {
          type: "object",
          properties: {
            dealTitle: { type: "string", description: "Deal title (required)" },
            value: { type: "number", description: "New deal value in dollars (optional)" },
            expectedCloseDate: { type: "string", description: "Expected close date YYYY-MM-DD (optional)" },
            dealId: { type: "string", description: "Deal ID if known (optional)" },
          },
          required: ["dealTitle"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_follow_up_suggestions",
        description: "Get suggestions for who to contact next. Use when user says 'what should I do with my leads from last week?', 'who haven\'t I contacted in 2 weeks?', 'who should I follow up with?'",
        parameters: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["last_week", "last_2_weeks", "last_month"], description: "Time period" },
            limit: { type: "number", description: "Max suggestions (default 10)" },
          },
        },
      },
    },
    // Phase 3: Meeting prep, bulk actions
    {
      type: "function",
      function: {
        name: "get_meeting_prep",
        description: "Get a pre-call briefing for a contact. Use when user says 'what should I know before my call with John?', 'prep me for my meeting with Acme'. Returns recent notes, deal history, last contact, tasks.",
        parameters: {
          type: "object",
          properties: {
            contactName: { type: "string", description: "Contact/lead name (required)" },
          },
          required: ["contactName"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_bulk_tasks",
        description: "Create follow-up tasks for multiple leads. Use when user says 'create follow-up tasks for all leads from this week', 'add tasks for today\'s leads'",
        parameters: {
          type: "object",
          properties: {
            taskTitle: { type: "string", description: "Task title template, use {name} for contact name (required)" },
            period: {
              type: "string",
              description: "Which leads: today, last_week, last_2_weeks",
              enum: ["today", "last_week", "last_2_weeks"],
            },
            dueInDays: { type: "number", description: "Days from now for due date (default 1)" },
          },
          required: ["taskTitle"],
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
        name: "update_campaign",
        description: "Update a campaign. Use when user says 'edit campaign X', 'change campaign name', 'update campaign status'.",
        parameters: {
          type: "object",
          properties: {
            campaignId: { type: "string", description: "Campaign ID (optional if campaignName provided)" },
            campaignName: { type: "string", description: "Campaign name (optional if campaignId provided)" },
            name: { type: "string", description: "New campaign name (optional)" },
            status: { type: "string", description: "New status: DRAFT, ACTIVE, PAUSED, COMPLETED (optional)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_campaign_details",
        description: "Get full details for a campaign. Use when user says 'show my campaign details', 'what's in the X campaign?'.",
        parameters: {
          type: "object",
          properties: {
            campaignId: { type: "string", description: "Campaign ID (optional if campaignName provided)" },
            campaignName: { type: "string", description: "Campaign name (optional if campaignId provided)" },
          },
          required: [],
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
        name: "create_report",
        description: "Create and save an AI-generated report. Use when user says 'generate a report', 'create a sales report', 'build a report for last month', 'give me a leads report', 'create a revenue report'. The report will be saved and displayed on the Reports page.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Report title (required). E.g. 'Sales Report - February 2026', 'Leads Overview'",
            },
            reportType: {
              type: "string",
              description: "Type of report",
              enum: ["sales", "leads", "revenue", "overview", "custom"],
            },
            period: {
              type: "string",
              description: "Time period for the report (optional)",
              enum: ["last_7_days", "last_30_days", "last_month", "last_7_months", "last_year", "all_time"],
            },
          },
          required: ["title"],
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
    {
      type: "function",
      function: {
        name: "list_appointments",
        description: "List appointments. Use when user says 'show my appointments', 'what's on my calendar?', 'list today's appointments'.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Filter by date YYYY-MM-DD (optional)" },
            limit: { type: "number", description: "Max results (default 20)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_appointment",
        description: "Reschedule or update an appointment. Use when user says 'reschedule appointment', 'change appointment time'.",
        parameters: {
          type: "object",
          properties: {
            appointmentId: { type: "string", description: "Appointment ID (optional if customerName + date provided)" },
            customerName: { type: "string", description: "Customer name to find (optional)" },
            date: { type: "string", description: "New date YYYY-MM-DD (optional)" },
            time: { type: "string", description: "New time HH:MM (optional)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "cancel_appointment",
        description: "Cancel an appointment. Use when user says 'cancel this appointment', 'cancel meeting with John'.",
        parameters: {
          type: "object",
          properties: {
            appointmentId: { type: "string", description: "Appointment ID (optional if customerName provided)" },
            customerName: { type: "string", description: "Customer name (optional if appointmentId provided)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "import_contacts",
        description: "Import contacts from CSV. Use when user says 'import contacts', 'I want to import a CSV'. Navigates to the import page.",
        parameters: { type: "object", properties: {} },
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
        name: "setup_square",
        description: "Configure Square payment processor",
        parameters: {
          type: "object",
          properties: {
            applicationId: { type: "string", description: "Square Application ID" },
            accessToken: { type: "string", description: "Square Access Token" },
          },
          required: ["applicationId", "accessToken"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "setup_paypal",
        description: "Configure PayPal payment processor",
        parameters: {
          type: "object",
          properties: {
            clientId: { type: "string", description: "PayPal Client ID" },
            clientSecret: { type: "string", description: "PayPal Client Secret" },
          },
          required: ["clientId", "clientSecret"],
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
        name: "setup_quickbooks",
        description: "Connect QuickBooks. Use when user says 'connect QuickBooks', 'setup QuickBooks'.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "setup_whatsapp",
        description: "Configure WhatsApp Business. Use when user says 'setup WhatsApp', 'connect WhatsApp'.",
        parameters: {
          type: "object",
          properties: {
            accountSid: { type: "string", description: "Twilio Account SID (optional)" },
            authToken: { type: "string", description: "Auth Token (optional)" },
            phoneNumber: { type: "string", description: "WhatsApp-enabled number (optional)" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "update_company_profile",
        description: "Update company profile. Use when user says 'update my company name', 'change business phone', 'update company profile'.",
        parameters: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "Company name (optional)" },
            name: { type: "string", description: "Company/contact name (optional)" },
            phone: { type: "string", description: "Phone number (optional)" },
            website: { type: "string", description: "Website URL (optional)" },
          },
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
        name: "update_voice_agent",
        description: "Update a voice agent. Use when user says 'change greeting', 'update agent name', 'set different voice'.",
        parameters: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Agent ID (optional if name provided)" },
            name: { type: "string", description: "Agent name to find (optional if agentId provided)" },
            greetingMessage: { type: "string", description: "New greeting message (optional)" },
            voiceId: { type: "string", description: "New voice ID (optional)" },
            businessName: { type: "string", description: "New business name (optional)" },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "assign_phone_to_voice_agent",
        description: "Assign a phone number to a voice agent. Use when user says 'assign this number to Sarah', 'connect phone to agent'.",
        parameters: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Agent ID (optional if name provided)" },
            name: { type: "string", description: "Agent name (optional if agentId provided)" },
            phoneNumber: { type: "string", description: "Phone number to assign (required)" },
          },
          required: ["phoneNumber"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "purchase_twilio_number",
        description: "Start the process to purchase a Twilio phone number. Use when user says 'buy a phone number', 'I need a new number', 'purchase Twilio number'.",
        parameters: { type: "object", properties: {} },
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
        description: "Navigate the user to any page in the application. Use when the user wants to go somewhere (e.g. 'take me to settings', 'open reports', 'show my calendar'). Path must start with /dashboard or /onboarding.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Full path to navigate to. Examples: /dashboard, /dashboard/contacts, /dashboard/pipeline, /dashboard/calendar, /dashboard/settings, /dashboard/business-ai, /dashboard/analytics, /dashboard/workflows, /dashboard/voice-agents, /dashboard/team, /dashboard/reports, /dashboard/leads, /dashboard/messages, /dashboard/campaigns, /dashboard/payments, /dashboard/ecommerce, /dashboard/websites, /dashboard/real-estate, /dashboard/dental/clinical, /dashboard/tasks, /dashboard/soshogle, /dashboard/referrals, /dashboard/widgets, /dashboard/billing, /onboarding. Add ?id=xxx for specific record (e.g. /dashboard/contacts?id=abc).",
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
    update_lead: "update_lead",
    get_lead_details: "get_lead_details",
    delete_lead: "delete_lead",
    create_deal: "create_deal",
    list_leads: "list_leads",
    list_deals: "list_deals",
    get_deal_details: "get_deal_details",
    delete_deal: "delete_deal",
    create_pipeline: "create_pipeline",
    create_pipeline_stage: "create_pipeline_stage",
    search_contacts: "search_contacts",
    delete_duplicate_contacts: "delete_duplicate_contacts",
    create_task: "create_task",
    list_tasks: "list_tasks",
    complete_task: "complete_task",
    update_task: "update_task",
    cancel_task: "cancel_task",
    add_note: "add_note",
    update_deal_stage: "update_deal_stage",
    create_invoice: "create_invoice",
    list_overdue_invoices: "list_overdue_invoices",
    update_invoice_status: "update_invoice_status",
    send_invoice: "send_invoice",
    get_daily_briefing: "get_daily_briefing",
    update_deal: "update_deal",
    get_follow_up_suggestions: "get_follow_up_suggestions",
    get_meeting_prep: "get_meeting_prep",
    create_bulk_tasks: "create_bulk_tasks",
    create_campaign: "create_campaign",
    list_campaigns: "list_campaigns",
    update_campaign: "update_campaign",
    get_campaign_details: "get_campaign_details",
    get_statistics: "get_statistics",
    create_report: "create_report",
    create_appointment: "create_appointment",
    list_appointments: "list_appointments",
    update_appointment: "update_appointment",
    cancel_appointment: "cancel_appointment",
    import_contacts: "import_contacts",
    setup_stripe: "setup_stripe",
    setup_square: "setup_square",
    setup_paypal: "setup_paypal",
    setup_twilio: "setup_twilio",
    setup_quickbooks: "setup_quickbooks",
    setup_whatsapp: "setup_whatsapp",
    update_company_profile: "update_profile",
    create_voice_agent: "create_voice_agent",
    list_voice_agents: "list_voice_agents",
    debug_voice_agent: "debug_voice_agent",
    fix_voice_agent: "fix_voice_agent",
    update_voice_agent: "update_voice_agent",
    assign_phone_to_voice_agent: "assign_phone_to_voice_agent",
    purchase_twilio_number: "purchase_twilio_number",
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
    case "create_task":
    case "list_tasks":
    case "complete_task":
      return "/dashboard/tasks";
    case "add_note":
      return result?.result?.leadId ? `/dashboard/contacts?id=${result.result.leadId}` : result?.result?.dealId ? `/dashboard/pipeline?id=${result.result.dealId}` : "/dashboard/contacts";
    case "update_deal_stage":
      return result?.result?.deal?.id ? `/dashboard/pipeline?id=${result.result.deal.id}` : "/dashboard/pipeline";
    case "create_invoice":
    case "list_overdue_invoices":
      return "/dashboard/payments";
    case "get_daily_briefing":
      return "/dashboard";
    case "update_deal":
      return result?.result?.deal?.id ? `/dashboard/pipeline?id=${result.result.deal.id}` : "/dashboard/pipeline";
    case "get_follow_up_suggestions":
      return "/dashboard/contacts";
    case "create_report":
      const reportId = result?.result?.report?.id;
      return reportId ? `/dashboard/reports?id=${reportId}` : "/dashboard/reports";
    case "get_lead_details":
      return result?.result?.lead?.id ? `/dashboard/contacts?id=${result.result.lead.id}` : "/dashboard/contacts";
    case "get_deal_details":
      return result?.result?.deal?.id ? `/dashboard/pipeline?id=${result.result.deal.id}` : "/dashboard/pipeline";
    case "create_pipeline":
      return result?.result?.pipeline?.id ? `/dashboard/pipeline?pipelineId=${result.result.pipeline.id}` : "/dashboard/pipeline";
    case "get_campaign_details":
      return result?.result?.campaign?.id ? `/dashboard/campaigns?id=${result.result.campaign.id}` : "/dashboard/campaigns";
    case "purchase_twilio_number":
      return "/dashboard/voice-agents";
    case "list_appointments":
      return "/dashboard/calendar";
    case "import_contacts":
      return result?.result?.navigateTo || "/dashboard/contacts";
    case "get_meeting_prep":
      return result?.result?.leadId ? `/dashboard/contacts?id=${result.result.leadId}` : "/dashboard/contacts";
    case "create_bulk_tasks":
      return "/dashboard/tasks";
    default:
      return null;
  }
}
