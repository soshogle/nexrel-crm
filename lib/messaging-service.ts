/**
 * Shared messaging service for AI chat and voice agents
 * Send SMS and email to single contacts or bulk by criteria
 */

import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email-service';

export interface SendSMSParams {
  userId: string;
  contactName: string;
  message: string;
  phoneNumber?: string;
  leadId?: string;
}

export interface SendEmailParams {
  userId: string;
  contactName: string;
  subject: string;
  body: string;
  email?: string;
  leadId?: string;
}

export interface BulkMessagingParams {
  userId: string;
  purpose: string;
  message: string;
  criteria?: {
    period?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days';
    status?: string;
    limit?: number;
  };
}

/**
 * Send SMS using user's Twilio config
 */
async function sendSMSWithConfig(
  to: string,
  message: string,
  config: { accountSid: string; authToken: string; phoneNumber: string }
): Promise<{ sid: string; status: string }> {
  const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: config.phoneNumber,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send SMS');
  }

  const data = await response.json();
  return { sid: data.sid, status: data.status };
}

/**
 * Send SMS to a single contact
 */
export async function sendSMS(params: SendSMSParams): Promise<{ success: boolean; message?: string; error?: string }> {
  const { userId, contactName, message, phoneNumber, leadId } = params;

  let finalPhone = phoneNumber;
  let resolvedLeadId = leadId;

  if (!finalPhone) {
    const lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: 'insensitive' } },
          { businessName: { contains: contactName, mode: 'insensitive' } },
          ...(leadId ? [{ id: leadId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lead) {
      finalPhone = lead.phone || null;
      resolvedLeadId = lead.id;
    } else {
      return {
        success: false,
        error: `Contact "${contactName}" not found. Please provide a phone number or ensure the contact exists.`,
      };
    }
  }

  if (!finalPhone) {
    return {
      success: false,
      error: `No phone number found for "${contactName}". Please provide a phone number.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { smsProviderConfig: true, smsProviderConfigured: true },
  });

  if (!user?.smsProviderConfigured || !user.smsProviderConfig) {
    return {
      success: false,
      error: 'SMS provider not configured. Please configure Twilio in Settings.',
    };
  }

  try {
    const config = JSON.parse(user.smsProviderConfig);
    const result = await sendSMSWithConfig(finalPhone, message, {
      accountSid: config.accountSid,
      authToken: config.authToken,
      phoneNumber: config.phoneNumber,
    });
    return {
      success: true,
      message: `SMS sent to ${contactName}`,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || 'Failed to send SMS',
    };
  }
}

/**
 * Send email to a single contact
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; message?: string; error?: string }> {
  const { userId, contactName, subject, body, email, leadId } = params;

  let finalEmail = email;
  let resolvedLeadId = leadId;

  if (!finalEmail) {
    const lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: 'insensitive' } },
          { businessName: { contains: contactName, mode: 'insensitive' } },
          ...(leadId ? [{ id: leadId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lead) {
      finalEmail = lead.email || null;
      resolvedLeadId = lead.id;
    } else {
      return {
        success: false,
        error: `Contact "${contactName}" not found. Please provide an email or ensure the contact exists.`,
      };
    }
  }

  if (!finalEmail) {
    return {
      success: false,
      error: `No email found for "${contactName}". Please provide an email address.`,
    };
  }

  const htmlBody = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>${body.replace(/\n/g, '<br>')}</p></div>`;

  try {
    const emailService = new EmailService();
    const sent = await emailService.sendEmail({
      to: finalEmail,
      subject,
      html: htmlBody,
      text: body,
      userId,
    });

    if (!sent) {
      return {
        success: false,
        error: 'Failed to send email. Please check your email configuration.',
      };
    }

    return {
      success: true,
      message: `Email sent to ${contactName}`,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || 'Failed to send email',
    };
  }
}

/**
 * Get leads by criteria (same logic as outbound-call-service)
 */
async function getLeadsByCriteria(
  userId: string,
  criteria: BulkMessagingParams['criteria'],
  requirePhone: boolean,
  requireEmail: boolean
) {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (criteria?.period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (criteria?.period === 'yesterday') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (criteria?.period === 'last_7_days') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (criteria?.period === 'last_30_days') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const where: any = {
    userId,
    ...(criteria?.status ? { status: criteria.status } : {}),
  };
  if (requirePhone) where.phone = { not: null };
  if (requireEmail) where.email = { not: null };
  if (startDate && endDate) where.createdAt = { gte: startDate, lt: endDate };
  else if (startDate) where.createdAt = { gte: startDate };

  return prisma.lead.findMany({
    where,
    take: criteria?.limit || 50,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      contactPerson: true,
      businessName: true,
      phone: true,
      email: true,
    },
  });
}

/**
 * Send SMS to multiple leads by criteria
 */
export async function sendSMSToLeads(params: BulkMessagingParams): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  sent: number;
  failed: number;
}> {
  const { userId, message, criteria } = params;

  const leads = await getLeadsByCriteria(userId, criteria, true, false);
  const withPhone = leads.filter((l) => l.phone);

  if (withPhone.length === 0) {
    return {
      success: false,
      error: 'No leads with phone numbers found',
      sent: 0,
      failed: 0,
    };
  }

  let sent = 0;
  let failed = 0;

  for (const lead of withPhone) {
    const personalized = message
      .replace(/\{name\}|\{contactPerson\}/gi, lead.contactPerson || 'there')
      .replace(/\{businessName\}|\{company\}/gi, lead.businessName || 'there')
      .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');

    const result = await sendSMS({
      userId,
      contactName: lead.contactPerson || lead.businessName || 'Contact',
      message: personalized,
      phoneNumber: lead.phone!,
      leadId: lead.id,
    });

    if (result.success) sent++;
    else failed++;
    await new Promise((r) => setTimeout(r, 100));
  }

  return {
    success: sent > 0,
    message: `Sent ${sent} SMS${failed > 0 ? `, ${failed} failed` : ''}`,
    sent,
    failed,
  };
}

/**
 * Send email to multiple leads by criteria
 */
export async function sendEmailToLeads(params: BulkMessagingParams & { subject: string }): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  sent: number;
  failed: number;
}> {
  const { userId, subject, criteria } = params;
  const message = params.message;

  const leads = await getLeadsByCriteria(userId, criteria, false, true);
  const withEmail = leads.filter((l) => l.email);

  if (withEmail.length === 0) {
    return {
      success: false,
      error: 'No leads with email addresses found',
      sent: 0,
      failed: 0,
    };
  }

  let sent = 0;
  let failed = 0;

  for (const lead of withEmail) {
    const personalized = message
      .replace(/\{name\}|\{contactPerson\}/gi, lead.contactPerson || 'there')
      .replace(/\{businessName\}|\{company\}/gi, lead.businessName || 'there')
      .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');

    const result = await sendEmail({
      userId,
      contactName: lead.contactPerson || lead.businessName || 'Contact',
      subject,
      body: personalized,
      email: lead.email!,
      leadId: lead.id,
    });

    if (result.success) sent++;
    else failed++;
    await new Promise((r) => setTimeout(r, 100));
  }

  return {
    success: sent > 0,
    message: `Sent ${sent} email${failed > 0 ? `, ${failed} failed` : ''}`,
    sent,
    failed,
  };
}
