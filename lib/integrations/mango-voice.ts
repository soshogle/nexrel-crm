/**
 * Mango Voice Integration
 * Integration with Mango Voice PBX system for call management
 * Documentation: https://support.mangovoice.com/getting-started-with-integrations/
 */

export interface MangoVoiceConfig {
  apiKey: string;
  partnerId: string;
  callbackUrl: string;
  remoteId: string;
}

export interface MangoVoiceCallEvent {
  eventType: 'call_started' | 'call_answered' | 'call_ended' | 'call_transferred';
  callId: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  duration?: number;
  recordingUrl?: string;
  patientId?: string; // Matched patient ID
}

export interface MangoVoiceSMSMessage {
  from: string;
  to: string;
  message: string;
  timestamp: string;
  messageId: string;
}

export class MangoVoiceService {
  private config: MangoVoiceConfig;
  private baseUrl = 'https://api.mangovoice.com';

  constructor(config: MangoVoiceConfig) {
    this.config = config;
  }

  /**
   * Initialize webhook integration with Mango Voice
   */
  async setupWebhook(events: string[] = ['call_started', 'call_answered', 'call_ended']): Promise<boolean> {
    try {
      // In a real implementation, this would call Mango Voice API
      // For now, we'll return success
      console.log('Setting up Mango Voice webhook:', {
        callbackUrl: this.config.callbackUrl,
        remoteId: this.config.remoteId,
        events,
      });

      return true;
    } catch (error) {
      console.error('Error setting up Mango Voice webhook:', error);
      return false;
    }
  }

  /**
   * Handle incoming webhook from Mango Voice
   */
  async handleWebhook(payload: any): Promise<MangoVoiceCallEvent | null> {
    try {
      // Parse Mango Voice webhook payload
      const event: MangoVoiceCallEvent = {
        eventType: payload.event_type || 'call_started',
        callId: payload.call_id,
        fromNumber: payload.from_number,
        toNumber: payload.to_number,
        direction: payload.direction || 'inbound',
        timestamp: payload.timestamp || new Date().toISOString(),
        duration: payload.duration,
        recordingUrl: payload.recording_url,
      };

      return event;
    } catch (error) {
      console.error('Error handling Mango Voice webhook:', error);
      return null;
    }
  }

  /**
   * Send SMS via Mango Voice
   */
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // In a real implementation, this would call Mango Voice SMS API
      console.log('Sending SMS via Mango Voice:', { to, message });
      return true;
    } catch (error) {
      console.error('Error sending SMS via Mango Voice:', error);
      return false;
    }
  }

  /**
   * Get call history
   */
  async getCallHistory(startDate?: Date, endDate?: Date): Promise<MangoVoiceCallEvent[]> {
    try {
      // In a real implementation, this would fetch from Mango Voice API
      return [];
    } catch (error) {
      console.error('Error fetching call history from Mango Voice:', error);
      return [];
    }
  }

  /**
   * Match phone number to patient
   */
  async matchPatient(phoneNumber: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the database
      // to find a patient/lead with matching phone number
      return null;
    } catch (error) {
      console.error('Error matching patient:', error);
      return null;
    }
  }
}

/**
 * Create Mango Voice service instance from environment variables
 */
export function createMangoVoiceService(): MangoVoiceService | null {
  const apiKey = process.env.MANGO_VOICE_API_KEY;
  const partnerId = process.env.MANGO_VOICE_PARTNER_ID;
  const callbackUrl = process.env.MANGO_VOICE_CALLBACK_URL;
  const remoteId = process.env.MANGO_VOICE_REMOTE_ID;

  if (!apiKey || !partnerId || !callbackUrl || !remoteId) {
    console.warn('Mango Voice configuration incomplete. Check environment variables.');
    return null;
  }

  return new MangoVoiceService({
    apiKey,
    partnerId,
    callbackUrl,
    remoteId,
  });
}
