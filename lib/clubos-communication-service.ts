
/**
 * ClubOS Communication Service
 * Handles email and SMS notifications for sports club operations
 */

import { sendSMS } from '@/lib/twilio';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';

interface RegistrationConfirmationData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  programName: string;
  divisionName?: string;
  totalAmount: number;
  status: string;
}

interface PaymentConfirmationData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  programName: string;
  amount: number;
  receiptUrl?: string;
  balanceRemaining: number;
}

interface ScheduleReminderData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  eventType: string;
  eventTitle: string;
  startTime: Date;
  venueName: string;
  venueAddress?: string;
}

interface BalanceReminderData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  programName: string;
  balanceDue: number;
  dueDate?: Date;
}

export class ClubOSCommunicationService {
  /**
   * Send registration confirmation
   */
  async sendRegistrationConfirmation(data: RegistrationConfirmationData): Promise<void> {
    try {
      // Send email
      await this.sendRegistrationEmail(data);
      
      // Send SMS
      await this.sendRegistrationSMS(data);
      
      console.log('✅ Registration confirmation sent to:', data.parentEmail);
    } catch (error: any) {
      console.error('❌ Error sending registration confirmation:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(data: PaymentConfirmationData): Promise<void> {
    try {
      // Send email
      await this.sendPaymentEmail(data);
      
      // Send SMS
      await this.sendPaymentSMS(data);
      
      console.log('✅ Payment confirmation sent to:', data.parentEmail);
    } catch (error: any) {
      console.error('❌ Error sending payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send schedule reminder (24 hours before event)
   */
  async sendScheduleReminder(data: ScheduleReminderData): Promise<void> {
    try {
      // Send email
      await this.sendScheduleEmail(data);
      
      // Send SMS
      await this.sendScheduleSMS(data);
      
      console.log('✅ Schedule reminder sent to:', data.parentEmail);
    } catch (error: any) {
      console.error('❌ Error sending schedule reminder:', error);
      throw error;
    }
  }

  /**
   * Send balance reminder
   */
  async sendBalanceReminder(data: BalanceReminderData): Promise<void> {
    try {
      // Send email
      await this.sendBalanceEmail(data);
      
      // Send SMS
      await this.sendBalanceSMS(data);
      
      console.log('✅ Balance reminder sent to:', data.parentEmail);
    } catch (error: any) {
      console.error('❌ Error sending balance reminder:', error);
      throw error;
    }
  }

  /**
   * Send registration confirmation email
   */
  private async sendRegistrationEmail(data: RegistrationConfirmationData): Promise<void> {
    const html = this.generateRegistrationEmailHTML(data);
    const subject = `Registration Confirmed: ${data.childName} - ${data.programName}`;
    
    // Log email (In production, use SendGrid, AWS SES, or similar)
    console.log('📧 [EMAIL] Registration Confirmation');
    console.log('To:', data.parentEmail);
    console.log('Subject:', subject);
    console.log('Preview:', `Registration for ${data.childName} has been ${data.status.toLowerCase()}`);
    
    // TODO: Implement actual email sending
    // await this.sendEmail(data.parentEmail, subject, html);
  }

  /**
   * Send registration confirmation SMS
   */
  private async sendRegistrationSMS(data: RegistrationConfirmationData): Promise<void> {
    const message = `Hi ${data.parentName}! ${data.childName}'s registration for ${data.programName} has been ${data.status.toLowerCase()}. Total: $${(data.totalAmount / 100).toFixed(2)}. Reply STOP to unsubscribe.`;
    
    try {
      await sendSMS(data.parentPhone, message);
      console.log('📱 [SMS] Registration confirmation sent to:', data.parentPhone);
    } catch (error: any) {
      console.error('❌ Failed to send registration SMS:', error);
      // Don't throw - SMS is optional
    }
  }

  /**
   * Send payment confirmation email
   */
  private async sendPaymentEmail(data: PaymentConfirmationData): Promise<void> {
    const html = this.generatePaymentEmailHTML(data);
    const subject = `Payment Received: ${data.childName} - ${data.programName}`;
    
    console.log('📧 [EMAIL] Payment Confirmation');
    console.log('To:', data.parentEmail);
    console.log('Subject:', subject);
    console.log('Preview:', `Payment of $${(data.amount / 100).toFixed(2)} received`);
    
    // TODO: Implement actual email sending
    // await this.sendEmail(data.parentEmail, subject, html);
  }

  /**
   * Send payment confirmation SMS
   */
  private async sendPaymentSMS(data: PaymentConfirmationData): Promise<void> {
    const balanceText = data.balanceRemaining > 0 
      ? ` Balance remaining: $${(data.balanceRemaining / 100).toFixed(2)}.` 
      : ' Fully paid!';
    
    const message = `Payment received! $${(data.amount / 100).toFixed(2)} for ${data.childName} - ${data.programName}.${balanceText} Reply STOP to unsubscribe.`;
    
    try {
      await sendSMS(data.parentPhone, message);
      console.log('📱 [SMS] Payment confirmation sent to:', data.parentPhone);
    } catch (error: any) {
      console.error('❌ Failed to send payment SMS:', error);
    }
  }

  /**
   * Send schedule reminder email
   */
  private async sendScheduleEmail(data: ScheduleReminderData): Promise<void> {
    const html = this.generateScheduleEmailHTML(data);
    const subject = `Reminder: ${data.eventType} Tomorrow - ${data.childName}`;
    
    console.log('📧 [EMAIL] Schedule Reminder');
    console.log('To:', data.parentEmail);
    console.log('Subject:', subject);
    console.log('Preview:', `${data.eventType} tomorrow at ${format(data.startTime, 'h:mm a')}`);
    
    // TODO: Implement actual email sending
    // await this.sendEmail(data.parentEmail, subject, html);
  }

  /**
   * Send schedule reminder SMS
   */
  private async sendScheduleSMS(data: ScheduleReminderData): Promise<void> {
    const timeText = format(data.startTime, 'h:mm a');
    const dateText = format(data.startTime, 'MMM d');
    const message = `Reminder: ${data.childName}'s ${data.eventType.toLowerCase()} tomorrow (${dateText}) at ${timeText} - ${data.venueName}. Reply STOP to unsubscribe.`;
    
    try {
      await sendSMS(data.parentPhone, message);
      console.log('📱 [SMS] Schedule reminder sent to:', data.parentPhone);
    } catch (error: any) {
      console.error('❌ Failed to send schedule SMS:', error);
    }
  }

  /**
   * Send balance reminder email
   */
  private async sendBalanceEmail(data: BalanceReminderData): Promise<void> {
    const html = this.generateBalanceEmailHTML(data);
    const subject = `Balance Due: ${data.childName} - ${data.programName}`;
    
    console.log('📧 [EMAIL] Balance Reminder');
    console.log('To:', data.parentEmail);
    console.log('Subject:', subject);
    console.log('Preview:', `Outstanding balance: $${(data.balanceDue / 100).toFixed(2)}`);
    
    // TODO: Implement actual email sending
    // await this.sendEmail(data.parentEmail, subject, html);
  }

  /**
   * Send balance reminder SMS
   */
  private async sendBalanceSMS(data: BalanceReminderData): Promise<void> {
    const dueText = data.dueDate ? ` due by ${format(data.dueDate, 'MMM d')}` : '';
    const message = `Hi ${data.parentName}, friendly reminder: ${data.childName} has a balance of $${(data.balanceDue / 100).toFixed(2)}${dueText} for ${data.programName}. Reply STOP to unsubscribe.`;
    
    try {
      await sendSMS(data.parentPhone, message);
      console.log('📱 [SMS] Balance reminder sent to:', data.parentPhone);
    } catch (error: any) {
      console.error('❌ Failed to send balance SMS:', error);
    }
  }

  /**
   * Generate registration email HTML
   */
  private generateRegistrationEmailHTML(data: RegistrationConfirmationData): string {
    const statusColor = data.status === 'APPROVED' ? '#10b981' : data.status === 'PENDING' ? '#f59e0b' : '#667eea';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .card { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .detail-row { margin: 15px 0; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { color: #111827; margin-top: 5px; font-size: 16px; }
    .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 14px; background: #f9fafb; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🏆 Registration Confirmed!</h1>
      <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Thank you for registering with us</p>
    </div>
    
    <div class="content">
      <div class="card">
        <div style="text-align: center; margin-bottom: 20px;">
          <span class="status-badge">${data.status}</span>
        </div>
        
        <div class="detail-row">
          <div class="label">Player</div>
          <div class="value">${data.childName}</div>
        </div>
        
        <div class="detail-row">
          <div class="label">Program</div>
          <div class="value">${data.programName}</div>
        </div>
        
        ${data.divisionName ? `
        <div class="detail-row">
          <div class="label">Division</div>
          <div class="value">${data.divisionName}</div>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="label">Total Fee</div>
          <div class="value">$${(data.totalAmount / 100).toFixed(2)}</div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXTAUTH_URL || 'https://go-high-or-show-goog-8dv76n.abacusai.app'}/dashboard/clubos/payments" class="button">
          Make Payment
        </a>
      </div>
      
      <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #4338ca; font-size: 16px;">📌 What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #4338ca;">
          <li>Complete payment to activate registration</li>
          <li>Watch for schedule updates via email/SMS</li>
          <li>Check your dashboard for upcoming events</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">If you have any questions, please don't hesitate to contact us.</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
        This email was sent to ${data.parentEmail}
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate payment email HTML
   */
  private generatePaymentEmailHTML(data: PaymentConfirmationData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .card { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .amount { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
    .detail-row { margin: 15px 0; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { color: #111827; margin-top: 5px; font-size: 16px; }
    .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 14px; background: #f9fafb; }
    .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">✅ Payment Received!</h1>
      <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Thank you for your payment</p>
    </div>
    
    <div class="content">
      <div class="card">
        <div class="amount">$${(data.amount / 100).toFixed(2)}</div>
        
        <div class="detail-row">
          <div class="label">Player</div>
          <div class="value">${data.childName}</div>
        </div>
        
        <div class="detail-row">
          <div class="label">Program</div>
          <div class="value">${data.programName}</div>
        </div>
        
        ${data.balanceRemaining > 0 ? `
        <div class="detail-row">
          <div class="label">Balance Remaining</div>
          <div class="value" style="color: #f59e0b; font-weight: bold;">$${(data.balanceRemaining / 100).toFixed(2)}</div>
        </div>
        ` : `
        <div class="detail-row">
          <div class="label">Status</div>
          <div class="value" style="color: #10b981; font-weight: bold;">✓ Fully Paid</div>
        </div>
        `}
        
        ${data.receiptUrl ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="${data.receiptUrl}" class="button" target="_blank">
            Download Receipt
          </a>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">Your payment has been processed successfully.</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
        This email was sent to ${data.parentEmail}
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate schedule email HTML
   */
  private generateScheduleEmailHTML(data: ScheduleReminderData): string {
    const eventColor = data.eventType === 'GAME' ? '#3b82f6' : '#10b981';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, ${eventColor} 0%, ${eventColor} 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .card { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .event-time { font-size: 32px; font-weight: bold; color: ${eventColor}; text-align: center; margin: 20px 0; }
    .detail-row { margin: 15px 0; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { color: #111827; margin-top: 5px; font-size: 16px; }
    .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 14px; background: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">📅 Event Reminder</h1>
      <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">${data.eventType} Tomorrow</p>
    </div>
    
    <div class="content">
      <div class="card">
        <div class="event-time">${format(data.startTime, 'h:mm a')}</div>
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 20px;">
          ${format(data.startTime, 'EEEE, MMMM d, yyyy')}
        </div>
        
        <div class="detail-row">
          <div class="label">Player</div>
          <div class="value">${data.childName}</div>
        </div>
        
        <div class="detail-row">
          <div class="label">Event</div>
          <div class="value">${data.eventTitle}</div>
        </div>
        
        <div class="detail-row">
          <div class="label">Location</div>
          <div class="value">${data.venueName}</div>
          ${data.venueAddress ? `<div style="color: #6b7280; font-size: 14px; margin-top: 5px;">${data.venueAddress}</div>` : ''}
        </div>
      </div>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-weight: bold;">⏰ Please arrive 15 minutes early</p>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">See you tomorrow!</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
        This email was sent to ${data.parentEmail}
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate balance reminder email HTML
   */
  private generateBalanceEmailHTML(data: BalanceReminderData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; background: #f9fafb; }
    .card { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .amount-due { font-size: 36px; font-weight: bold; color: #f59e0b; text-align: center; margin: 20px 0; }
    .detail-row { margin: 15px 0; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { color: #111827; margin-top: 5px; font-size: 16px; }
    .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 14px; background: #f9fafb; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">💰 Balance Reminder</h1>
      <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Payment reminder</p>
    </div>
    
    <div class="content">
      <div class="card">
        <div class="amount-due">$${(data.balanceDue / 100).toFixed(2)}</div>
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 20px;">
          Outstanding Balance
        </div>
        
        <div class="detail-row">
          <div class="label">Player</div>
          <div class="value">${data.childName}</div>
        </div>
        
        <div class="detail-row">
          <div class="label">Program</div>
          <div class="value">${data.programName}</div>
        </div>
        
        ${data.dueDate ? `
        <div class="detail-row">
          <div class="label">Due Date</div>
          <div class="value">${format(data.dueDate, 'MMMM d, yyyy')}</div>
        </div>
        ` : ''}
        
        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || 'https://go-high-or-show-goog-8dv76n.abacusai.app'}/dashboard/clubos/payments" class="button">
            Make Payment Now
          </a>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">Thank you for your prompt attention to this matter.</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
        This email was sent to ${data.parentEmail}
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

export const clubOSCommunicationService = new ClubOSCommunicationService();
