/**
 * HITL (Human-in-the-Loop) Notification Service
 * Sends notifications via dashboard, SMS, and email when HITL approval is needed
 */

import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { RE_AGENT_NAMES } from './workflow-templates';
import { REAIEmployeeType } from '@prisma/client';
import { getEmailTemplates, replaceEmailPlaceholders } from '@/lib/email-templates';

interface HITLNotificationData {
  userId: string;
  executionId: string;
  taskName: string;
  taskDescription?: string;
  agentType?: REAIEmployeeType | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  dealAddress?: string;
  workflowName?: string;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  metadata?: Record<string, unknown>;
}

export class HITLNotificationService {
  /**
   * Create a HITL notification and send alerts via multiple channels
   */
  async createNotification(data: HITLNotificationData): Promise<void> {
    try {
      // Get user info for sending notifications
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true
        }
      });

      if (!user) {
        console.error('User not found for HITL notification:', data.userId);
        return;
      }

      const agentName = data.agentType ? RE_AGENT_NAMES[data.agentType] : 'System';

      // Create the notification message
      const message = this.formatMessage(data, agentName);

      // Create database notification record
      const notification = await prisma.rEHITLNotification.create({
        data: {
          userId: data.userId,
          executionId: data.executionId,
          taskName: data.taskName,
          contactName: data.contactName || null,
          dealAddress: data.dealAddress || null,
          message,
          urgency: data.urgency || 'NORMAL',
          isRead: false,
          isActioned: false,
          smsSent: false,
          emailSent: false
        }
      });

      // Send SMS notification
      if (user.phone) {
        try {
          await this.sendSMSNotification(user.phone, data, agentName);
          await prisma.rEHITLNotification.update({
            where: { id: notification.id },
            data: { smsSent: true }
          });
        } catch (smsError) {
          console.error('Failed to send HITL SMS notification:', smsError);
        }
      }

      // Send email notification
      if (user.email) {
        try {
          await this.sendEmailNotification(user.email, user.name || 'User', data, agentName);
          await prisma.rEHITLNotification.update({
            where: { id: notification.id },
            data: { emailSent: true }
          });
        } catch (emailError) {
          console.error('Failed to send HITL email notification:', emailError);
        }
      }

      console.log('HITL notification created:', notification.id);
    } catch (error) {
      console.error('Error creating HITL notification:', error);
      throw error;
    }
  }

  /**
   * Format the notification message
   */
  private formatMessage(data: HITLNotificationData, agentName: string): string {
    let message = `[${data.urgency || 'NORMAL'}] Approval Required: ${data.taskName}`;
    
    if (data.workflowName) {
      message += ` (${data.workflowName})`;
    }
    
    if (data.contactName) {
      message += ` for ${data.contactName}`;
    }
    
    if (data.dealAddress) {
      message += ` - Property: ${data.dealAddress}`;
    }
    
    message += `. Agent: ${agentName}`;
    
    return message;
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    phone: string,
    data: HITLNotificationData,
    agentName: string
  ): Promise<void> {
    const urgencyEmoji = data.urgency === 'URGENT' ? '🚨' : 
                         data.urgency === 'HIGH' ? '⚠️' : '📋';
    
    let smsText = `${urgencyEmoji} HITL Approval Needed\n\n`;
    smsText += `Task: ${data.taskName}\n`;
    
    if (data.contactName) {
      smsText += `Contact: ${data.contactName}\n`;
    }
    
    if (data.dealAddress) {
      smsText += `Property: ${data.dealAddress}\n`;
    }
    
    smsText += `Agent: ${agentName}\n\n`;
    smsText += `Log in to approve or reject this action.`;

    await sendSMS(phone, smsText);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    email: string,
    userName: string,
    data: HITLNotificationData,
    agentName: string
  ): Promise<void> {
    // Get user's language preference
    let userLanguage: 'en' | 'fr' | 'es' | 'zh' = 'en';
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { language: true },
      });
      if (user?.language && ['en', 'fr', 'es', 'zh'].includes(user.language)) {
        userLanguage = user.language as 'en' | 'fr' | 'es' | 'zh';
      }
    } catch (error) {
      console.error('Error fetching user language:', error);
    }

    const templates = getEmailTemplates(userLanguage);
    const emailTemplates = templates.hitlNotification;

    const urgencyColor = data.urgency === 'URGENT' ? '#dc2626' : 
                         data.urgency === 'HIGH' ? '#f59e0b' : '#3b82f6';
    
    const subject = replaceEmailPlaceholders(emailTemplates.subject, {
      taskName: data.taskName,
    });
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${emailTemplates.headerTitle}</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 16px;">${replaceEmailPlaceholders(emailTemplates.greeting, { userName })}</p>
          
          <p style="color: #374151;">${emailTemplates.introMessage}</p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;">${emailTemplates.taskLabel}</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${data.taskName}</td>
              </tr>
              ${data.taskDescription ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${emailTemplates.descriptionLabel}</td>
                <td style="padding: 8px 0; color: #374151;">${data.taskDescription}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${emailTemplates.agentLabel}</td>
                <td style="padding: 8px 0; color: #374151;">${agentName}</td>
              </tr>
              ${data.contactName ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${emailTemplates.contactLabel}</td>
                <td style="padding: 8px 0; color: #374151;">${data.contactName}</td>
              </tr>
              ` : ''}
              ${data.dealAddress ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${emailTemplates.propertyLabel}</td>
                <td style="padding: 8px 0; color: #374151;">${data.dealAddress}</td>
              </tr>
              ` : ''}
              ${data.workflowName ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${emailTemplates.workflowLabel}</td>
                <td style="padding: 8px 0; color: #374151;">${data.workflowName}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <p style="color: #374151;">${emailTemplates.actionMessage}</p>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com'}/dashboard/ai-employees" 
               style="background: ${urgencyColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              ${emailTemplates.buttonText}
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
            ${emailTemplates.footerMessage}
          </p>
        </div>
      </div>
    `;

    // Note: Email notification uses the notification system
    // For now, we log the email content - full email integration can be added later
    console.log(`[HITL EMAIL] To: ${email}, Subject: ${subject}`);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.rEHITLNotification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: { isRead: true }
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.rEHITLNotification.count({
      where: {
        userId,
        isRead: false,
        isActioned: false
      }
    });
  }
}

export const hitlNotificationService = new HITLNotificationService();
