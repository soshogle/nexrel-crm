/**
 * Twilio Failover Notification Service
 * Sends notifications for failover events
 */

import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

interface FailoverNotificationData {
  eventId: string;
  triggerType: 'CRITICAL' | 'DEGRADED' | 'MANUAL';
  fromAccountName: string;
  toAccountName: string;
  affectedAgents: number;
  status: string;
  reason?: string;
}

export class TwilioFailoverNotifications {
  /**
   * Get admin email addresses
   */
  private async getAdminEmails(): Promise<string[]> {
    const admins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
      },
      select: {
        email: true,
      },
    });

    return admins.map((admin) => admin.email);
  }

  /**
   * Send failover notification
   */
  async sendFailoverNotification(data: FailoverNotificationData) {
    const adminEmails = await this.getAdminEmails();

    if (adminEmails.length === 0) {
      console.warn('No admin emails found for failover notification');
      return;
    }

    const subject = `🚨 Twilio Failover ${data.triggerType === 'CRITICAL' ? 'CRITICAL' : 'Alert'}: ${data.fromAccountName} → ${data.toAccountName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${data.triggerType === 'CRITICAL' ? '#dc2626' : '#f59e0b'};">
          ${data.triggerType === 'CRITICAL' ? '🚨 CRITICAL FAILOVER' : '⚠️ Failover Alert'}
        </h2>
        
        <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event ID:</strong> ${data.eventId}</p>
          <p><strong>Trigger Type:</strong> ${data.triggerType}</p>
          <p><strong>From Account:</strong> ${data.fromAccountName}</p>
          <p><strong>To Account:</strong> ${data.toAccountName}</p>
          <p><strong>Affected Agents:</strong> ${data.affectedAgents}</p>
          <p><strong>Status:</strong> ${data.status}</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        </div>

        <p>
          ${data.triggerType === 'CRITICAL' 
            ? 'This failover was executed immediately due to a critical failure (account hacked, suspended, etc.).'
            : 'This failover requires your approval. Please review the SuperAdmin dashboard.'}
        </p>

        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/platform-admin" 
             style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
            View in Dashboard
          </a>
        </p>
      </div>
    `;

    // Send to all admins
    for (const email of adminEmails) {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
        });
        console.log(`✅ Failover notification sent to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to ${email}:`, error);
      }
    }
  }

  /**
   * Send failover completion notification
   */
  async sendFailoverCompletionNotification(data: FailoverNotificationData) {
    const adminEmails = await this.getAdminEmails();

    const subject = `✅ Twilio Failover Completed: ${data.affectedAgents} agents switched`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Failover Completed Successfully</h2>
        
        <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event ID:</strong> ${data.eventId}</p>
          <p><strong>From Account:</strong> ${data.fromAccountName}</p>
          <p><strong>To Account:</strong> ${data.toAccountName}</p>
          <p><strong>Agents Switched:</strong> ${data.affectedAgents}</p>
        </div>

        <p>All agents have been successfully switched to the backup account.</p>

        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/platform-admin" 
             style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
            View in Dashboard
          </a>
        </p>
      </div>
    `;

    for (const email of adminEmails) {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
        });
      } catch (error) {
        console.error(`Failed to send completion notification to ${email}:`, error);
      }
    }
  }
}

export const twilioFailoverNotifications = new TwilioFailoverNotifications();
