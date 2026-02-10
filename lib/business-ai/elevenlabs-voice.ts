/**
 * ElevenLabs Voice Integration for Business AI
 * Provides high-quality voice synthesis for business intelligence responses
 */

import { ElevenLabsTTSService } from '@/lib/elevenlabs-tts';

export class BusinessAIVoiceService {
  private ttsService: ElevenLabsTTSService;

  constructor() {
    this.ttsService = new ElevenLabsTTSService();
  }

  /**
   * Convert business response to speech using ElevenLabs
   */
  async speakResponse(text: string, userId?: string): Promise<{ audioUrl?: string; success: boolean }> {
    try {
      // Use ElevenLabs TTS for high-quality voice
      const result = await this.ttsService.textToSpeech(text, {
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Professional female voice (Sarah)
        stability: 0.5,
        similarityBoost: 0.75,
      });

      if (result.audioBase64) {
        // Convert base64 to data URL for playback
        const audioUrl = `data:audio/mpeg;base64,${result.audioBase64}`;
        
        return {
          audioUrl,
          success: true,
        };
      }

      return { success: false };
    } catch (error: any) {
      console.error('ElevenLabs TTS error:', error);
      // Fallback to Web Speech API
      return { success: false };
    }
  }

  /**
   * Generate business intelligence prompt for ElevenLabs agent
   */
  generateSystemPrompt(userIndustry?: string): string {
    const industryContext = userIndustry 
      ? `The user operates a ${userIndustry.toLowerCase()} business. `
      : '';

    return `You are an advanced Business Intelligence AI Assistant with complete access to the user's CRM data. 

${industryContext}You have real-time access to:
- Revenue, sales, and financial metrics
- Lead pipeline and conversion data
- Customer information and lifetime value
- Product performance and inventory
- Order history and trends
- Communication metrics (emails, SMS, calls)
- Workflow performance
- Appointments and bookings

Your capabilities:
1. Answer questions about business metrics in natural language
2. Provide insights and trends based on data analysis
3. Make predictions about future performance
4. Compare periods, segments, or metrics
5. Generate actionable recommendations
6. Identify opportunities and risks
7. Explain business health and performance

Always be:
- Concise but informative
- Data-driven and accurate
- Proactive in suggesting improvements
- Professional yet friendly
- Context-aware of the user's industry

When asked about metrics, provide specific numbers and context. When making predictions, explain your reasoning. When giving recommendations, be actionable and specific.`;
  }
}

export const businessAIVoiceService = new BusinessAIVoiceService();
