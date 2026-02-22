/**
 * Stock Notification Service for Websites
 * Sends email/SMS notifications for stock alerts
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, websiteService } from '@/lib/dal';
import { EmailService } from '@/lib/email-service';
import { sendSMS } from '@/lib/twilio';

export interface StockAlertNotification {
  websiteId: string;
  websiteName: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'BACK_IN_STOCK';
  userId: string;
}

export class WebsiteStockNotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Send stock alert notification via email and/or SMS
   */
  async sendStockAlert(alert: StockAlertNotification): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let emailSent = false;
    let smsSent = false;

    try {
      const db = getCrmDb(createDalContext(alert.userId));
      // Get user preferences
      const user = await db.user.findUnique({
        where: { id: alert.userId },
        select: {
          email: true,
          phone: true,
          name: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get website stock settings
      const website = await db.website.findUnique({
        where: { id: alert.websiteId },
        include: { stockSettings: true },
      });

      // Prepare notification content
      const subject = this.getEmailSubject(alert);
      const emailBody = this.getEmailBody(alert, website?.name || alert.websiteName);
      const smsBody = this.getSMSBody(alert);

      // Send email
      if (user.email) {
        try {
          emailSent = await this.emailService.sendEmail({
            to: user.email,
            subject,
            html: emailBody,
            userId: alert.userId,
          });
        } catch (error: any) {
          errors.push(`Email error: ${error.message}`);
        }
      }

      // Send SMS if phone number available
      if (user.phone && (alert.status === 'OUT_OF_STOCK' || alert.status === 'CRITICAL')) {
        try {
          await sendSMS(user.phone, smsBody);
          smsSent = true;
        } catch (error: any) {
          errors.push(`SMS error: ${error.message}`);
        }
      }

      return { emailSent, smsSent, errors };
    } catch (error: any) {
      errors.push(error.message);
      return { emailSent, smsSent, errors };
    }
  }

  /**
   * Get email subject based on alert status
   */
  private getEmailSubject(alert: StockAlertNotification): string {
    switch (alert.status) {
      case 'OUT_OF_STOCK':
        return `🚨 Product Out of Stock: ${alert.productName}`;
      case 'LOW_STOCK':
        return `⚠️ Low Stock Alert: ${alert.productName}`;
      case 'BACK_IN_STOCK':
        return `✅ Product Back in Stock: ${alert.productName}`;
      default:
        return `Stock Alert: ${alert.productName}`;
    }
  }

  /**
   * Get email body HTML
   */
  private getEmailBody(alert: StockAlertNotification, websiteName: string): string {
    const statusEmoji = {
      OUT_OF_STOCK: '🚨',
      LOW_STOCK: '⚠️',
      BACK_IN_STOCK: '✅',
    }[alert.status];

    const statusText = {
      OUT_OF_STOCK: 'Out of Stock',
      LOW_STOCK: 'Low Stock',
      BACK_IN_STOCK: 'Back in Stock',
    }[alert.status];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .alert-box { background: ${alert.status === 'OUT_OF_STOCK' ? '#fee' : alert.status === 'LOW_STOCK' ? '#fff3cd' : '#d4edda'}; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .product-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusEmoji} Stock Alert</h1>
              <p><strong>Website:</strong> ${websiteName}</p>
            </div>
            
            <div class="alert-box">
              <h2>${statusText}</h2>
              <p><strong>Product:</strong> ${alert.productName}</p>
              <p><strong>SKU:</strong> ${alert.sku}</p>
              <p><strong>Current Stock:</strong> ${alert.currentStock} units</p>
              ${alert.status === 'LOW_STOCK' ? `<p><strong>Threshold:</strong> ${alert.threshold} units</p>` : ''}
            </div>

            <div class="product-info">
              <h3>Action Required</h3>
              ${alert.status === 'OUT_OF_STOCK' 
                ? '<p>This product is currently out of stock. Consider restocking or enabling pre-orders.</p>'
                : alert.status === 'LOW_STOCK'
                ? `<p>Stock is below the threshold of ${alert.threshold} units. Consider restocking soon.</p>`
                : '<p>Great news! This product is back in stock and available for purchase.</p>'
              }
            </div>

            <a href="${process.env.NEXTAUTH_URL || 'https://app.nexrel.com'}/dashboard/websites/${alert.websiteId}" class="button">
              Manage Website Stock
            </a>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get SMS body
   */
  private getSMSBody(alert: StockAlertNotification): string {
    const statusText = {
      OUT_OF_STOCK: 'OUT OF STOCK',
      LOW_STOCK: 'LOW STOCK',
      BACK_IN_STOCK: 'BACK IN STOCK',
    }[alert.status];

    return `${statusText}: ${alert.productName} (${alert.sku}) - ${alert.currentStock} units. Check dashboard: ${process.env.NEXTAUTH_URL || 'app.nexrel.com'}/dashboard/websites/${alert.websiteId}`;
  }

  /**
   * Send batch notifications for multiple alerts
   */
  async sendBatchAlerts(alerts: StockAlertNotification[]): Promise<{
    totalSent: number;
    emailSent: number;
    smsSent: number;
    errors: string[];
  }> {
    const results = await Promise.allSettled(
      alerts.map((alert) => this.sendStockAlert(alert))
    );

    let emailSent = 0;
    let smsSent = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.emailSent) emailSent++;
        if (result.value.smsSent) smsSent++;
        errors.push(...result.value.errors);
      } else {
        errors.push(`Alert ${index} failed: ${result.reason}`);
      }
    });

    return {
      totalSent: emailSent + smsSent,
      emailSent,
      smsSent,
      errors,
    };
  }
}

export const websiteStockNotificationService = new WebsiteStockNotificationService();
