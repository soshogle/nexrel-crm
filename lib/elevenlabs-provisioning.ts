
/**
 * ElevenLabs Auto-Provisioning Service (White-Label)
 * 
 * This service automatically creates and manages ElevenLabs conversational AI agents
 * for your SaaS users without requiring them to have their own ElevenLabs accounts.
 * 
 * WHITE-LABEL ARCHITECTURE:
 * - Uses a SINGLE master ElevenLabs API key for all agencies
 * - Agents are prefixed with agency ID for isolation (ag_{userId}_{agentType})
 * - Usage is tracked per-agency for billing purposes
 * - ElevenLabs branding is hidden from end users
 * - Creates unique agents for each user's voice agent
 * - Tracks all created agents in your database
 * - Manages agent lifecycle (create, update, delete)
 * - No user interaction required - fully automated
 */

import { prisma } from './db';
import { voiceAIPlatform } from './voice-ai-platform';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

interface ElevenLabsSubscription {
  tier: string;
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  professional_voice_limit: number;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  currency: string;
  status: string;
  can_use_phone_numbers?: boolean; // This is key - free plans don't support phone numbers
}

export interface CreateAgentOptions {
  name: string;
  businessName: string;
  businessIndustry?: string;
  greetingMessage?: string;
  systemPrompt?: string;
  knowledgeBase?: string;
  voiceId?: string;
  language?: string;
  maxCallDuration?: number;
  
  // User context (for database tracking)
  userId: string;
  voiceAgentId: string;
}

export interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
      };
      first_message: string;
      language: string;
    };
    tts?: {
      voice_id?: string;
    };
  };
}

class ElevenLabsProvisioningService {
  /**
   * Get the master ElevenLabs API key (WHITE-LABEL)
   * 
   * All agencies share the same master API key.
   * The userId parameter is kept for compatibility but not used for key selection.
   */
  private async getApiKey(userId?: string): Promise<string> {
    // Always use the master API key from the platform config
    const masterKey = await voiceAIPlatform.getMasterApiKey();
    return masterKey || process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Generate the agent name with agency prefix for multi-tenant isolation
   * Format: ag_{userId}_{agentName}
   */
  private async generatePrefixedAgentName(userId: string, agentName: string): Promise<string> {
    const subscription = await voiceAIPlatform.getAgencySubscription(userId);
    const prefix = subscription.agentPrefix || voiceAIPlatform.generateAgentPrefix(userId);
    return `${prefix}_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 50)}`;
  }

  /**
   * Check ElevenLabs subscription status and validate phone number capabilities
   * 
   * FREE plan: Cannot import phone numbers
   * STARTER plan and above: Can import phone numbers
   */
  async checkSubscription(userId?: string): Promise<{
    success: boolean;
    canUsePhoneNumbers: boolean;
    tier: string;
    error?: string;
    upgradeRequired?: boolean;
  }> {
    try {
      let apiKey: string;
      
      if (userId) {
        apiKey = await this.getApiKey(userId);
      } else {
        // Fallback to environment variable if no userId provided
        apiKey = process.env.ELEVENLABS_API_KEY || '';
      }

      if (!apiKey) {
        return {
          success: false,
          canUsePhoneNumbers: false,
          tier: 'unknown',
          error: 'ElevenLabs API key not configured',
        };
      }

      const response = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to check ElevenLabs subscription:', errorText);
        return {
          success: false,
          canUsePhoneNumbers: false,
          tier: 'unknown',
          error: `Failed to check subscription: ${errorText}`,
        };
      }

      const subscription: ElevenLabsSubscription = await response.json();
      
      console.log('📊 ElevenLabs subscription:', {
        tier: subscription.tier,
        status: subscription.status,
        characterLimit: subscription.character_limit,
        voiceLimit: subscription.voice_limit,
      });

      // Check if the plan supports phone numbers
      // Free plans do NOT support phone numbers
      // Starter plan and above DO support phone numbers
      const tier = subscription.tier.toLowerCase();
      const canUsePhoneNumbers = 
        tier !== 'free' && 
        !tier.includes('free') &&
        (subscription.can_use_phone_numbers !== false);

      if (!canUsePhoneNumbers) {
        console.warn('⚠️  Current ElevenLabs plan does not support phone numbers');
        console.warn('   Please upgrade to Starter plan or higher');
        return {
          success: true,
          canUsePhoneNumbers: false,
          tier: subscription.tier,
          upgradeRequired: true,
          error: `Your ElevenLabs plan (${subscription.tier}) does not support phone number imports. Please upgrade to Starter plan ($10/month) or higher to use phone numbers with voice agents.`,
        };
      }

      return {
        success: true,
        canUsePhoneNumbers: true,
        tier: subscription.tier,
      };
    } catch (error: any) {
      console.error('❌ Error checking subscription:', error);
      return {
        success: false,
        canUsePhoneNumbers: false,
        tier: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Automatically create an ElevenLabs conversational AI agent for a user
   * This is called automatically when a user creates a voice agent in your CRM
   */
  async createAgent(options: CreateAgentOptions & { 
    twilioPhoneNumber?: string;
  }): Promise<{
    success: boolean;
    agentId?: string;
    phoneNumberId?: string;
    error?: string;
  }> {
    try {
      const apiKey = await this.getApiKey(options.userId);
      
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🤖 Creating ElevenLabs agent:', options.name);

      // Build the system prompt with business context
      const systemPrompt = options.systemPrompt || this.buildDefaultPrompt(options);
      
      // Build the greeting message
      const greetingMessage = options.greetingMessage || 
        `Hello! I'm calling from ${options.businessName}. How can I help you today?`;

      // Define the 3 custom booking functions that will be AUTO-CONFIGURED
      const bookingFunctions = [
        {
          name: 'check_availability',
          description: 'Check available time slots for booking an appointment. Use this to show customers what times are open.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'The date to check availability for (YYYY-MM-DD format or natural language like "tomorrow")',
              },
              partySize: {
                type: 'number',
                description: 'Number of people for the appointment (optional, defaults to 1)',
              },
            },
            required: ['date'],
          },
        },
        {
          name: 'create_booking',
          description: 'Create a new appointment booking after confirming details with the customer. Always check availability first!',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: "Customer's full name",
              },
              customerPhone: {
                type: 'string',
                description: "Customer's phone number",
              },
              date: {
                type: 'string',
                description: 'Appointment date (YYYY-MM-DD or natural language)',
              },
              time: {
                type: 'string',
                description: 'Appointment time (e.g., "7pm", "19:00")',
              },
              partySize: {
                type: 'number',
                description: 'Number of people',
              },
              notes: {
                type: 'string',
                description: 'Any special requests or notes from the customer (optional)',
              },
            },
            required: ['customerName', 'customerPhone', 'date', 'time', 'partySize'],
          },
        },
        {
          name: 'modify_booking',
          description: 'Update or cancel an existing appointment. Customer must provide their confirmation code or phone number.',
          parameters: {
            type: 'object',
            properties: {
              confirmationCode: {
                type: 'string',
                description: 'The confirmation code from the original booking',
              },
              customerPhone: {
                type: 'string',
                description: "Customer's phone number (if confirmation code not available)",
              },
              action: {
                type: 'string',
                enum: ['reschedule', 'cancel'],
                description: 'Whether to reschedule or cancel the appointment',
              },
              newDate: {
                type: 'string',
                description: 'New date for rescheduling (YYYY-MM-DD or natural language)',
              },
              newTime: {
                type: 'string',
                description: 'New time for rescheduling (e.g., "7pm")',
              },
            },
            required: ['action'],
          },
        },
      ];

      // Generate prefixed agent name for multi-tenant isolation in ElevenLabs
      const prefixedAgentName = await this.generatePrefixedAgentName(options.userId, options.name);
      console.log(`🏷️  [White-Label] Agent name: ${prefixedAgentName} (original: ${options.name})`);

      // Create the agent via ElevenLabs API
      // IMPORTANT: Include ALL required configuration for browser-based preview
      const agentPayload = {
        name: prefixedAgentName, // WHITE-LABEL: Prefixed with agency ID for isolation
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt,
            },
            first_message: greetingMessage, // REQUIRED for conversations to start
            language: options.language || 'en',
          },
          tts: {
            voice_id: options.voiceId || 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
            stability: 0.5, // Voice stability (0-1)
            similarity_boost: 0.75, // Voice similarity (0-1)
            optimize_streaming_latency: 3, // Optimize for real-time (0-4)
          },
          conversation: {
            max_duration_seconds: options.maxCallDuration || 1800, // 30 minutes default
          },
          asr: {
            // Automatic Speech Recognition settings
            quality: 'high', // FIXED: ElevenLabs API only accepts 'high' (not 'standard')
          },
        },
        platform_settings: {
          // Enable widget embedding (required for phone calls AND browser preview)
          widget_enabled: true,
        },
        // 🎯 AUTO-ADD THE 3 CUSTOM BOOKING FUNCTIONS
        // This eliminates the need to manually add them in the ElevenLabs dashboard!
        tools: bookingFunctions.map((func) => ({
          type: 'function',
          function: func,
        })),
      };

      console.log('📤 [ElevenLabs] Creating agent with AUTO-CONFIGURED booking functions...');
      console.log('   ✅ check_availability');
      console.log('   ✅ create_booking');
      console.log('   ✅ modify_booking');
      console.log('Full payload:', JSON.stringify(agentPayload, null, 2));

      const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const agent: ElevenLabsAgent = await response.json();

      console.log('✅ ElevenLabs agent created:', agent.agent_id);

      let phoneNumberId: string | undefined;

      // If a Twilio phone number is provided, import and assign it to the agent
      if (options.twilioPhoneNumber) {
        console.log('📞 Importing Twilio phone number to ElevenLabs:', options.twilioPhoneNumber);
        
        try {
          const phoneImportResult = await this.importPhoneNumber(
            options.twilioPhoneNumber,
            agent.agent_id,
            options.userId
          );
          
          if (phoneImportResult.success) {
            phoneNumberId = phoneImportResult.phoneNumberId;
            console.log('✅ Phone number imported and assigned:', phoneNumberId);
          } else {
            console.warn('⚠️  Failed to import phone number:', phoneImportResult.error);
          }
        } catch (phoneError: any) {
          console.error('⚠️  Phone import error (non-fatal):', phoneError.message);
          // Continue - agent is still created, just without phone assignment
        }
      }

      // Update the voice agent in database with the ElevenLabs agent ID and phone number ID
      await prisma.voiceAgent.update({
        where: { id: options.voiceAgentId },
        data: {
          elevenLabsAgentId: agent.agent_id,
          elevenLabsPhoneNumberId: phoneNumberId,
          status: 'ACTIVE', // Auto-activate since agent is now ready
        },
      });

      // Create initial subscription record if it doesn't exist
      await this.ensureUserSubscription(options.userId);

      return {
        success: true,
        agentId: agent.agent_id,
        phoneNumberId,
      };
    } catch (error: any) {
      console.error('❌ Failed to create ElevenLabs agent:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing ElevenLabs agent with full configuration
   * Use this to fix agents that are missing first_message or conversation_config
   */
  async updateAgentConfiguration(
    agentId: string,
    options: CreateAgentOptions
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const apiKey = await this.getApiKey(options.userId);
      
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🔧 Updating ElevenLabs agent configuration:', agentId);

      // Build the system prompt with business context
      const systemPrompt = options.systemPrompt || this.buildDefaultPrompt(options);
      
      // Build the greeting message
      const greetingMessage = options.greetingMessage || 
        `Hello! I'm calling from ${options.businessName}. How can I help you today?`;

      // Define the 3 custom booking functions that will be AUTO-CONFIGURED
      const bookingFunctions = [
        {
          name: 'check_availability',
          description: 'Check available time slots for booking an appointment. Use this to show customers what times are open.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'The date to check availability for (YYYY-MM-DD format or natural language like "tomorrow")',
              },
              partySize: {
                type: 'number',
                description: 'Number of people for the appointment (optional, defaults to 1)',
              },
            },
            required: ['date'],
          },
        },
        {
          name: 'create_booking',
          description: 'Create a new appointment booking after confirming details with the customer. Always check availability first!',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: "Customer's full name",
              },
              customerPhone: {
                type: 'string',
                description: "Customer's phone number",
              },
              date: {
                type: 'string',
                description: 'Appointment date (YYYY-MM-DD or natural language)',
              },
              time: {
                type: 'string',
                description: 'Appointment time (e.g., "7pm", "19:00")',
              },
              partySize: {
                type: 'number',
                description: 'Number of people',
              },
              notes: {
                type: 'string',
                description: 'Any special requests or notes from the customer (optional)',
              },
            },
            required: ['customerName', 'customerPhone', 'date', 'time', 'partySize'],
          },
        },
        {
          name: 'modify_booking',
          description: 'Update or cancel an existing appointment. Customer must provide their confirmation code or phone number.',
          parameters: {
            type: 'object',
            properties: {
              confirmationCode: {
                type: 'string',
                description: 'The confirmation code from the original booking',
              },
              customerPhone: {
                type: 'string',
                description: "Customer's phone number (if confirmation code not available)",
              },
              action: {
                type: 'string',
                enum: ['reschedule', 'cancel'],
                description: 'Whether to reschedule or cancel the appointment',
              },
              newDate: {
                type: 'string',
                description: 'New date for rescheduling (YYYY-MM-DD or natural language)',
              },
              newTime: {
                type: 'string',
                description: 'New time for rescheduling (e.g., "7pm")',
              },
            },
            required: ['action'],
          },
        },
      ];

      // Update the agent via ElevenLabs API
      const agentPayload = {
        name: options.name,
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt,
            },
            first_message: greetingMessage, // REQUIRED for conversations to start
            language: options.language || 'en',
          },
          tts: {
            voice_id: options.voiceId || 'EXAVITQu4vr4xnSDxMaL',
            stability: 0.5,
            similarity_boost: 0.75,
            optimize_streaming_latency: 3,
          },
          conversation: {
            max_duration_seconds: options.maxCallDuration || 1800,
          },
          asr: {
            quality: 'high', // FIXED: ElevenLabs API only accepts 'high' (not 'standard')
          },
        },
        platform_settings: {
          widget_enabled: true,
        },
        // 🎯 AUTO-ADD THE 3 CUSTOM BOOKING FUNCTIONS
        // This eliminates the need to manually add them in the ElevenLabs dashboard!
        tools: bookingFunctions.map((func) => ({
          type: 'function',
          function: func,
        })),
      };

      console.log('📤 [ElevenLabs] Updating agent with AUTO-CONFIGURED booking functions...');
      console.log('   ✅ check_availability');
      console.log('   ✅ create_booking');
      console.log('   ✅ modify_booking');
      console.log('Full update payload:', JSON.stringify(agentPayload, null, 2));

      const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Failed to update agent:', error);
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      console.log('✅ ElevenLabs agent configuration updated successfully');

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Failed to update ElevenLabs agent configuration:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import a Twilio phone number into ElevenLabs and assign it to an agent
   * This uses ElevenLabs' native Twilio integration
   * NOTE: Import and assignment are TWO separate API calls per ElevenLabs docs
   */
  async importPhoneNumber(
    phoneNumber: string,
    agentId: string,
    userId: string
  ): Promise<{
    success: boolean;
    phoneNumberId?: string;
    error?: string;
    errorDetails?: any;
  }> {
    try {
      const apiKey = await this.getApiKey(userId);
      
      if (!apiKey) {
        const error = 'ElevenLabs API key not configured';
        console.error('❌', error);
        return { success: false, error };
      }

      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        const error = 'Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) not configured in environment variables';
        console.error('❌', error);
        return { success: false, error };
      }

      // Ensure phone number is in E.164 format
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.length === 10) {
          formattedPhone = '+1' + formattedPhone;
        } else if (formattedPhone.startsWith('1') && formattedPhone.length === 11) {
          formattedPhone = '+' + formattedPhone;
        } else {
          const error = `Invalid phone number format: ${phoneNumber}. Expected E.164 format (e.g., +14155551234)`;
          console.error('❌', error);
          return { success: false, error };
        }
      }

      console.log('📞 [ElevenLabs] Starting phone number import process');
      console.log('   Number:', formattedPhone);
      console.log('   Agent ID:', agentId || '(none - import only)');

      // STEP 1: Import the phone number into ElevenLabs
      console.log('📞 Step 1: Importing phone number to ElevenLabs...');
      
      const importPayload = {
        label: `Agent Phone - ${formattedPhone}`,
        phone_number: formattedPhone,  // FIXED: ElevenLabs expects "phone_number" not "number"
        sid: TWILIO_ACCOUNT_SID,        // FIXED: ElevenLabs expects "sid" not "twilio_account_sid"
        token: TWILIO_AUTH_TOKEN,       // FIXED: ElevenLabs expects "token" not "twilio_auth_token"
      };
      
      console.log('   Payload:', { ...importPayload, token: '***' });
      
      const importResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/phone-numbers`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importPayload),
      });

      const importStatusCode = importResponse.status;
      console.log('   Response Status:', importStatusCode);

      if (!importResponse.ok) {
        let errorText = '';
        let errorData: any = null;
        
        try {
          errorText = await importResponse.text();
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use as-is
        }
        
        console.error('❌ Import failed with status:', importStatusCode);
        console.error('   Error Response:', errorText);
        
        // Check if phone number is already imported
        if (errorText.includes('already') || errorText.includes('exists') || importStatusCode === 409) {
          console.warn('⚠️  Phone number may already be imported. Attempting to find existing import...');
          
          try {
            const listResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/phone-numbers`, {
              headers: { 'xi-api-key': apiKey },
            });
            
            if (listResponse.ok) {
              const phoneList = await listResponse.json();
              console.log('   Found phone numbers:', phoneList.phone_numbers?.length || 0);
              
              const existingPhone = phoneList.phone_numbers?.find(
                (p: any) => p.number === formattedPhone || p.phone_number === formattedPhone
              );
              
              if (existingPhone) {
                const phoneNumberId = existingPhone.phone_number_id || existingPhone.id;
                console.log('✅ Found existing phone number import:', phoneNumberId);
                
                // Try to assign agent to existing phone
                if (agentId && agentId.trim()) {
                  console.log('🔗 Assigning agent to existing phone number...');
                  const assignResponse = await fetch(
                    `${ELEVENLABS_BASE_URL}/convai/phone-numbers/${phoneNumberId}`,
                    {
                      method: 'PATCH',
                      headers: {
                        'xi-api-key': apiKey,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ agent_id: agentId }),
                    }
                  );
                  
                  if (assignResponse.ok) {
                    console.log('✅ Agent assigned to existing phone number');
                    return { success: true, phoneNumberId };
                  } else {
                    const assignError = await assignResponse.text();
                    console.error('❌ Assignment to existing phone failed:', assignError);
                  }
                }
                
                return { success: true, phoneNumberId };
              }
            }
          } catch (listError: any) {
            console.error('❌ Failed to list phone numbers:', listError.message);
          }
        }
        
        // Check for common errors
        let userFriendlyError = errorText;
        if (errorText.includes('Invalid twilio credentials')) {
          userFriendlyError = 'Invalid Twilio credentials. Please verify your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the environment variables.';
        } else if (errorText.includes('not found')) {
          userFriendlyError = `Phone number ${formattedPhone} not found in your Twilio account. Please ensure the number is purchased and active.`;
        } else if (errorText.includes('unauthorized') || importStatusCode === 401) {
          userFriendlyError = 'Unauthorized: Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY environment variable.';
        } else if (errorText.includes('subscription') || importStatusCode === 402) {
          userFriendlyError = 'Your ElevenLabs subscription plan does not support phone number imports. Please upgrade to Starter plan or higher.';
        }
        
        return {
          success: false,
          error: userFriendlyError,
          errorDetails: { statusCode: importStatusCode, response: errorData || errorText }
        };
      }

      const phoneData = await importResponse.json();
      const phoneNumberId = phoneData.phone_number_id || phoneData.id;

      console.log('✅ Step 1 complete: Phone number imported successfully');
      console.log('   Phone Number ID:', phoneNumberId);

      // STEP 2: Assign the agent to the imported phone number (optional - skip if no agent provided)
      if (agentId && agentId.trim()) {
        console.log('🔗 Step 2: Assigning agent to phone number...');
        
        const assignResponse = await fetch(
          `${ELEVENLABS_BASE_URL}/convai/phone-numbers/${phoneNumberId}`,
          {
            method: 'PATCH',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ agent_id: agentId }),
          }
        );

        const assignStatusCode = assignResponse.status;
        console.log('   Assignment Response Status:', assignStatusCode);

        if (!assignResponse.ok) {
          const errorText = await assignResponse.text();
          console.error('❌ Assignment failed:', errorText);
          console.warn('⚠️  Phone number imported but agent assignment failed.');
          console.warn('   You can assign the agent manually in ElevenLabs dashboard.');
          // Don't fail - phone number is still imported
        } else {
          console.log('✅ Step 2 complete: Agent assigned to phone number');
        }
      } else {
        console.log('ℹ️  Step 2 skipped: No agent ID provided (phone number imported without assignment)');
      }

      return {
        success: true,
        phoneNumberId,
      };
    } catch (error: any) {
      console.error('❌ [ElevenLabs] Phone import exception:', error);
      console.error('   Stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Unknown error occurred during phone number import',
        errorDetails: { exception: error.toString() }
      };
    }
  }

  /**
   * Validate that an agent is properly configured for making calls
   * Returns helpful error messages if not ready
   */
  async validateAgentSetup(agentId: string, userId?: string): Promise<{
    valid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    try {
      const apiKey = await this.getApiKey(userId);
      if (!apiKey) {
        return {
          valid: false,
          error: 'ElevenLabs API key not configured in environment variables',
        };
      }

      const warnings: string[] = [];

      // Check if agent exists in ElevenLabs
      const agentResponse = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
        {
          headers: { 'xi-api-key': apiKey },
        }
      );

      if (!agentResponse.ok) {
        return {
          valid: false,
          error: 'Agent not found in ElevenLabs. Please create or reconfigure the agent.',
        };
      }

      // Check if phone numbers are configured
      const phoneListResponse = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/phone-numbers`,
        {
          headers: { 'xi-api-key': apiKey },
        }
      );

      if (phoneListResponse.ok) {
        const phoneList = await phoneListResponse.json();
        const agentPhone = phoneList.phone_numbers?.find(
          (p: any) => p.agent_id === agentId
        );

        if (!agentPhone) {
          warnings.push('No phone number assigned to this agent. Outbound calls may fail.');
        }
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Update an existing ElevenLabs agent
   */
  async updateAgent(
    agentId: string,
    updates: Partial<CreateAgentOptions>,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const apiKey = await this.getApiKey(userId);
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🔄 Updating ElevenLabs agent:', agentId);

      // Get current agent configuration
      const getResponse = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
        {
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error('Failed to fetch current agent config');
      }

      const currentAgent: ElevenLabsAgent = await getResponse.json();

      // Build updated configuration
      const updatedConfig = {
        conversation_config: {
          ...currentAgent.conversation_config,
          agent: {
            ...currentAgent.conversation_config.agent,
            ...(updates.systemPrompt && {
              prompt: {
                prompt: updates.systemPrompt,
              },
            }),
            ...(updates.greetingMessage && {
              first_message: updates.greetingMessage,
            }),
            ...(updates.language && {
              language: updates.language,
            }),
          },
          ...(updates.voiceId && {
            tts: {
              voice_id: updates.voiceId,
            },
          }),
        },
      };

      // Update the agent
      const updateResponse = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
        {
          method: 'PATCH',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedConfig),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        throw new Error(`Failed to update agent: ${error}`);
      }

      console.log('✅ ElevenLabs agent updated:', agentId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to update ElevenLabs agent:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete an ElevenLabs agent (when user deletes their voice agent)
   */
  async deleteAgent(agentId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiKey = await this.getApiKey(userId);
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      console.log('🗑️  Deleting ElevenLabs agent:', agentId);

      const response = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
        {
          method: 'DELETE',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        // 404 is OK - agent already deleted
        const error = await response.text();
        throw new Error(`Failed to delete agent: ${error}`);
      }

      console.log('✅ ElevenLabs agent deleted:', agentId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to delete ElevenLabs agent:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(userId?: string) {
    try {
      const apiKey = await this.getApiKey(userId);
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Build a default system prompt with business context
   */
  private buildDefaultPrompt(options: CreateAgentOptions): string {
    const industry = options.businessIndustry || 'business';
    const knowledgeBase = options.knowledgeBase 
      ? `\n\nCompany Information:\n${options.knowledgeBase}`
      : '';

    return `You are a professional AI assistant representing ${options.businessName}, a ${industry} company.

Your role is to:
- Answer questions about ${options.businessName}
- Help customers with their inquiries
- Schedule appointments when requested
- Be helpful, professional, and friendly
- Keep responses concise and natural

Communication style:
- Speak naturally like a human
- Keep responses brief (1-2 sentences max)
- Ask clarifying questions when needed
- Be warm and approachable${knowledgeBase}

Important: You are having a phone conversation, so keep your responses conversational and brief.

═══════════════════════════════════════════════════════════════
📅 APPOINTMENT BOOKING CAPABILITIES - AUTOMATICALLY ENABLED
═══════════════════════════════════════════════════════════════

You have access to these functions for managing appointments:

🔍 check_availability
   Purpose: Check available time slots for appointments
   When to use: Customer asks about "available times", "can I book", "when can I come in", or similar scheduling questions
   
📝 create_booking
   Purpose: Create a new appointment booking
   When to use: Customer confirms they want to book a specific time slot
   Required info: customer name, phone number, preferred date/time
   
✏️ modify_booking
   Purpose: Modify or cancel an existing appointment
   When to use: Customer wants to "change", "reschedule", or "cancel" an appointment
   Required: confirmation code (ask them for it)

═══════════════════════════════════════════════════════════════
📋 BOOKING WORKFLOW - FOLLOW THESE STEPS
═══════════════════════════════════════════════════════════════

STEP 1 - Customer asks about appointments:
   → Use check_availability function immediately
   → Present 2-3 available time slots
   → Example: "I have openings at 2pm, 3:30pm, and 5pm tomorrow. Which works best for you?"

STEP 2 - Customer chooses a time:
   → Confirm you have their: name, phone number, preferred date/time
   → If missing any info, ask for it naturally
   → Use create_booking function with all details
   
STEP 3 - After successful booking:
   → Provide the confirmation code CLEARLY and SLOWLY
   → Say: "Your confirmation code is [CODE]. Please write it down."
   → Repeat the appointment details: date, time, location
   → Mention: "You'll receive an SMS confirmation with your code"
   
STEP 4 - For modifications/cancellations:
   → Ask: "What's your confirmation code?"
   → Use modify_booking function with the code
   → Confirm the change was successful

═══════════════════════════════════════════════════════════════
⚠️ IMPORTANT REMINDERS FOR BOOKINGS
═══════════════════════════════════════════════════════════════

✓ ALWAYS use check_availability before suggesting times
✓ ALWAYS collect: customer name, phone number, date, time
✓ ALWAYS provide the confirmation code clearly
✓ ALWAYS ask them to write down the confirmation code
✓ ALWAYS confirm all details before finalizing
✓ NEVER skip the check_availability step
✓ NEVER book without confirming customer details
✓ Be patient and helpful throughout the process

The customer will receive an automated SMS with their confirmation code and appointment details.

═══════════════════════════════════════════════════════════════
📅 CURRENT DATE & TIME INFORMATION (LIVE & AUTOMATIC)
═══════════════════════════════════════════════════════════════

You have access to the following LIVE datetime information via dynamic variables:
• Current Date & Time: {{current_datetime}}
• Day of the Week: {{current_day}}  
• Timezone: {{timezone}}

This information is AUTOMATICALLY PROVIDED and ALWAYS ACCURATE.

How to use this information:
1. When determining if the business is open or closed, use {{current_day}} and the time from {{current_datetime}}
2. When scheduling appointments or callbacks, reference {{current_day}}
3. When the caller asks about dates or times, use this information confidently

CRITICAL RULES FOR DATE/TIME:
• DO NOT ask the caller "What day is it?" or "What's today's date?" - You already know via {{current_day}} and {{current_datetime}}
• DO NOT say "I'm not programmed to know" or similar phrases about dates/times
• SPEAK NATURALLY about the day and time as if you naturally know it
• Example: "Since today is {{current_day}}, we are currently [open/closed]."

Use {{current_day}} and {{current_datetime}} to determine the current operating status and provide accurate scheduling information.`;
  }

  /**
   * Ensure user has a subscription record (create if doesn't exist)
   */
  private async ensureUserSubscription(userId: string) {
    const existing = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!existing) {
      await prisma.userSubscription.create({
        data: {
          userId,
          tier: 'PRO',
          status: 'ACTIVE',
          monthlyMinutes: 100, // Default: 100 minutes included
          basePriceUSD: 29.99,
          perMinutePriceUSD: 0.15,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          lastResetAt: new Date(),
        },
      });
      console.log('✅ Created subscription for user:', userId);
    }
  }

  /**
   * Track call usage for billing
   */
  async trackCallUsage(params: {
    userId: string;
    voiceAgentId: string;
    callLogId: string;
    durationSeconds: number;
    elevenLabsCallId?: string;
  }) {
    try {
      const minutesUsed = params.durationSeconds / 60;
      
      // Calculate cost (example: $0.15 per minute)
      const costPerMinute = 0.15;
      const costUSD = minutesUsed * costPerMinute;

      // Get current billing period
      const now = new Date();
      const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Create usage record
      await prisma.voiceUsage.create({
        data: {
          userId: params.userId,
          voiceAgentId: params.voiceAgentId,
          callLogId: params.callLogId,
          durationSeconds: params.durationSeconds,
          minutesUsed,
          costUSD,
          elevenLabsCallId: params.elevenLabsCallId,
          billingPeriod,
          billingStatus: 'PENDING',
        },
      });

      // Update user subscription usage
      await prisma.userSubscription.update({
        where: { userId: params.userId },
        data: {
          minutesUsed: {
            increment: minutesUsed,
          },
        },
      });

      console.log(`✅ Tracked usage: ${minutesUsed.toFixed(2)} minutes ($${costUSD.toFixed(2)}) for user ${params.userId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to track usage:', error);
      return { success: false, error };
    }
  }

  /**
   * Get user's current usage and billing info
   */
  async getUserUsage(userId: string) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return null;
    }

    const currentPeriodUsage = await prisma.voiceUsage.aggregate({
      where: {
        userId,
        billingPeriod: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      },
      _sum: {
        minutesUsed: true,
        costUSD: true,
      },
    });

    const includedMinutes = subscription.monthlyMinutes;
    const usedMinutes = currentPeriodUsage._sum.minutesUsed || 0;
    const overage = Math.max(0, usedMinutes - includedMinutes);
    const overageCost = overage * subscription.perMinutePriceUSD;
    const totalCost = subscription.basePriceUSD + overageCost;

    return {
      tier: subscription.tier,
      status: subscription.status,
      includedMinutes,
      usedMinutes,
      remainingMinutes: Math.max(0, includedMinutes - usedMinutes),
      overage,
      overageCost,
      baseCost: subscription.basePriceUSD,
      totalCost,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }
}

export const elevenLabsProvisioning = new ElevenLabsProvisioningService();
