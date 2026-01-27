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
   */
  async getOrCreateAgent(config: DocpenAgentConfig): Promise<DocpenAgentResult> {
    try {
      const professionKey = config.profession === 'CUSTOM' 
        ? `CUSTOM_${config.customProfession?.toUpperCase().replace(/\s+/g, '_')}` 
        : config.profession;

      // Check if agent already exists for this user + profession
      const existingAgent = await prisma.docpenVoiceAgent.findFirst({
        where: {
          userId: config.userId,
          profession: config.profession,
          customProfession: config.profession === 'CUSTOM' ? config.customProfession : null,
          isActive: true,
        },
      });

      if (existingAgent) {
        console.log(`🎙️ [Docpen] Found existing agent for ${professionKey}: ${existingAgent.elevenLabsAgentId}`);
        
        // Update session context if provided
        if (config.sessionContext) {
          await this.updateAgentContext(existingAgent.elevenLabsAgentId, config);
        }
        
        return {
          success: true,
          agentId: existingAgent.elevenLabsAgentId,
        };
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

    const professionKey = config.profession === 'CUSTOM' 
      ? 'CUSTOM' 
      : config.profession;

    // Get profession-specific prompt
    const promptTemplate = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;
    
    // Build the full system prompt with context
    const systemPrompt = this.buildSystemPrompt(promptTemplate, config);
    
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
          language: 'en',
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

    const result = await response.json();
    const agentId = result.agent_id;

    console.log(`✅ [Docpen] Created agent: ${agentId}`);

    // Save to database
    await prisma.docpenVoiceAgent.create({
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

    const professionKey = config.profession === 'CUSTOM' ? 'CUSTOM' : config.profession;
    const promptTemplate = VOICE_AGENT_PROMPTS[professionKey] || VOICE_AGENT_PROMPTS.GENERAL_PRACTICE;
    const systemPrompt = this.buildSystemPrompt(promptTemplate, config);

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
  private buildSystemPrompt(template: string, config: DocpenAgentConfig): string {
    let prompt = template;

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
   * Build medical assistant custom functions
   */
  private buildMedicalFunctions() {
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
