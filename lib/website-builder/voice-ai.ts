/**
 * ElevenLabs Voice AI Integration for Websites
 * Creates and configures voice AI agents for websites
 */

import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import type { VoiceAIConfig, QuestionnaireAnswers } from './types';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export class WebsiteVoiceAIService {
  /**
   * Create voice AI agent for website
   */
  async createVoiceAIAgent(
    websiteId: string,
    websiteName: string,
    userId: string,
    businessInfo: QuestionnaireAnswers | { businessName: string; businessDescription: string }
  ): Promise<VoiceAIConfig> {
    try {
      const businessName = businessInfo.businessName;
      const businessDescription = businessInfo.businessDescription || '';
      
      // Generate system prompt for website context
      const systemPrompt = this.generateSystemPrompt(businessName, businessDescription, businessInfo);
      
      // Generate greeting message
      const greetingMessage = this.generateGreeting(businessName);
      
      // Create agent using existing provisioning service
      const result = await elevenLabsProvisioning.createAgent({
        name: `${websiteName} Voice Assistant`,
        businessName,
        businessIndustry: (businessInfo as any).industryNiche,
        greetingMessage,
        systemPrompt,
        userId,
        voiceAgentId: websiteId, // Use websiteId as voiceAgentId
      });
      
      if (!result.success || !result.agentId) {
        throw new Error(result.error || 'Failed to create voice AI agent');
      }
      
      return {
        enabled: true,
        agentId: result.agentId,
        greeting: greetingMessage,
        systemPrompt,
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
        language: 'en',
      };
    } catch (error: any) {
      console.error('Voice AI agent creation failed:', error);
      throw new Error(`Failed to create voice AI agent: ${error.message}`);
    }
  }

  /**
   * Generate system prompt for website voice AI.
   * Note: Confidentiality guard is appended by elevenLabsProvisioning.createAgent.
   */
  private generateSystemPrompt(
    businessName: string,
    businessDescription: string,
    businessInfo: any
  ): string {
    const services = businessInfo.services?.join(', ') || '';
    const products = businessInfo.products?.join(', ') || '';
    const contactInfo = businessInfo.contactInfo || {};
    
    return `You are a friendly and professional voice assistant for ${businessName}.

${businessDescription ? `About ${businessName}: ${businessDescription}` : ''}

${services ? `Services offered: ${services}` : ''}
${products ? `Products available: ${products}` : ''}

Your role:
- Answer questions about ${businessName} and what we offer
- Help visitors understand our services/products
- Provide contact information when requested
- Be friendly, professional, and helpful
- Keep responses concise and informative

${contactInfo.email ? `Contact email: ${contactInfo.email}` : ''}
${contactInfo.phone ? `Contact phone: ${contactInfo.phone}` : ''}
${contactInfo.address ? `Address: ${contactInfo.address}` : ''}

If you don't know something, politely direct them to our contact form or website for more information.`;
  }

  /**
   * Generate greeting message
   */
  private generateGreeting(businessName: string): string {
    return `Hello! Welcome to ${businessName}. How can I help you today?`;
  }

  /** Delimiter for owner customization section in system prompt */
  private readonly OWNER_CUSTOMIZATION_DELIMITER = '\n\n--- OWNER CUSTOMIZATION ---\n';

  /**
   * Sync owner's custom prompt to ElevenLabs agent.
   * Preserves existing base prompt (from creation) and appends/replaces owner section.
   * No manual {{custom_prompt}} setup needed in ElevenLabs dashboard.
   */
  async syncCustomPromptToAgent(
    agentId: string,
    websiteName: string,
    customPrompt: string | null | undefined,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const ownerSection = customPrompt?.trim() || '';

      const apiKey = (await voiceAIPlatform.getMasterApiKey()) || process.env.ELEVENLABS_API_KEY || '';
      if (!apiKey) {
        return { success: false, error: 'ElevenLabs API key not configured' };
      }

      // Fetch current agent to preserve existing prompt (business info from creation)
      const getRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey },
      });

      let basePrompt: string;
      if (getRes.ok) {
        const agent = await getRes.json();
        const currentPrompt = agent?.conversation_config?.agent?.prompt?.prompt || '';
        const delimIdx = currentPrompt.indexOf(this.OWNER_CUSTOMIZATION_DELIMITER);
        basePrompt = delimIdx >= 0
          ? currentPrompt.slice(0, delimIdx).trim()
          : currentPrompt || `You are a friendly voice assistant for ${websiteName}. Help visitors with properties and collect contact info when interested.`;
      } else {
        basePrompt = `You are a friendly voice assistant for ${websiteName}. Help visitors find properties, answer questions, and collect contact info when interested.`;
      }

      const fullPrompt = ownerSection
        ? `${basePrompt}${this.OWNER_CUSTOMIZATION_DELIMITER}${ownerSection}`
        : basePrompt;

      const result = await elevenLabsProvisioning.updateAgent(
        agentId,
        { systemPrompt: fullPrompt },
        userId
      );

      return result;
    } catch (error: any) {
      console.error('[WebsiteVoiceAI] syncCustomPromptToAgent failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update voice AI agent configuration
   */
  async updateVoiceAIAgent(
    agentId: string,
    config: Partial<VoiceAIConfig>
  ): Promise<void> {
    // Implement other updates (greeting, etc.) if needed
  }

  /**
   * Delete voice AI agent
   */
  async deleteVoiceAIAgent(agentId: string): Promise<void> {
    // TODO: Implement agent deletion via ElevenLabs API
  }
}

export const websiteVoiceAI = new WebsiteVoiceAIService();
