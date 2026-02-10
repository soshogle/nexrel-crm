
/**
 * ElevenLabs Text-to-Speech Service
 * Provides high-quality voice synthesis for onboarding
 */

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export class ElevenLabsTTSService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Professional female voice

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured');
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   * Returns audio data as base64 string for playback
   */
  async textToSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<{ audioBase64: string; success: boolean }> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = options.voiceId || this.defaultVoiceId;
    const url = `${this.baseUrl}/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      // Convert audio to base64
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      return {
        audioBase64: base64Audio,
        success: true,
      };
    } catch (error: any) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }
}

export const elevenLabsTTS = new ElevenLabsTTSService();
