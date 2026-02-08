/**
 * Email helper functions
 * Wrapper around email-service for workflow actions
 */

import { emailService } from '@/lib/email-service';

export interface EmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  userId?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await emailService.sendEmail({
      to: params.to,
      subject: params.subject,
      html: params.html || params.text || '',
      text: params.text,
      userId: params.userId,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
