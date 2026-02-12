/**
 * ElevenLabs Text-to-Speech & Conversational AI Integration
 */

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface ConversationConfig {
  agent?: {
    prompt?: {
      prompt?: string;
      llm?: string;
      temperature?: number;
      max_tokens?: number;
    };
    first_message?: string;
    language?: string;
  };
  tts?: {
    voice_id?: string;
    model_id?: string;
    output_format?: string;
    voice_settings?: VoiceSettings;
  };
  conversation?: {
    max_duration_seconds?: number;
    client_events?: string[];
    server_events?: string[];
  };
}

/** Per-call overrides for voice, language, etc. Requires agent to have overrides enabled in Security settings. */
export interface ConversationConfigOverride {
  agent?: {
    language?: string;
    prompt?: { prompt?: string; llm?: string };
    first_message?: string;
  };
  tts?: {
    voice_id?: string;
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  };
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices() {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices from ElevenLabs');
    }

    return response.json();
  }

  /**
   * List all conversations from ElevenLabs
   * This pulls the conversation history directly from ElevenLabs API
   */
  async listConversations(params?: {
    agent_id?: string;
    cursor?: string;
    page_size?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const url = `${this.baseUrl}/convai/conversations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations from ElevenLabs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a Conversational AI Agent
   */
  async createConversationalAgent(config: ConversationConfig) {
    const response = await fetch(`${this.baseUrl}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_config: config,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create ElevenLabs agent: ${error}`);
    }

    return response.json();
  }

  /**
   * Update an existing Conversational AI Agent
   */
  async updateConversationalAgent(agentId: string, config: ConversationConfig) {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_config: config,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update ElevenLabs agent: ${error}`);
    }

    return response.json();
  }

  /**
   * Get agent details
   */
  async getAgent(agentId: string) {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch agent details');
    }

    return response.json();
  }

  /**
   * Delete a Conversational AI Agent
   */
  async deleteAgent(agentId: string) {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete agent');
    }

    return true;
  }

  /**
   * Initiate a phone call with a Conversational AI Agent
   * IMPORTANT: This requires native ElevenLabs-Twilio integration
   * The phone number must be imported into ElevenLabs and assigned to the agent
   */
  /**
   * Get signed WebSocket URL for real-time conversation
   * @param agentId - The ElevenLabs agent ID
   */
  async getSignedWebSocketUrl(agentId: string, dynamicVariables?: Record<string, string>): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('🔐 [ElevenLabs] Getting signed WebSocket URL for agent:', agentId);
    if (dynamicVariables) {
      console.log('  📝 With dynamic variables:', dynamicVariables);
    }

    // Build query parameters
    const params = new URLSearchParams({ agent_id: agentId });
    
    // Add dynamic variables as query parameters
    if (dynamicVariables) {
      Object.entries(dynamicVariables).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    const response = await fetch(
      `${this.baseUrl}/convai/conversation/get-signed-url?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ElevenLabs] Failed to get signed URL:', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Failed to get signed WebSocket URL: ${response.statusText}`);
    }

    const data = await response.json();
    const signedUrl = data.signed_url;

    if (!signedUrl) {
      throw new Error('No signed URL returned from ElevenLabs');
    }

    console.log('✅ [ElevenLabs] Got signed WebSocket URL');
    return signedUrl;
  }

  /**
   * Initiate a phone call.
   * @param agentId - ElevenLabs agent ID
   * @param phoneNumber - E.164 format
   * @param override - Optional per-call overrides (voice, language, etc.). Agent must have overrides enabled in ElevenLabs Security settings.
   */
  async initiatePhoneCall(
    agentId: string,
    phoneNumber: string,
    override?: ConversationConfigOverride
  ) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Ensure phone number is in E.164 format
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      // Assume US number if no country code
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.startsWith('1') && formattedPhone.length === 11) {
        formattedPhone = '+' + formattedPhone;
      }
    }

    // First, verify the agent has a phone number assigned
    console.log('🔍 [ElevenLabs] Checking agent configuration before call...');
    try {
      const agentDetails = await this.getAgent(agentId);
      console.log('📋 [ElevenLabs] Agent details:', {
        agent_id: agentDetails.agent_id,
        name: agentDetails.name,
        phone_number_id: agentDetails.phone_number_id || 'NO PHONE NUMBER ASSIGNED'
      });
      
      if (!agentDetails.phone_number_id) {
        throw new Error('Agent does not have a phone number assigned in ElevenLabs. Please click "Configure Agent" button and then "Auto-Configure" to import and assign a phone number.');
      }
    } catch (checkError: any) {
      console.error('❌ [ElevenLabs] Agent check failed:', checkError.message);
      throw new Error(`Pre-call validation failed: ${checkError.message}`);
    }

    console.log('📞 [ElevenLabs] Initiating outbound call:', {
      agentId,
      phoneNumber: formattedPhone,
    });

    const body: Record<string, unknown> = {
      phone_number: formattedPhone,
    };
    if (override && Object.keys(override).length > 0) {
      body.conversation_config_override = override;
    }

    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/call`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📋 [ElevenLabs] Call API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ElevenLabs] Call initiation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      
      // Try to parse error for better messaging
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text
      }
      
      // Provide more specific error messages based on status code
      if (response.status === 404) {
        throw new Error(`Agent not found or not properly configured in ElevenLabs. The agent may not have a phone number assigned. Please check: 1) Agent exists in ElevenLabs, 2) Phone number is imported, 3) Phone number is assigned to this agent.`);
      } else if (response.status === 402) {
        throw new Error('Insufficient credits or plan does not support outbound calls. Please check your ElevenLabs subscription.');
      } else if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}`);
      }
      
      throw new Error(`Failed to initiate call (${response.status}): ${errorMessage}`);
    }

    const result = await response.json();
    console.log('✅ [ElevenLabs] Call initiated successfully:', result);
    
    return result;
  }

  /**
   * Get conversation details including transcript and audio availability
   * @param conversationId - The ElevenLabs conversation ID
   */
  async getConversationDetails(conversationId: string) {
    try {
      console.log('🔍 [ElevenLabs] Fetching conversation details for ID:', conversationId);
      
      const response = await fetch(`${this.baseUrl}/convai/conversations/${conversationId}`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ElevenLabs] Failed to fetch conversation:', {
          status: response.status,
          error: errorText,
          conversationId,
        });
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [ElevenLabs] Conversation details fetched:', {
        conversationId,
        hasAudio: !!data.has_audio,
        hasTranscript: !!data.transcript,
        transcriptLength: Array.isArray(data.transcript) ? data.transcript.length : 0,
        status: data.status,
      });

      return data;
    } catch (error: any) {
      console.error('❌ [ElevenLabs] Error fetching conversation details:', error);
      throw error;
    }
  }

  /**
   * Get audio recording URL for a conversation
   * Returns a proxy URL that the browser can access without auth headers
   * @param conversationId - The ElevenLabs conversation ID
   */
  async getRecordingUrl(conversationId: string): Promise<string | null> {
    try {
      console.log('🎙️ [ElevenLabs] Checking audio availability for conversation:', conversationId);
      
      // First check if audio is available
      const details = await this.getConversationDetails(conversationId);
      
      if (!details.has_audio) {
        console.log('⚠️  [ElevenLabs] No audio available for conversation:', conversationId);
        return null;
      }

      // Return our internal proxy URL that handles ElevenLabs authentication
      // This allows the browser to play audio without needing API keys
      const proxyUrl = `/api/calls/audio/${conversationId}`;
      
      console.log('✅ [ElevenLabs] Audio available, returning proxy URL:', proxyUrl);
      return proxyUrl;
    } catch (error) {
      console.error('❌ [ElevenLabs] Error checking audio availability:', error);
      return null;
    }
  }

  /**
   * Get formatted transcript for a conversation
   * @param conversationId - The ElevenLabs conversation ID
   */
  async getTranscript(conversationId: string): Promise<string | null> {
    try {
      const details = await this.getConversationDetails(conversationId);
      
      // ElevenLabs returns transcript as an array of turn-by-turn messages
      if (Array.isArray(details.transcript) && details.transcript.length > 0) {
        // Format: "Agent: Hello" / "User: Hi there"
        return details.transcript
          .map((turn: any) => {
            const role = turn.role === 'agent' ? 'Agent' : 'User';
            const message = turn.message || '';
            const timestamp = turn.time_in_call_secs ? `[${turn.time_in_call_secs}s]` : '';
            return `${role}${timestamp}: ${message}`;
          })
          .join('\n\n');
      }
      
      console.log('⚠️  [ElevenLabs] No transcript available for conversation:', conversationId);
      return null;
    } catch (error) {
      console.error('❌ [ElevenLabs] Error fetching transcript:', error);
      return null;
    }
  }

  /**
   * Convert text to speech (basic TTS)
   */
  async textToSpeech(
    text: string, 
    voiceId: string = 'EXAVITQu4vr4xnSDxMaL',
    settings?: VoiceSettings
  ) {
    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: settings || {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Stream text-to-speech (for real-time calls)
   */
  async streamTextToSpeech(
    text: string, 
    voiceId: string = 'EXAVITQu4vr4xnSDxMaL',
    settings?: VoiceSettings
  ) {
    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: settings || {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to stream audio from ElevenLabs');
    }

    return response.body;
  }

  /**
   * Get signed URL for WebSocket connection (for real-time conversation)
   */
  async getConversationSignedUrl(agentId: string) {
    const response = await fetch(
      `${this.baseUrl}/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        headers: {
          'xi-api-key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get signed URL');
    }

    return response.json();
  }

  /**
   * Import Twilio phone number into ElevenLabs (Native Integration)
   * This imports the phone number and lets ElevenLabs handle all webhook configuration
   */
  async importTwilioPhoneNumber(phoneNumber: string, label: string): Promise<{ phone_number_id: string }> {
    try {
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not configured');
      }

      console.log('📞 [ElevenLabs] Importing Twilio phone number:', phoneNumber);

      const response = await fetch(`${this.baseUrl}/convai/phone-numbers`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          label: label,
          sid: TWILIO_ACCOUNT_SID,
          token: TWILIO_AUTH_TOKEN,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to import phone number to ElevenLabs: ${error}`);
      }

      const result = await response.json();
      console.log('✅ [ElevenLabs] Phone number imported, ID:', result.phone_number_id);
      
      return result;
    } catch (error: any) {
      console.error('❌ [ElevenLabs] Phone number import error:', error);
      throw new Error(`Failed to import phone number to ElevenLabs: ${error.message}`);
    }
  }

  /**
   * Assign phone number to an agent
   * After importing, assign the phone number to a specific agent
   */
  async assignPhoneNumberToAgent(phoneNumberId: string, agentId: string): Promise<void> {
    try {
      console.log('🔗 [ElevenLabs] Assigning phone number to agent:', { phoneNumberId, agentId });

      const response = await fetch(`${this.baseUrl}/convai/phone-numbers/${phoneNumberId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to assign phone number to agent: ${error}`);
      }

      console.log('✅ [ElevenLabs] Phone number assigned to agent successfully');
    } catch (error: any) {
      console.error('❌ [ElevenLabs] Phone number assignment error:', error);
      throw new Error(`Failed to assign phone number to agent: ${error.message}`);
    }
  }

  /**
   * Get phone number details from ElevenLabs
   */
  async getPhoneNumber(phoneNumberId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/convai/phone-numbers/${phoneNumberId}`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get phone number from ElevenLabs: ${error}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('ElevenLabs get phone number error:', error);
      throw new Error(`Failed to get phone number from ElevenLabs: ${error.message}`);
    }
  }

  /**
   * Remove phone number from a Conversational AI Agent
   */
  async removePhoneNumber(agentId: string) {
    try {
      const agent = await this.getAgent(agentId);
      
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform_settings: {
            ...agent.platform_settings,
            phone_number: null,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to remove phone number from ElevenLabs agent: ${error}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('ElevenLabs phone number removal error:', error);
      throw new Error(`Failed to remove phone number from ElevenLabs: ${error.message}`);
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
