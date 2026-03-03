/**
 * AI Docpen - Voice Agent Provisioning Service
 * 
 * Creates and manages profession-specific ElevenLabs conversational AI agents
 * for hands-free medical assistant functionality during clinical consultations.
 */

import { getCrmDb } from '@/lib/dal'
import { createDalContext } from '@/lib/context/industry-context';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { ensureMultilingualPrompt, getElevenLabsLanguageCode } from '@/lib/voice-languages';
import { VOICE_AGENT_PROMPTS } from './voice-prompts';
import type { DocpenProfessionType } from './prompts';
const db = getCrmDb({ userId: '', industry: null })

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
      
      const existingAgent = await db.docpenVoiceAgent.findFirst({
        where: {
          userId: config.userId,
          profession: config.profession,
          customProfession: config.profession === 'CUSTOM' ? config.customProfession : null,
          isActive: true,
        },
      });

      if (existingAgent) {
        console.log(`🎙️ [Docpen] Found existing agent in database: ${existingAgent.elevenLabsAgentId}`);
        
        // CRITICAL: Verify agent actually exists in ElevenLabs before reusing
        const apiKey = await this.getApiKey(config.userId);
        if (apiKey) {
          try {
            const verifyResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${existingAgent.elevenLabsAgentId}`, {
              headers: { 'xi-api-key': apiKey },
            });
            
            if (verifyResponse.status === 404) {
              console.warn(`⚠️ [Docpen] Agent ${existingAgent.elevenLabsAgentId} NOT FOUND in ElevenLabs (404) - marking inactive and creating new one`);
              // Mark as inactive and create a new agent
              await db.docpenVoiceAgent.update({
                where: { id: existingAgent.id },
                data: { isActive: false },
              });
              // Continue to create new agent below
            } else if (!verifyResponse.ok) {
              console.warn(`⚠️ [Docpen] Failed to verify agent (${verifyResponse.status}) - creating new one anyway`);
              await db.docpenVoiceAgent.update({
                where: { id: existingAgent.id },
                data: { isActive: false },
              });
              // Continue to create new agent below
            } else {
              // Agent exists in ElevenLabs - reuse it
              console.log(`✅ [Docpen] Verified agent ${existingAgent.elevenLabsAgentId} exists in ElevenLabs - reusing`);
              
              // Fix agent (strip invalid llm, update function server_url) in background.
              // Don't await - prevents 504 timeout when ElevenLabs is slow. User can retry if needed.
              this.updateAgentFunctions(existingAgent.elevenLabsAgentId, config.userId)
                .then((updated) => {
                  if (updated) console.log(`✅ [Docpen] Agent ${existingAgent.elevenLabsAgentId} updated with valid config`);
                })
                .catch((err: any) => console.warn(`⚠️ [Docpen] Failed to update agent functions (non-critical):`, err.message));

              // Update session context in background (don't block return)
              if (config.sessionContext) {
                this.updateAgentContext(existingAgent.elevenLabsAgentId, config).catch(() => {});
              }
              
              return {
                success: true,
                agentId: existingAgent.elevenLabsAgentId,
              };
            }
          } catch (verifyError: any) {
            console.error(`❌ [Docpen] Error verifying agent:`, verifyError.message);
            // On error, mark inactive and create new one to be safe
            await db.docpenVoiceAgent.update({
              where: { id: existingAgent.id },
              data: { isActive: false },
            }).catch(() => {}); // Ignore update errors
            // Continue to create new agent below
          }
        } else {
          console.warn(`⚠️ [Docpen] No API key available to verify agent - creating new one`);
          // No API key - mark inactive and create new
          await db.docpenVoiceAgent.update({
            where: { id: existingAgent.id },
            data: { isActive: false },
          }).catch(() => {}); // Ignore update errors
          // Continue to create new agent below
        }
      }

      // Create new agent
      console.log(`🎙️ [Docpen] Creating new voice agent for profession: ${professionKey}`);

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
   * Clone existing agent from ElevenLabs and create new one with llm fix.
   * Preserves exact prompt, first_message, TTS, tools, etc. - carbon copy with only llm corrected.
   */
  async createAgentFromExisting(
    config: DocpenAgentConfig,
    sourceElevenLabsAgentId: string
  ): Promise<DocpenAgentResult> {
    const apiKey = await this.getApiKey(config.userId);
    if (!apiKey) {
      return { success: false, error: 'ElevenLabs API key not configured' };
    }

    try {
      const getResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${sourceElevenLabsAgentId}`, {
        headers: { 'xi-api-key': apiKey },
      });
      if (!getResponse.ok) {
        const errText = await getResponse.text();
        throw new Error(`Failed to fetch source agent: ${getResponse.status} ${errText}`);
      }
      const sourceAgent = await getResponse.json();

      const convConfig = sourceAgent.conversation_config || {};
      const agentConfig = convConfig.agent || {};
      const promptConfig = agentConfig.prompt || {};

      // Carbon copy: use exact prompt from existing agent, but strip invalid llm (English agents must use turbo/flash v2)
      const { llm: _invalidLlm, ...promptWithoutLlm } = promptConfig;
      const fixedPrompt = promptWithoutLlm; // Omit llm; ElevenLabs default satisfies requirement

      const medicalFunctions = this.buildMedicalFunctions();
      const expectedServerUrl = this.getFunctionServerUrl();

      const clonePayload = {
        name: sourceAgent.name || `Docpen ${config.profession} Assistant`,
        conversation_config: {
          agent: {
            prompt: fixedPrompt,
            first_message: agentConfig.first_message || '',
            language: getElevenLabsLanguageCode(agentConfig.language || 'en'),
          },
          tts: convConfig.tts || {},
          conversation: convConfig.conversation || {},
          asr: convConfig.asr || {},
        },
        platform_settings: sourceAgent.platform_settings || { widget_enabled: true, allowed_overrides: { agent: ['prompt', 'language'] } },
        tools: medicalFunctions.map((func) => ({
          type: 'function',
          function: { ...func, server_url: expectedServerUrl },
        })),
      };

      console.log('📤 [Docpen] Cloning agent with exact prompt, llm fix, and function server_url');
      const createResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(clonePayload),
      });

      const responseText = await createResponse.text();
      if (!createResponse.ok) {
        throw new Error(`ElevenLabs create failed (${createResponse.status}): ${responseText}`);
      }
      const result = JSON.parse(responseText);
      const newAgentId = result.agent_id;
      if (!newAgentId) throw new Error('No agent_id in response');

      const voiceId = convConfig.tts?.voice_id || MEDICAL_VOICE_IDS[config.voiceGender || 'neutral'];
      const systemPrompt = typeof promptConfig.prompt === 'string' ? promptConfig.prompt : '';

      await db.docpenVoiceAgent.updateMany({
        where: { elevenLabsAgentId: sourceElevenLabsAgentId },
        data: { isActive: false },
      });
      await db.docpenVoiceAgent.create({
        data: {
          userId: config.userId,
          profession: config.profession,
          customProfession: config.profession === 'CUSTOM' ? config.customProfession : null,
          elevenLabsAgentId: newAgentId,
          voiceId,
          systemPrompt,
          isActive: true,
        },
      });

      console.log(`✅ [Docpen] Cloned agent ${sourceElevenLabsAgentId} → ${newAgentId} (exact replica, llm fixed)`);
      return { success: true, agentId: newAgentId };
    } catch (error: any) {
      console.error('❌ [Docpen] Clone failed:', error.message);
      return { success: false, error: error.message };
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

    // Fetch user's language preference and industry
    const user = await db.user.findUnique({
      where: { id: config.userId },
      select: { language: true, industry: true },
    });
    const userLanguage = user?.language || 'en';
    const userIndustry = user?.industry || null;

    const professionKey = config.profession === 'CUSTOM' 
      ? 'CUSTOM' 
      : config.profession;

    // Get profession-specific prompt
    const promptTemplate = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;
    
    // Build the full system prompt with context + Eastern time (ensure multilingual)
    const { EASTERN_TIME_SYSTEM_INSTRUCTION } = await import('@/lib/voice-time-context');
    const rawPrompt = this.buildSystemPrompt(promptTemplate, config, userLanguage, userIndustry);
    const systemPrompt = ensureMultilingualPrompt(rawPrompt) + EASTERN_TIME_SYSTEM_INSTRUCTION;
    
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
            // No llm - match CRM/AI Employee agents; ElevenLabs default satisfies "turbo or flash v2"
          },
          first_message: `Hello${config.practitionerName ? ` ${config.practitionerName}` : ''}${userIndustry ? ` from the ${userIndustry.toLowerCase().replace(/_/g, ' ')} industry` : ''}. I'm your Docpen assistant ready to help with ${this.getProfessionDisplayName(config.profession, config.customProfession)} consultations. Just say "Docpen" followed by your question anytime.`,
          language: 'en', // API only accepts ISO codes. Multilingual via prompt + eleven_multilingual_v2 TTS.
        },
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_multilingual_v2', // Best accent quality (matches landing page)
          stability: 0.6, // Slightly higher for professional tone
          similarity_boost: 0.8,
          optimize_streaming_latency: 3,
        },
        turn: { mode: 'turn', turn_timeout: 30 }, // CRITICAL: unset defaults to 7s — causes premature disconnect
        conversation: {
          max_duration_seconds: 3600, // 1 hour max
          turn_timeout_seconds: 30,
        },
        asr: {
          quality: 'high',
        },
      },
      platform_settings: {
        widget_enabled: true,
        allowed_overrides: {
          agent: ['prompt', 'language'],
        },
      },
      tools: medicalFunctions.map(func => ({
        type: 'function',
        function: func,
      })),
    };

    console.log('📤 [Docpen] Creating ElevenLabs agent with medical functions...');
    console.log('📤 [Docpen] Agent payload:', JSON.stringify({
      name: agentPayload.name,
      hasConversationConfig: !!agentPayload.conversation_config,
      hasTools: !!agentPayload.tools && agentPayload.tools.length > 0,
      toolCount: agentPayload.tools?.length || 0,
    }, null, 2));

    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentPayload),
    });

    console.log('📥 [Docpen] ElevenLabs API response status:', response.status, response.statusText);
    console.log('📥 [Docpen] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📥 [Docpen] Raw response (first 500 chars):', responseText.substring(0, 500));
    console.log('📥 [Docpen] Full response length:', responseText.length);

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
    
    // CRITICAL: Verify agent actually exists in ElevenLabs before saving to DB
    console.log(`🔍 [Docpen] Verifying agent exists in ElevenLabs...`);
    try {
      const verifyResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey },
      });
      
      if (verifyResponse.status === 404) {
        console.error(`❌ [Docpen] Agent ${agentId} NOT FOUND in ElevenLabs (404) - creation may have failed silently`);
        throw new Error(`Agent creation returned agent_id but agent does not exist in ElevenLabs. This may indicate an API key permission issue or API error.`);
      } else if (!verifyResponse.ok) {
        const verifyError = await verifyResponse.text();
        console.error(`❌ [Docpen] Failed to verify agent (${verifyResponse.status}):`, verifyError);
        throw new Error(`Agent created but verification failed (${verifyResponse.status}): ${verifyError}`);
      } else {
        const agentData = await verifyResponse.json();
        console.log(`✅ [Docpen] Verified agent exists in ElevenLabs:`, {
          agentId: agentData.agent_id,
          name: agentData.name,
          createdAt: agentData.metadata?.created_at_unix_secs,
        });
        console.log(`💡 [Docpen] To see this agent in ElevenLabs dashboard, log in with the account that owns this API key`);
      }
    } catch (verifyError: any) {
      // If verification fails, don't save to DB - the agent doesn't actually exist
      console.error(`❌ [Docpen] Agent verification failed:`, verifyError.message);
      throw verifyError;
    }

    // Save to database only after successful verification
    await db.docpenVoiceAgent.create({
      data: {
        userId: config.userId,
        profession: config.profession,
        customProfession: config.profession === 'CUSTOM' ? config.customProfession : null,
        elevenLabsAgentId: agentId,
        voiceId: voiceId,
        systemPrompt: systemPrompt,
        isActive: true,
      },
    });

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

    // Fetch user's language preference and industry
    const user = await db.user.findUnique({
      where: { id: config.userId },
      select: { language: true, industry: true },
    });
    const userLanguage = user?.language || 'en';
    const userIndustry = user?.industry || null;

    const professionKey = config.profession === 'CUSTOM' ? 'CUSTOM' : config.profession;
    const promptTemplate = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;
    const { EASTERN_TIME_SYSTEM_INSTRUCTION } = await import('@/lib/voice-time-context');
    const rawPrompt = this.buildSystemPrompt(promptTemplate, config, userLanguage, userIndustry);
    const systemPrompt = ensureMultilingualPrompt(rawPrompt) + EASTERN_TIME_SYSTEM_INSTRUCTION;

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
              language: 'en',
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
      
      const currentTools = currentAgent.tools || [];
      const medicalFunctions = this.buildMedicalFunctions();
      const expectedServerUrl = this.getFunctionServerUrl();
      const agentPrompt = currentAgent.conversation_config?.agent?.prompt || {};
      const hasInvalidLlm = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gpt-4-turbo'].includes(agentPrompt.llm);
      
      // Update if: tools need server_url fix, OR agent has invalid llm (English agents must use turbo/flash v2)
      const needsToolUpdate = currentTools.length === 0 || 
        currentTools.some((tool: any) => {
          const func = tool.function;
          return !func?.server_url || func.server_url !== expectedServerUrl;
        });
      const needsUpdate = needsToolUpdate || hasInvalidLlm;

      if (!needsUpdate) {
        console.log(`✅ [Docpen] Agent ${agentId} already has correct configuration`);
        return true;
      }
      
      // Update with latest function configurations while preserving all existing settings
      // CRITICAL: Remove llm from prompt - English agents must use turbo or flash v2.
      // gemini-2.5-flash, gpt-4-turbo fail; omitting llm lets ElevenLabs use a valid default.
      const { llm: _removed, ...promptWithoutLlm } = agentPrompt;

      const updatePayload = {
        name: currentAgent.name,
        conversation_config: {
          ...currentAgent.conversation_config,
          // Preserve agent config (prompt, first_message, language)
          agent: {
            ...currentAgent.conversation_config?.agent,
            prompt: promptWithoutLlm,
            first_message: currentAgent.conversation_config?.agent?.first_message,
            language: getElevenLabsLanguageCode(currentAgent.conversation_config?.agent?.language || 'en'),
          },
          // Preserve TTS settings
          tts: currentAgent.conversation_config?.tts,
          // Preserve conversation settings
          conversation: currentAgent.conversation_config?.conversation,
          // Preserve ASR settings
          asr: currentAgent.conversation_config?.asr,
        },
        platform_settings: {
          ...(currentAgent.platform_settings || { widget_enabled: true }),
          allowed_overrides: { agent: ['prompt', 'language'] },
        },
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
      `${ELEVENLABS_BASE_URL}/convai/conversation/get-signed-url?${params.toString()}`,
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
  private buildSystemPrompt(template: string, config: DocpenAgentConfig, _userLanguage: string = 'en', userIndustry: string | null = null): string {
    const { LANGUAGE_PROMPT_SECTION } = require('@/lib/voice-languages');
    let prompt = `${LANGUAGE_PROMPT_SECTION}\n\n${template}`;

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
      ORTHODONTIC: 'orthodontic',
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

      await db.docpenVoiceAgent.updateMany({
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
    return db.docpenVoiceAgent.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const docpenAgentProvisioning = new DocpenAgentProvisioning();
