/**
 * SMS helper functions
 * Wrapper around Twilio for workflow actions
 */

import { sendSMS as twilioSendSMS } from '@/lib/twilio';

export interface SMSParams {
  to: string;
  message: string;
}

export async function sendSMS(params: SMSParams): Promise<boolean> {
  try {
    await twilioSendSMS(params.to, params.message);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}
