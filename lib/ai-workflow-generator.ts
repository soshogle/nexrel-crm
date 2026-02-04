
/**
 * AI Workflow Generator Service
 * 
 * This service uses LLM APIs to parse natural language descriptions
 * and generate structured workflow configurations.
 */

interface WorkflowGenerationRequest {
  description: string;
  userId: string;
  context?: {
    existingPipelines?: any[];
    existingLeadStatuses?: string[];
    availableChannels?: string[];
  };
}

interface WorkflowGenerationResponse {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: any;
  actions: Array<{
    type: string;
    displayOrder: number;
    actionConfig: any;
    delayMinutes?: number;
  }>;
  confidence: number;
  suggestions?: string[];
}

export class AIWorkflowGenerator {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Generate a workflow from natural language description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResponse> {
    const systemPrompt = this.buildSystemPrompt(request.context);
    const userPrompt = this.buildUserPrompt(request.description);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API failed: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse the AI response (JSON format)
      const workflow = this.parseAIResponse(content);
      
      return {
        ...workflow,
        confidence: 0.85, // High confidence for structured responses
      };
    } catch (error) {
      console.error('AI workflow generation failed:', error);
      throw new Error('Failed to generate workflow from description');
    }
  }

  /**
   * Build system prompt with CRM context
   */
  private buildSystemPrompt(context?: any): string {
    const availableTriggers = [
      'MESSAGE_RECEIVED - Any new message received',
      'MESSAGE_WITH_KEYWORDS - Message contains specific keywords',
      'AFTER_HOURS_MESSAGE - Message received outside business hours',
      'CONVERSATION_STARTED - New conversation initiated',
      'LEAD_CREATED - New lead created',
      'LEAD_STATUS_CHANGED - Lead status changes',
      'LEAD_NO_RESPONSE - Lead hasn\'t responded in X days',
      'DEAL_CREATED - New deal created',
      'DEAL_STAGE_CHANGED - Deal stage changes',
      'DEAL_STALE - Deal hasn\'t moved in X days',
      'TIME_BASED - Schedule at specific time (use for birthdays, recurring events, scheduled workflows)',
      'CUSTOM_FIELD_CHANGED - Trigger when a custom field changes (can be used for birthday field)',
    ];

    const availableActions = [
      'CREATE_LEAD_FROM_MESSAGE - Create a lead from message sender',
      'CREATE_DEAL_FROM_LEAD - Convert lead to deal',
      'AUTO_REPLY - Send auto-reply message',
      'SEND_MESSAGE - Send message via any channel',
      'SEND_SMS - Send SMS message (supports personalization with {{contactName}}, {{businessName}}, etc.)',
      'SEND_EMAIL - Send email (supports personalization with {{contactName}}, {{businessName}}, etc.)',
      'AI_GENERATE_MESSAGE - Generate personalized message using AI (use for personalization)',
      'UPDATE_LEAD - Update lead properties',
      'CHANGE_LEAD_STATUS - Change lead status',
      'UPDATE_DEAL - Update deal properties',
      'MOVE_DEAL_STAGE - Move deal to different stage',
      'ASSIGN_TO_DEAL - Assign conversation/lead to deal',
      'CREATE_TASK - Create a task',
      'CREATE_APPOINTMENT - Create an appointment',
      'SCHEDULE_FOLLOW_UP - Schedule follow-up task',
      'NOTIFY_USER - Send notification to user',
      'ADD_TAG - Add tag to lead/deal',
      'WAIT_DELAY - Wait for specified time (delayMinutes: convert weeks to minutes = weeks * 7 * 24 * 60, days = days * 24 * 60, hours = hours * 60)',
      'MAKE_OUTBOUND_CALL - Make a voice call to contact using voice AI agent (actionConfig: {"purpose": "Call purpose", "notes": "What to discuss", "immediate": true/false, "scheduledFor": "ISO date"})',
      'WEBHOOK - Call external API',
    ];

    return `You are a CRM workflow automation expert. Your job is to parse natural language descriptions of automation workflows and convert them into structured JSON configurations.

You can create complex multi-step workflows with:
- Voice calls to contacts
- Email and SMS sequences
- Personalized messages using AI
- Precise timing (weeks, days, hours delays)
- Birthday triggers
- Conditional logic
- Variable substitution for personalization

AVAILABLE TRIGGERS:
${availableTriggers.join('\n')}

AVAILABLE ACTIONS:
${availableActions.join('\n')}

${context?.existingPipelines?.length ? `\nUSER'S PIPELINES:\n${context.existingPipelines.map((p: any) => `- ${p.name} (stages: ${p.stages?.map((s: any) => s.name).join(', ')})`).join('\n')}` : ''}

RESPONSE FORMAT (JSON only, no markdown):
{
  "name": "Workflow name (max 50 chars)",
  "description": "Clear description of what this workflow does",
  "triggerType": "One of the available trigger types",
  "triggerConfig": {
    // Trigger-specific configuration
    // For MESSAGE_WITH_KEYWORDS: {"keywords": ["pricing", "quote", "cost"]}
    // For LEAD_STATUS_CHANGED: {"fromStatus": "NEW", "toStatus": "CONTACTED"}
    // For TIME_BASED: {"schedule": "0 9 * * 1-5", "timezone": "America/New_York"} or {"type": "birthday", "field": "birthday"} for birthday triggers
    // For birthday workflows: Use TIME_BASED with {"type": "birthday"} or CUSTOM_FIELD_CHANGED with {"fieldName": "birthday"}
    // For LEAD_NO_RESPONSE: {"daysInactive": 3}
    // For CUSTOM_FIELD_CHANGED: {"fieldName": "birthday", "fieldType": "date"} - can trigger on birthday
  },
  "actions": [
    {
      "type": "Action type from available actions",
      "displayOrder": 0,
      "actionConfig": {
        // Action-specific configuration
        // For CREATE_LEAD_FROM_MESSAGE: {"status": "NEW", "source": "messaging"}
        // For AUTO_REPLY: {"message": "Thanks for reaching out!"}
        // For SEND_SMS: {"template": "Message content with {{contactName}} for personalization", "phoneField": "phone"}
        // For SEND_EMAIL: {"subject": "Email subject", "body": "Email body with {{contactName}} for personalization", "toField": "email"}
        // For AI_GENERATE_MESSAGE: {"prompt": "Generate personalized birthday message for {{contactName}}", "channel": "SMS" or "EMAIL"}
        // For MAKE_OUTBOUND_CALL: {"purpose": "Birthday call", "notes": "Personalized birthday greeting for {{contactPerson}}", "immediate": true}
        // Note: Variables like {{contactPerson}}, {{phone}} will be automatically replaced with lead data
        // For WEBHOOK: {"url": "https://example.com/webhook", "method": "POST", "payload": {...}}
        // For MOVE_DEAL_STAGE: {"pipelineId": "xxx", "stageId": "yyy"}
        // For CREATE_TASK: {"title": "Task title", "priority": "HIGH", "dueInDays": 1}
        // For CREATE_APPOINTMENT: {"title": "Appointment title", "date": "{{date}}", "time": "{{time}}"}
      },
      "delayMinutes": 0 // Optional delay before this action
    }
  ],
  "suggestions": ["Additional improvements or considerations"]
}

TIMING CONVERSIONS:
- Convert all time delays to minutes for delayMinutes field:
  * 1 week = 7 * 24 * 60 = 10,080 minutes
  * 1 day = 24 * 60 = 1,440 minutes
  * 1 hour = 60 minutes
  * Examples: "wait a week" = delayMinutes: 10080, "wait 2 hours" = delayMinutes: 120, "wait 3 days" = delayMinutes: 4320

PERSONALIZATION:
- Use {{contactPerson}}, {{businessName}}, {{email}}, {{phone}}, {{leadId}} for variable substitution in messages
- Available variables from lead context: contactPerson, businessName, email, phone, id (as leadId)
- For personalized content, use AI_GENERATE_MESSAGE action with a prompt describing what to personalize
- Example: {"prompt": "Write a personalized birthday message for {{contactPerson}} mentioning their business {{businessName}}", "channel": "SMS"}
- Variables are automatically replaced by the workflow engine with actual lead data

VOICE CALLS IN WORKFLOWS:
- Use WEBHOOK action to trigger voice calls via /api/outbound-calls endpoint
- Include contactName, phoneNumber (use {{phone}}), purpose, and notes in the webhook body
- Example: {"type": "WEBHOOK", "actionConfig": {"url": "/api/outbound-calls", "method": "POST", "body": {"contactName": "{{contactName}}", "phoneNumber": "{{phone}}", "purpose": "Birthday call", "notes": "Personalized birthday greeting", "immediate": true}}}

BIRTHDAY TRIGGERS:
- Use TIME_BASED trigger with {"type": "birthday", "field": "birthday"} or CUSTOM_FIELD_CHANGED trigger
- For birthday workflows, trigger should fire on each contact's birthday

RULES:
1. Always use exact trigger/action type names from the lists above
2. Keep workflow names concise and descriptive
3. For messaging triggers, include relevant keywords in triggerConfig
4. For actions, provide complete configuration with all required fields
5. Convert all time delays to minutes (weeks, days, hours → minutes)
6. Use AI_GENERATE_MESSAGE for personalization when user requests personalized content
7. Use WEBHOOK action for voice calls with proper /api/outbound-calls configuration
8. Return ONLY valid JSON, no markdown code blocks or explanations
9. If the description is unclear, make reasonable assumptions and note them in suggestions
10. For complex workflows with multiple steps, ensure proper delayMinutes between actions`;
  }

  /**
   * Build user prompt from description
   */
  private buildUserPrompt(description: string): string {
    return `Create a workflow automation for the following scenario:

"${description}"

Return the workflow configuration in JSON format as specified in the system prompt.`;
  }

  /**
   * Parse AI response into workflow structure
   */
  private parseAIResponse(content: string): Omit<WorkflowGenerationResponse, 'confidence'> {
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.name || !parsed.triggerType || !parsed.actions) {
        throw new Error('Missing required fields in AI response');
      }

      // Ensure actions have display order
      parsed.actions = parsed.actions.map((action: any, index: number) => ({
        ...action,
        displayOrder: action.displayOrder ?? index,
      }));

      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Get workflow templates for common scenarios
   */
  static getTemplates(): Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    workflow: Omit<WorkflowGenerationResponse, 'confidence'>;
  }> {
    return [
      {
        id: 'message-to-lead',
        name: 'Message to Lead',
        description: 'Automatically create a lead when someone sends a message',
        category: 'Lead Generation',
        workflow: {
          name: 'Auto-Create Lead from Message',
          description: 'When someone sends a message, automatically create a lead in the CRM',
          triggerType: 'MESSAGE_RECEIVED',
          triggerConfig: {},
          actions: [
            {
              type: 'CREATE_LEAD_FROM_MESSAGE',
              displayOrder: 0,
              actionConfig: {
                status: 'NEW',
                source: 'messaging',
              },
            },
            {
              type: 'AUTO_REPLY',
              displayOrder: 1,
              actionConfig: {
                message: 'Thanks for reaching out! We\'ll get back to you shortly.',
              },
            },
          ],
          suggestions: ['Consider adding keywords filter to only capture relevant messages'],
        },
      },
      {
        id: 'pricing-inquiry-to-deal',
        name: 'Pricing Inquiry to Deal',
        description: 'When someone asks about pricing, create a lead and move to deal pipeline',
        category: 'Lead Generation',
        workflow: {
          name: 'Pricing Inquiry to Deal',
          description: 'Capture pricing inquiries and automatically convert to sales opportunity',
          triggerType: 'MESSAGE_WITH_KEYWORDS',
          triggerConfig: {
            keywords: ['pricing', 'price', 'cost', 'quote', 'how much'],
          },
          actions: [
            {
              type: 'CREATE_LEAD_FROM_MESSAGE',
              displayOrder: 0,
              actionConfig: {
                status: 'QUALIFIED',
                source: 'messaging',
              },
            },
            {
              type: 'CREATE_DEAL_FROM_LEAD',
              displayOrder: 1,
              actionConfig: {
                title: 'Pricing Inquiry - {{contactName}}',
                priority: 'HIGH',
              },
            },
            {
              type: 'AUTO_REPLY',
              displayOrder: 2,
              actionConfig: {
                message: 'Thanks for your interest! I\'ll send you our pricing information shortly.',
              },
            },
            {
              type: 'NOTIFY_USER',
              displayOrder: 3,
              actionConfig: {
                message: 'New pricing inquiry from {{contactName}}',
              },
            },
          ],
          suggestions: [],
        },
      },
      {
        id: 'after-hours-auto-reply',
        name: 'After Hours Auto-Reply',
        description: 'Send automatic responses to messages received outside business hours',
        category: 'Customer Service',
        workflow: {
          name: 'After Hours Auto-Reply',
          description: 'Automatically respond to messages received outside business hours',
          triggerType: 'AFTER_HOURS_MESSAGE',
          triggerConfig: {},
          actions: [
            {
              type: 'AUTO_REPLY',
              displayOrder: 0,
              actionConfig: {
                message: 'Thanks for your message! Our office hours are 9 AM - 5 PM Monday-Friday. We\'ll respond during our next business day.',
              },
            },
            {
              type: 'CREATE_TASK',
              displayOrder: 1,
              actionConfig: {
                title: 'Follow up on after-hours message from {{contactName}}',
                priority: 'MEDIUM',
                dueInDays: 1,
              },
            },
          ],
          suggestions: [],
        },
      },
      {
        id: 'stale-deal-follow-up',
        name: 'Stale Deal Follow-Up',
        description: 'Automatically follow up on deals that haven\'t moved in 7 days',
        category: 'Deal Management',
        workflow: {
          name: 'Stale Deal Follow-Up',
          description: 'Send reminders for deals that haven\'t progressed',
          triggerType: 'DEAL_STALE',
          triggerConfig: {
            daysInactive: 7,
          },
          actions: [
            {
              type: 'CREATE_TASK',
              displayOrder: 0,
              actionConfig: {
                title: 'Follow up on stale deal: {{dealTitle}}',
                description: 'This deal hasn\'t moved in 7 days. Review and take action.',
                priority: 'HIGH',
                dueInDays: 0,
              },
            },
            {
              type: 'SEND_EMAIL',
              displayOrder: 1,
              actionConfig: {
                subject: 'Checking in on {{dealTitle}}',
                message: 'Hi {{contactName}},\n\nI wanted to check in about {{dealTitle}}. Do you have any questions or concerns?\n\nLooking forward to hearing from you!',
              },
              delayMinutes: 60,
            },
          ],
          suggestions: [],
        },
      },
      {
        id: 'lead-no-response',
        name: 'Lead No Response Follow-Up',
        description: 'Automatically follow up with leads who haven\'t responded in 3 days',
        category: 'Lead Nurturing',
        workflow: {
          name: 'Lead No Response Follow-Up',
          description: 'Re-engage leads who haven\'t responded',
          triggerType: 'LEAD_NO_RESPONSE',
          triggerConfig: {
            daysInactive: 3,
          },
          actions: [
            {
              type: 'SEND_SMS',
              displayOrder: 0,
              actionConfig: {
                message: 'Hi {{contactName}}, just wanted to follow up on my previous message. Are you still interested in {{businessCategory}}?',
              },
            },
            {
              type: 'CREATE_TASK',
              displayOrder: 1,
              actionConfig: {
                title: 'Call {{contactName}} - No SMS response',
                priority: 'MEDIUM',
                dueInDays: 2,
              },
              delayMinutes: 2880, // 2 days
            },
          ],
          suggestions: [],
        },
      },
      {
        id: 'deal-won-celebration',
        name: 'Deal Won Celebration',
        description: 'Send thank you message and create onboarding task when deal is won',
        category: 'Deal Management',
        workflow: {
          name: 'Deal Won Celebration',
          description: 'Celebrate wins and start onboarding process',
          triggerType: 'DEAL_WON',
          triggerConfig: {},
          actions: [
            {
              type: 'SEND_EMAIL',
              displayOrder: 0,
              actionConfig: {
                subject: 'Welcome aboard! 🎉',
                message: 'Congratulations on your decision to work with us! We\'re excited to get started.\n\nYour onboarding specialist will reach out within 24 hours to schedule your kickoff call.',
              },
            },
            {
              type: 'CREATE_TASK',
              displayOrder: 1,
              actionConfig: {
                title: 'Schedule onboarding call with {{contactName}}',
                priority: 'URGENT',
                dueInDays: 1,
              },
            },
            {
              type: 'NOTIFY_USER',
              displayOrder: 2,
              actionConfig: {
                message: '🎉 Deal won: {{dealTitle}} - ${{dealValue}}',
              },
            },
          ],
          suggestions: [],
        },
      },
    ];
  }
}

export const aiWorkflowGenerator = new AIWorkflowGenerator();
