/**
 * Generic Multi-Industry HITL Notification Service
 * Sends HITL (Human-In-The-Loop) notifications via dashboard, SMS, and email
 */

import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';

interface HITLNotificationData {
  userId: string;
  executionId: string;
  taskName: string;
  contactName?: string;
  industry: Industry;
  message: string;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

/**
 * Create HITL notification and send alerts
 */
export async function createHITLNotification(data: HITLNotificationData): Promise<void> {
  // Create notification record
  const notification = await prisma.hITLNotification.create({
    data: {
      userId: data.userId,
      executionId: data.executionId,
      taskName: data.taskName,
      contactName: data.contactName,
      message: data.message,
      urgency: data.urgency || 'NORMAL',
    },
  });

  // Get user contact info
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { email: true, phone: true },
  });

  // Send SMS if user has phone
  if (user?.phone) {
    try {
      await sendSMSNotification(user.phone, data);
      await prisma.hITLNotification.update({
        where: { id: notification.id },
        data: { smsSent: true },
      });
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
    }
  }

  // Send email if user has email
  if (user?.email) {
    try {
      await sendEmailNotification(user.email, data);
      await prisma.hITLNotification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }
}

/**
 * Send SMS notification via Twilio
 */
async function sendSMSNotification(phone: string, data: HITLNotificationData): Promise<void> {
  try {
    const { sendSMS } = await import('@/lib/twilio');
    
    // Get industry-specific workflow URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://app.nexrel.com';
    const workflowUrl = `${baseUrl}/dashboard/ai-employees?tab=workflows`;
    
    const message = `⚠️ HITL Approval Required: ${data.taskName}\n\n${data.message}\n\nView: ${workflowUrl}`;
    
    await sendSMS(phone, message);
    console.log(`[HITL SMS] Notification sent to ${phone}`);
  } catch (error: any) {
    console.error(`[HITL SMS] Failed to send notification to ${phone}:`, error.message);
    // Don't throw - SMS failure shouldn't block notification creation
  }
}

/**
 * Send email notification via SendGrid
 */
async function sendEmailNotification(email: string, data: HITLNotificationData): Promise<void> {
  try {
    const { EmailService } = await import('@/lib/email-service');
    const emailService = new EmailService();
    
    // Get industry-specific workflow URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://app.nexrel.com';
    const workflowUrl = `${baseUrl}/dashboard/ai-employees?tab=workflows`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">⚠️ Human Approval Required</h2>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 2px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>Task:</strong> ${data.taskName}
          </p>
          ${data.contactName ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>Contact:</strong> ${data.contactName}</p>` : ''}
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>Message:</strong> ${data.message}
          </p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${workflowUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View & Approve
            </a>
          </div>
        </div>
      </div>
    `;
    
    await emailService.sendEmail({
      to: email,
      subject: `⚠️ HITL Approval Required: ${data.taskName}`,
      html,
      text: `HITL Approval Required\n\nTask: ${data.taskName}\nContact: ${data.contactName || 'N/A'}\nMessage: ${data.message}\n\nView & Approve: ${workflowUrl}`,
    });
    
    console.log(`[HITL Email] Notification sent to ${email}`);
  } catch (error: any) {
    console.error(`[HITL Email] Failed to send notification to ${email}:`, error.message);
    // Don't throw - email failure shouldn't block notification creation
  }
}

/**
 * Get pending HITL notifications for a user
 */
export async function getPendingHITLNotifications(userId: string) {
  return prisma.hITLNotification.findMany({
    where: {
      userId,
      isActioned: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
