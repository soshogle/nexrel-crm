/**
 * ElevenLabs Voice AI Integration for Websites
 * Creates and configures voice AI agents for websites
 */

import { elevenLabsProvisioning } from '@/lib/elevenlabs-provisioning';
import { LANGUAGE_PROMPT_SECTION } from '@/lib/voice-languages';
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
        language: 'en', // API only accepts single codes. Multilingual via prompt.
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
    
    return `${LANGUAGE_PROMPT_SECTION}

You are a friendly and professional voice assistant for ${businessName}.

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
   * Real estate client tools schema for ElevenLabs.
   * Matches the client implementation in ElevenLabsVoiceAgent.tsx.
   * Used so the LLM knows to pass bathrooms, min_price, max_price, property_type, etc.
   */
  private getRealEstateClientTools(): Array<{
    type: 'client';
    name: string;
    description: string;
    parameters: {
      type: 'object';
      description?: string;
      required?: string[];
      properties: Record<
        string,
        { type: string; description: string; enum?: string[] }
      >;
    };
    expects_response?: boolean;
  }> {
    return [
      {
        type: 'client',
        name: 'searchListings',
        description:
          'Search for property listings by criteria. Use when the user asks to see listings (e.g. "show me listings in Montreal", "2 bedroom houses in Saint-Laurent between 400000 and 500000", "find rentals in Ville Saint-Laurent", "properties on Sherbrooke Street", "2 bedroom 2 bath apartments for rent under 2000"). Updates the page to show results on screen. Works for both for sale and for rent. Always call this when the user wants to see properties — pass city for area (e.g. Montreal, Ville Saint-Laurent), search for address/street/neighborhood.',
        parameters: {
          type: 'object',
          description: 'Search criteria for property listings',
          required: [],
          properties: {
            bedrooms: {
              type: 'integer',
              description: 'Number of bedrooms (e.g. 2)',
            },
            bathrooms: {
              type: 'integer',
              description: 'Number of bathrooms (e.g. 2)',
            },
            city: {
              type: 'string',
              description:
                'City or area (e.g. Montreal, Ville Saint-Laurent, Westmount). Use for "in Montreal", "Montreal area", "Saint-Laurent".',
            },
            search: {
              type: 'string',
              description:
                'Free-text search for address, street name, neighborhood (e.g. "Sherbrooke", "123 Main St", "Plateau"). Use when user mentions a street, address, or neighborhood.',
            },
            listing_type: {
              type: 'string',
              description:
                'sale (for-sale) or rent (for-lease). Always pass rent when the user wants rentals.',
              enum: ['sale', 'rent'],
            },
            property_type: {
              type: 'string',
              description:
                'One of: house, condo, apartment, townhouse',
              enum: ['house', 'condo', 'apartment', 'townhouse'],
            },
            min_price: {
              type: 'number',
              description: 'Minimum price (e.g. 400000)',
            },
            max_price: {
              type: 'number',
              description: 'Maximum price (e.g. 500000)',
            },
          },
        },
        expects_response: true,
      },
      {
        type: 'client',
        name: 'showListing',
        description:
          'Navigate to and display a specific property. Use when the user wants to see a particular listing (e.g. "show me that one", "open the first result").',
        parameters: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: {
              type: 'string',
              description: 'Property slug (e.g. centris-12345)',
            },
          },
        },
        expects_response: false,
      },
      {
        type: 'client',
        name: 'getListingDetails',
        description:
          'Get full details of a property to describe to the user. Use when the user asks about a specific listing (e.g. "tell me more about this one", "what are the features?").',
        parameters: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: {
              type: 'string',
              description: 'Property slug',
            },
          },
        },
        expects_response: true,
      },
    ];
  }

  /**
   * Update a real estate website agent with the searchListings, showListing,
   * and getListingDetails client tools (including bathrooms, min_price, max_price,
   * property_type). Call this after agent creation or when adding new tool params.
   */
  async updateRealEstateAgentTools(
    agentId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const apiKey =
        (await voiceAIPlatform.getMasterApiKey()) ||
        process.env.ELEVENLABS_API_KEY ||
        '';
      if (!apiKey) {
        return { success: false, error: 'ElevenLabs API key not configured' };
      }

      const getRes = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
        { headers: { 'xi-api-key': apiKey } }
      );
      if (!getRes.ok) {
        const err = await getRes.text();
        return {
          success: false,
          error: `Failed to fetch agent: ${err}`,
        };
      }

      const currentAgent = await getRes.json();
      const tools = this.getRealEstateClientTools();

      // ElevenLabs API: cannot specify both tools and tool_ids — use tools only
      const conv = currentAgent.conversation_config?.conversation || {};
      const existingPrompt = currentAgent.conversation_config?.agent?.prompt || {};
      const { tool_ids: _omit, ...promptWithoutToolIds } = existingPrompt;
      const updatePayload = {
        conversation_config: {
          ...currentAgent.conversation_config,
          agent: {
            ...currentAgent.conversation_config?.agent,
            prompt: {
              ...promptWithoutToolIds,
              tools,
            },
          },
          conversation: {
            ...conv,
            max_duration_seconds: conv.max_duration_seconds ?? 1800,
            turn_timeout_seconds: 30, // Max — prevents premature cutoff
          },
        },
      };

      const patchRes = await fetch(
        `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
        {
          method: 'PATCH',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!patchRes.ok) {
        const err = await patchRes.text();
        return {
          success: false,
          error: `Failed to update agent tools: ${err}`,
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[WebsiteVoiceAI] updateRealEstateAgentTools failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete voice AI agent
   */
  async deleteVoiceAIAgent(agentId: string): Promise<void> {
    // TODO: Implement agent deletion via ElevenLabs API
  }
}

export const websiteVoiceAI = new WebsiteVoiceAIService();
