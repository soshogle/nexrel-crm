/**
 * Outreach helper for AI employees - send SMS, email, initiate calls
 * Used by run-industry-employee and run-re-employee for Phase 2 outreach
 */

import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService } from '@/lib/dal';
import { ensureIndustryAgentProvisioned } from '@/lib/ai-employee-lazy-provision';
import { Industry } from '@prisma/client';
import { elevenLabsService } from '@/lib/elevenlabs';

export interface OutreachResult {
  channel: 'sms' | 'email' | 'call';
  success: boolean;
  leadId?: string;
  error?: string;
}

/** Send SMS to a phone number directly (e.g. from appointment). Returns success/failure. */
export async function sendSMSToPhone(
  phone: string,
  message: string
): Promise<OutreachResult> {
  try {
    await sendSMS(phone, message);
    return { channel: 'sms', success: true };
  } catch (e: any) {
    return { channel: 'sms', success: false, error: e?.message };
  }
}

/** Send SMS to a lead. Returns success/failure. */
export async function sendSMSToLead(
  userId: string,
  leadId: string,
  message: string
): Promise<OutreachResult> {
  try {
    const ctx = createDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead?.phone) {
      return { channel: 'sms', success: false, leadId, error: 'No phone number' };
    }
    const personalized = message
      .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
      .replace(/\{businessName\}/g, lead.businessName || 'there')
      .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');
    await sendSMS(lead.phone, personalized);
    return { channel: 'sms', success: true, leadId };
  } catch (e: any) {
    return { channel: 'sms', success: false, leadId, error: e?.message };
  }
}

/** Send email to an email address directly (e.g. from invoice). Returns success/failure. */
export async function sendEmailToAddress(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<OutreachResult> {
  try {
    const emailService = new EmailService();
    const sent = await emailService.sendEmail({
      to,
      subject,
      html: body.replace(/\n/g, '<br>'),
      text: body,
      userId,
    });
    return { channel: 'email', success: !!sent };
  } catch (e: any) {
    return { channel: 'email', success: false, error: e?.message };
  }
}

/** Send email to a lead. Returns success/failure. */
export async function sendEmailToLead(
  userId: string,
  leadId: string,
  subject: string,
  body: string
): Promise<OutreachResult> {
  try {
    const ctx = createDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead?.email) {
      return { channel: 'email', success: false, leadId, error: 'No email' };
    }
    const personalizedSubject = subject
      .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
      .replace(/\{businessName\}/g, lead.businessName || 'there');
    const personalizedBody = body
      .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
      .replace(/\{businessName\}/g, lead.businessName || 'there')
      .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');
    const emailService = new EmailService();
    const sent = await emailService.sendEmail({
      to: lead.email,
      subject: personalizedSubject,
      html: personalizedBody.replace(/\n/g, '<br>'),
      text: personalizedBody,
      userId,
    });
    return { channel: 'email', success: !!sent, leadId };
  } catch (e: any) {
    return { channel: 'email', success: false, leadId, error: e?.message };
  }
}

/** Initiate voice call to a lead via ElevenLabs. Returns success/failure. */
export async function initiateCallToLead(
  userId: string,
  leadId: string,
  industry: Industry,
  employeeType: string,
  purpose?: string
): Promise<OutreachResult> {
  try {
    const ctx = createDalContext(userId);
    const lead = await leadService.findUnique(ctx, leadId);
    if (!lead?.phone) {
      return { channel: 'call', success: false, leadId, error: 'No phone number' };
    }
    const agent = await ensureIndustryAgentProvisioned(userId, industry, employeeType);
    if (!agent?.elevenLabsAgentId) {
      return { channel: 'call', success: false, leadId, error: 'No voice agent provisioned' };
    }
    await elevenLabsService.initiatePhoneCall(agent.elevenLabsAgentId, lead.phone, undefined);
    return { channel: 'call', success: true, leadId };
  } catch (e: any) {
    return { channel: 'call', success: false, leadId, error: e?.message };
  }
}
