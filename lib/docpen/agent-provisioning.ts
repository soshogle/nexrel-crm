/**
 * AI Docpen - Voice Agent Provisioning Service
 * 
 * Creates and manages profession-specific ElevenLabs conversational AI agents
 * for hands-free medical assistant functionality during clinical consultations.
 */

import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { VOICE_AGENT_PROMPTS } from './voice-prompts';
import type { DocpenProfessionType } from './prompts';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for medical professionals (calm, authoritative)
const MEDICAL_VOICE_IDS = {
  female: 'EXAVITQu4vr4xnSDxMaL', // Sarah - calm, professional
  male: 'VR6AewLTigWG4xSOukaG', // Arnold - authoritative
  neutral: 'FGY2WhTYpPnrIDTdsKH5', // Laura - neutral, clear
};

export interface DocpenAgentConfig {
  userId: string;
  profession: DocpenProfessionType;
  customProfession?: string;
  practitionerName?: string;
  clinicName?: string;
  voiceGender?: 'male' | 'female' | 'neutral';
  sessionContext?: {
    patientName?: string;
    chiefComplaint?: string;
    sessionId?: string;
  };
}

export interface DocpenAgentResult {
  success: boolean;
  agentId?: string;
  error?: string;
}

class DocpenAgentProvisioning {
  /**
   * Get the active ElevenLabs API key for a user
   */
  private async getApiKey(userId: string): Promise<string> {
    const apiKey = await elevenLabsKeyManager.getActiveApiKey(userId);
    return apiKey || process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Create or get an existing Docpen voice agent for a profession
   * Automatically updates agent functions if needed (for API migrations)
   */
  async getOrCreateAgent(config: DocpenAgentConfig): Promise<DocpenAgentResult> {
    try {
      const professionKey = config.profession === 'CUSTOM' 
        ? `CUSTOM_${config.customProfession?.toUpperCase().replace(/\s+/g, '_')}` 
        : config.profession;

      // Check if agent already exists for this user + profession
      console.log(`🔍 [Docpen] Checking for existing agent: userId=${config.userId}, profession=${config.profession}, customProfession=${config.customProfession || 'null'}`);
      
      const existingAgent = await prisma.docpenVoiceAgent.findFirst({
        where: {
          userId: config.userId,
          profession: config.profession,
          customProfession: config.profession === 'CUSTOM' ? config.customProfession : null,
          isActive: true,
        },
      });

      if (existingAgent) {
        console.log(`🎙️ [Docpen] Found existing agent in database for ${professionKey}: ${existingAgent.elevenLabsAgentId}`);
        console.log(`🎙️ [Docpen] Agent details:`, {
          id: existingAgent.id,
          elevenLabsAgentId: existingAgent.elevenLabsAgentId,
          profession: existingAgent.profession,
          customProfession: existingAgent.customProfession,
          createdAt: existingAgent.createdAt,
        });
        
        // Verify agent exists in ElevenLabs (don't fail if it doesn't, but log it)
        const apiKey = await this.getApiKey(config.userId);
        let agentExistsInElevenLabs = false;
        
        if (apiKey) {
          try {
            console.log(`🔍 [Docpen] Verifying agent ${existingAgent.elevenLabsAgentId} exists in ElevenLabs...`);
            const verifyResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${existingAgent.elevenLabsAgentId}`, {
              headers: { 'xi-api-key': apiKey },
            });
            
            if (verifyResponse.ok) {
              agentExistsInElevenLabs = true;
              console.log(`✅ [Docpen] Verified agent ${existingAgent.elevenLabsAgentId} exists in ElevenLabs`);
            } else {
              const errorText = await verifyResponse.text();
              console.warn(`⚠️ [Docpen] Agent ${existingAgent.elevenLabsAgentId} not found in ElevenLabs (status: ${verifyResponse.status}): ${errorText}`);
              console.warn(`⚠️ [Docpen] Will create new agent instead of reusing database record`);
            }
          } catch (verifyError: any) {
            console.warn(`⚠️ [Docpen] Could not verify agent in ElevenLabs:`, verifyError.message);
            // Assume agent exists if we can't verify (might be network issue)
            agentExistsInElevenLabs = true;
          }
        } else {
          console.warn(`⚠️ [Docpen] No API key available to verify agent. Assuming it exists.`);
          agentExistsInElevenLabs = true;
        }
        
        // Only return existing agent if it exists in ElevenLabs
        // If verification explicitly failed (404), we'll create a new agent
        if (agentExistsInElevenLabs) {
          // Automatically update agent functions in the background (non-blocking)
          this.updateAgentFunctions(existingAgent.elevenLabsAgentId, config.userId)
            .then(success => {
              if (success) {
                console.log(`✅ [Docpen] Auto-updated agent ${existingAgent.elevenLabsAgentId} with latest function configurations`);
              }
            })
            .catch(err => {
              console.warn(`⚠️ [Docpen] Failed to auto-update agent functions (non-critical):`, err.message);
            });
          
          // Update session context if provided
          if (config.sessionContext) {
            await this.updateAgentContext(existingAgent.elevenLabsAgentId, config);
          }
          
          return {
            success: true,
            agentId: existingAgent.elevenLabsAgentId,
          };
        } else {
          console.log(`🔄 [Docpen] Agent ${existingAgent.elevenLabsAgentId} not found in ElevenLabs. Creating new agent...`);
          // Continue to create new agent below
        }
      } else {
        console.log(`🆕 [Docpen] No existing agent found. Creating new agent...`);
      }

      // Create new agent
      console.log(`🎙️ [Docpen] Creating new voice agent for profession: ${professionKey}`);
      return await this.createAgent(config);
    } catch (error: any) {
      console.error('❌ [Docpen] Error getting/creating agent:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new Docpen voice agent
   */
  async createAgent(config: DocpenAgentConfig): Promise<DocpenAgentResult> {
    const apiKey = await this.getApiKey(config.userId);
    
    if (!apiKey) {
      return {
        success: false,
        error: 'ElevenLabs API key not configured',
      };
    }

    // Log which API key is being used (for debugging)
    const apiKeySource = await elevenLabsKeyManager.getAllKeys(config.userId);
    const isUserKey = apiKeySource.length > 0;
    const keyLabel = isUserKey 
      ? apiKeySource.find(k => k.apiKey === apiKey)?.label || 'User API Key'
      : 'Environment Variable (ELEVENLABS_API_KEY)';
    
    console.log(`🔑 [Docpen] Creating agent with API key from: ${keyLabel}`);
    console.log(`🔑 [Docpen] API key preview: ...${apiKey.slice(-8)}`);

    // Fetch user's language preference
    const user = await prisma.user.findUnique({
      where: { id: config.userId },
      select: { language: true },
    });
    const userLanguage = user?.language || 'en';

    const professionKey = config.profession === 'CUSTOM' 
      ? 'CUSTOM' 
      : config.profession;

    // Get profession-specific prompt
    const promptTemplate = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;
    
    // Build the full system prompt with context
    const systemPrompt = this.buildSystemPrompt(promptTemplate, config, userLanguage);
    
    // Select voice based on preference
    const voiceId = MEDICAL_VOICE_IDS[config.voiceGender || 'neutral'];

    // Define custom functions for medical assistant
    const medicalFunctions = this.buildMedicalFunctions();

    const agentPayload = {
      name: `Docpen ${config.profession}${config.customProfession ? ` - ${config.customProfession}` : ''} Assistant`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
          },
          first_message: `Hello Doctor${config.practitionerName ? ` ${config.practitionerName}` : ''}. I'm your Docpen assistant ready to help with ${this.getProfessionDisplayName(config.profession, config.customProfession)} consultations. Just say "Docpen" followed by your question anytime.`,
          language: userLanguage, // Use user's language preference
        },
        tts: {
          voice_id: voiceId,
          stability: 0.6, // Slightly higher for professional tone
          similarity_boost: 0.8,
          optimize_streaming_latency: 3,
        },
        conversation: {
          max_duration_seconds: 3600, // 1 hour max
        },
        asr: {
          quality: 'high',
        },
      },
      platform_settings: {
        widget_enabled: true,
      },
      tools: medicalFunctions.map(func => ({
        type: 'function',
        function: func,
      })),
    };

    console.log('📤 [Docpen] Creating ElevenLabs agent with medical functions...');
    console.log('📤 [Docpen] Agent payload:', JSON.stringify(agentPayload, null, 2));
    console.log('📤 [Docpen] API endpoint:', `${ELEVENLABS_BASE_URL}/convai/agents/create`);
    console.log('📤 [Docpen] Using API key ending in:', apiKey.slice(-8));

    let response: Response;
    try {
      response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentPayload),
      });
    } catch (fetchError: any) {
      console.error('❌ [Docpen] Fetch error creating agent:', fetchError);
      throw new Error(`Failed to connect to ElevenLabs API: ${fetchError.message}`);
    }

    console.log('📥 [Docpen] ElevenLabs API response status:', response.status, response.statusText);
    console.log('📥 [Docpen] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📥 [Docpen] Raw response:', responseText);

    if (!response.ok) {
      console.error('❌ [Docpen] ElevenLabs API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      throw new Error(`ElevenLabs API error (${response.status}): ${responseText}`);
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [Docpen] Failed to parse response as JSON:', parseError);
      throw new Error(`Invalid JSON response from ElevenLabs: ${responseText}`);
    }

    console.log('📥 [Docpen] Parsed response:', JSON.stringify(result, null, 2));

    const agentId = result.agent_id;
    if (!agentId) {
      console.error('❌ [Docpen] No agent_id in response:', result);
      throw new Error(`ElevenLabs API did not return agent_id. Response: ${JSON.stringify(result)}`);
    }

    console.log(`✅ [Docpen] Created agent: ${agentId}`);
    console.log(`📝 [Docpen] Agent name: "${agentPayload.name}"`);
    console.log(`🔑 [Docpen] Created in ElevenLabs account associated with API key: ${keyLabel}`);
    console.log(`💡 [Docpen] To see this agent in ElevenLabs dashboard, log in with the account that owns this API key`);
    console.log(`🔗 [Docpen] ElevenLabs dashboard URL: https://elevenlabs.io/app/agents/agents`);

    // Save to database with error handling and upsert to handle race conditions
    try {
      const customProfessionValue = config.profession === 'CUSTOM' 
        ? (config.customProfession || null)
        : null;

      // Build where clause - Prisma unique constraint requires all fields
      const whereClause = customProfessionValue !== null
        ? {
            userId_profession_customProfession: {
              userId: config.userId,
              profession: config.profession,
              customProfession: customProfessionValue,
            },
          }
        : {
            // For non-CUSTOM professions, find by userId + profession (customProfession is null)
            userId: config.userId,
            profession: config.profession,
            customProfession: null,
          };

      await prisma.docpenVoiceAgent.upsert({
        where: whereClause as any, // Type assertion needed due to Prisma's unique constraint typing
        create: {
          userId: config.userId,
          profession: config.profession,
          customProfession: customProfessionValue,
          elevenLabsAgentId: agentId,
          voiceId: voiceId,
          systemPrompt: systemPrompt,
          isActive: true,
        },
        update: {
          elevenLabsAgentId: agentId, // Update if agent already exists (race condition)
          voiceId: voiceId,
          systemPrompt: systemPrompt,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ [Docpen] Agent saved to database: ${agentId}`);
    } catch (dbError: any) {
      console.error(`❌ [Docpen] Failed to save agent to database:`, dbError);
      // If it's a unique constraint violation, try to find existing agent
      if (dbError.code === 'P2002' || dbError.message?.includes('Unique constraint')) {
        console.log(`⚠️ [Docpen] Agent already exists in database, attempting to update...`);
        try {
          const existing = await prisma.docpenVoiceAgent.findFirst({
            where: {
              userId: config.userId,
              profession: config.profession,
              customProfession: config.profession === 'CUSTOM' ? config.customProfession : null,
            },
          });
          if (existing) {
            await prisma.docpenVoiceAgent.update({
              where: { id: existing.id },
              data: {
                elevenLabsAgentId: agentId,
                voiceId: voiceId,
                systemPrompt: systemPrompt,
                isActive: true,
              },
            });
            console.log(`✅ [Docpen] Updated existing agent record: ${existing.id}`);
          }
        } catch (updateError) {
          console.error(`❌ [Docpen] Failed to update existing agent:`, updateError);
          // Continue - agent exists in ElevenLabs, just not in our DB
        }
      }
      // Don't throw - agent was created successfully in ElevenLabs
      // Database sync can be fixed later
    }

    return {
      success: true,
      agentId,
    };
  }

  /**
   * Update agent context for current session
   */
  async updateAgentContext(agentId: string, config: DocpenAgentConfig): Promise<void> {
    const apiKey = await this.getApiKey(config.userId);
    if (!apiKey) return;

    // Fetch user's language preference
    const user = await prisma.user.findUnique({
      where: { id: config.userId },
      select: { language: true },
    });
    const userLanguage = user?.language || 'en';

    const professionKey = config.profession === 'CUSTOM' ? 'CUSTOM' : config.profession;
    const promptTemplate = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;
    const systemPrompt = this.buildSystemPrompt(promptTemplate, config, userLanguage);

    try {
      await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: systemPrompt,
              },
            },
          },
        }),
      });
      console.log(`📝 [Docpen] Updated agent context for session`);
    } catch (error) {
      console.error('⚠️ [Docpen] Failed to update agent context:', error);
    }
  }

  /**
   * Update existing agent with latest function configurations
   * This is needed after API migrations to ensure agents use correct endpoints
   * Called automatically when agents are accessed - no user action required
   */
  async updateAgentFunctions(agentId: string, userId: string): Promise<boolean> {
    const apiKey = await this.getApiKey(userId);
    if (!apiKey) {
      console.error('❌ [Docpen] No API key available for updating agent functions');
      return false;
    }

    try {
      // Get current agent config from ElevenLabs
      const getResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Failed to fetch agent: ${getResponse.statusText}`);
      }

      const currentAgent = await getResponse.json();
      
      // Check if agent already has the correct server_url configured
      const currentTools = currentAgent.tools || [];
      const medicalFunctions = this.buildMedicalFunctions();
      const expectedServerUrl = this.getFunctionServerUrl();
      
      // Check if any function is missing server_url or has wrong URL
      const needsUpdate = currentTools.length === 0 || 
        currentTools.some((tool: any) => {
          const func = tool.function;
          return !func?.server_url || func.server_url !== expectedServerUrl;
        });

      if (!needsUpdate) {
        console.log(`✅ [Docpen] Agent ${agentId} already has correct function configurations`);
        return true;
      }
      
      // Update with latest function configurations while preserving all existing settings
      const updatePayload = {
        name: currentAgent.name,
        conversation_config: {
          ...currentAgent.conversation_config,
          // Preserve agent config (prompt, first_message, language)
          agent: {
            ...currentAgent.conversation_config?.agent,
            prompt: currentAgent.conversation_config?.agent?.prompt,
            first_message: currentAgent.conversation_config?.agent?.first_message,
            language: currentAgent.conversation_config?.agent?.language || 'en',
          },
          // Preserve TTS settings
          tts: currentAgent.conversation_config?.tts,
          // Preserve conversation settings
          conversation: currentAgent.conversation_config?.conversation,
          // Preserve ASR settings
          asr: currentAgent.conversation_config?.asr,
        },
        platform_settings: currentAgent.platform_settings || { widget_enabled: true },
        // Update tools with latest function configurations
        tools: medicalFunctions.map(func => ({
          type: 'function',
          function: func,
        })),
      };

      const updateResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        throw new Error(`Failed to update agent: ${error}`);
      }

      console.log(`✅ [Docpen] Updated agent ${agentId} with latest function configurations`);
      return true;
    } catch (error: any) {
      console.error(`❌ [Docpen] Failed to update agent functions:`, error);
      return false;
    }
  }

  /**
   * Get signed WebSocket URL for voice conversation
   */
  async getSignedWebSocketUrl(
    agentId: string,
    userId: string,
    dynamicVariables?: Record<string, string>
  ): Promise<string> {
    const apiKey = await this.getApiKey(userId);
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Add datetime context
    const now = new Date();
    const torontoTime = now.toLocaleString('en-US', { timeZone: 'America/Toronto' });
    const torontoDay = now.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'long' });

    const params = new URLSearchParams({
      agent_id: agentId,
      current_datetime: torontoTime,
      current_day: torontoDay,
      timezone: 'America/Toronto',
      ...dynamicVariables,
    });

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/convai/conversation/get_signed_url?${params.toString()}`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get signed URL: ${error}`);
    }

    const data = await response.json();
    return data.signed_url;
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(template: string, config: DocpenAgentConfig, userLanguage: string = 'en'): string {
    // Language instruction based on user preference
    const languageInstructions: Record<string, string> = {
      'en': 'IMPORTANT: Respond in English. All your responses must be in English.',
      'fr': 'IMPORTANT: Répondez en français. Toutes vos réponses doivent être en français.',
      'es': 'IMPORTANTE: Responde en español. Todas tus respuestas deben ser en español.',
      'zh': '重要提示：请用中文回复。您的所有回复必须使用中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];
    let prompt = `${languageInstruction}\n\n${template}`;

    // Add practitioner context
    if (config.practitionerName) {
      prompt += `\n\n## Current Practitioner\nYou are assisting Dr. ${config.practitionerName}`;
      if (config.clinicName) {
        prompt += ` at ${config.clinicName}`;
      }
      prompt += '.';
    }

    // Add session context
    if (config.sessionContext) {
      prompt += '\n\n## Current Session Context';
      if (config.sessionContext.patientName) {
        prompt += `\n- Patient: ${config.sessionContext.patientName}`;
      }
      if (config.sessionContext.chiefComplaint) {
        prompt += `\n- Chief Complaint: ${config.sessionContext.chiefComplaint}`;
      }
    }

    // Add datetime context instructions
    prompt += `\n\n## Real-Time Context
You have access to the following dynamic variables:
- {{current_datetime}} - The current date and time
- {{current_day}} - The current day of the week
- {{timezone}} - The timezone (America/Toronto)

Use these for any time-sensitive responses.`;

    return prompt;
  }

  /**
   * Get the function server URL for Docpen agents
   */
  private getFunctionServerUrl(): string {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.nexrel.soshogle.com';
    return `${baseUrl}/api/docpen/voice-agent/functions`;
  }

  /**
   * Build medical assistant custom functions
   */
  private buildMedicalFunctions() {
    const serverUrl = this.getFunctionServerUrl();
    
    return [
      {
        name: 'lookup_patient_history',
        description: 'Look up patient history from the CRM. Use when the practitioner asks about a patient\'s previous visits, medical history, allergies, or medications.',
        parameters: {
          type: 'object',
          properties: {
            patientName: {
              type: 'string',
              description: 'Patient name or identifier to search for',
            },
            historyType: {
              type: 'string',
              enum: ['all', 'medications', 'allergies', 'conditions', 'visits', 'labs'],
              description: 'Type of history to retrieve',
            },
          },
          required: ['patientName'],
        },
        server_url: serverUrl,
      },
      {
        name: 'check_drug_interaction',
        description: 'Check for potential drug interactions between medications. Use when the practitioner asks about drug safety or interactions.',
        parameters: {
          type: 'object',
          properties: {
            drug1: {
              type: 'string',
              description: 'First medication name',
            },
            drug2: {
              type: 'string',
              description: 'Second medication name',
            },
            additionalDrugs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional medications to check (optional)',
            },
          },
          required: ['drug1', 'drug2'],
        },
        server_url: serverUrl,
      },
      {
        name: 'medical_reference_lookup',
        description: 'Look up medical reference information like dosage guidelines, ICD-10 codes, clinical guidelines, or procedure codes.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Medical term, condition, procedure, or code to look up',
            },
            referenceType: {
              type: 'string',
              enum: ['icd10', 'cpt', 'dosage', 'guidelines', 'general'],
              description: 'Type of reference to search',
            },
          },
          required: ['query'],
        },
        server_url: serverUrl,
      },
      {
        name: 'suggest_soap_content',
        description: 'Suggest content for a specific SOAP note section based on conversation context.',
        parameters: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              enum: ['subjective', 'objective', 'assessment', 'plan'],
              description: 'SOAP section to suggest content for',
            },
            context: {
              type: 'string',
              description: 'Relevant context from the current conversation',
            },
          },
          required: ['section'],
        },
        server_url: serverUrl,
      },
    ];
  }

  /**
   * Get display name for profession
   */
  private getProfessionDisplayName(profession: DocpenProfessionType, custom?: string): string {
    const names: Record<string, string> = {
      GENERAL_PRACTICE: 'general practice',
      DENTIST: 'dental',
      OPTOMETRIST: 'optometry',
      DERMATOLOGIST: 'dermatology',
      CARDIOLOGIST: 'cardiology',
      PSYCHIATRIST: 'psychiatry',
      PEDIATRICIAN: 'pediatric',
      ORTHOPEDIC: 'orthopedic',
      PHYSIOTHERAPIST: 'physiotherapy',
      CHIROPRACTOR: 'chiropractic',
      CUSTOM: custom || 'specialized',
    };
    return names[profession] || 'medical';
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    const apiKey = await this.getApiKey(userId);
    if (!apiKey) return false;

    try {
      await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': apiKey,
        },
      });

      await prisma.docpenVoiceAgent.updateMany({
        where: { elevenLabsAgentId: agentId },
        data: { isActive: false },
      });

      return true;
    } catch (error) {
      console.error('❌ [Docpen] Failed to delete agent:', error);
      return false;
    }
  }

  /**
   * List all active agents for a user
   */
  async listAgents(userId: string) {
    return prisma.docpenVoiceAgent.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const docpenAgentProvisioning = new DocpenAgentProvisioning();
