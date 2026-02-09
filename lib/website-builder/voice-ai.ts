/**
 * ElevenLabs Voice AI Integration for Websites
 * Creates and configures voice AI agents for websites
 */

import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import type { VoiceAIConfig, QuestionnaireAnswers } from './types';

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
   * Generate system prompt for website voice AI
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

  /**
   * Update voice AI agent configuration
   */
  async updateVoiceAIAgent(
    agentId: string,
    config: Partial<VoiceAIConfig>
  ): Promise<void> {
    // TODO: Implement agent update via ElevenLabs API
    // This would update the agent's prompt, greeting, etc.
  }

  /**
   * Delete voice AI agent
   */
  async deleteVoiceAIAgent(agentId: string): Promise<void> {
    // TODO: Implement agent deletion via ElevenLabs API
  }
}

export const websiteVoiceAI = new WebsiteVoiceAIService();
