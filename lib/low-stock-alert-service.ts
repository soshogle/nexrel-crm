
/**
 * Low Stock Alert Service
 * Checks inventory levels and sends alerts via email/SMS
 */

import { prisma } from '@/lib/db';
import twilio from 'twilio';

export interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  status: 'CRITICAL' | 'LOW' | 'OUT_OF_STOCK';
  category?: string;
  location?: string;
}

export class LowStockAlertService {
  private twilioClient: any;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  /**
   * Check inventory and get low stock items for a user
   */
  async checkInventory(userId: string): Promise<LowStockItem[]> {
    const items = await prisma.generalInventoryItem.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        category: true,
        location: true,
      },
    });

    const lowStockItems: LowStockItem[] = [];

    for (const item of items) {
      let status: 'CRITICAL' | 'LOW' | 'OUT_OF_STOCK' | null = null;

      if (item.quantity === 0) {
        status = 'OUT_OF_STOCK';
      } else if (item.reorderLevel > 0) {
        if (item.quantity <= item.reorderLevel * 0.1) {
          status = 'CRITICAL';
        } else if (item.quantity <= item.reorderLevel) {
          status = 'LOW';
        }
      }

      if (status) {
        lowStockItems.push({
          id: item.id,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          reorderLevel: item.reorderLevel,
          status,
          category: item.category?.name,
          location: item.location?.name,
        });
      }
    }

    return lowStockItems;
  }

  /**
   * Send low stock alerts
   */
  async sendAlerts(userId: string): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    itemCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let emailSent = false;
    let smsSent = false;

    try {
      // Get alert settings
      const settings = await prisma.lowStockAlertSettings.findUnique({
        where: { userId },
      });

      if (!settings || !settings.enabled) {
        return { emailSent, smsSent, itemCount: 0, errors: ['Alerts are disabled'] };
      }

      // Check inventory
      const lowStockItems = await this.checkInventory(userId);

      if (lowStockItems.length === 0) {
        return { emailSent, smsSent, itemCount: 0, errors: [] };
      }

      // Filter items based on alert conditions
      const filteredItems = lowStockItems.filter((item) => {
        if (item.status === 'OUT_OF_STOCK' && settings.alertOnOutOfStock) return true;
        if (item.status === 'LOW' && settings.alertOnLowStock) return true;
        if (item.status === 'CRITICAL' && settings.alertOnCritical) return true;
        return false;
      });

      if (filteredItems.length === 0) {
        return { emailSent, smsSent, itemCount: 0, errors: [] };
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      // Send email alerts
      if (settings.sendEmail && settings.emailAddresses) {
        try {
          await this.sendEmailAlert(
            settings.emailAddresses.split(',').map((e) => e.trim()),
            filteredItems,
            user?.name || 'User'
          );
          emailSent = true;
        } catch (error: any) {
          console.error('Error sending email alert:', error);
          errors.push(`Email error: ${error.message}`);
        }
      }

      // Send SMS alerts
      if (settings.sendSMS && settings.smsNumbers && this.twilioClient) {
        try {
          await this.sendSMSAlert(
            settings.smsNumbers.split(',').map((n) => n.trim()),
            filteredItems
          );
          smsSent = true;
        } catch (error: any) {
          console.error('Error sending SMS alert:', error);
          errors.push(`SMS error: ${error.message}`);
        }
      }

      // Update last alert sent time
      await prisma.lowStockAlertSettings.update({
        where: { id: settings.id },
        data: { lastAlertSent: new Date() },
      });

      return {
        emailSent,
        smsSent,
        itemCount: filteredItems.length,
        errors,
      };
    } catch (error: any) {
      console.error('Error sending alerts:', error);
      errors.push(error.message);
      return { emailSent, smsSent, itemCount: 0, errors };
    }
  }

  /**
   * Send email alert (simplified version - would use a proper email service in production)
   */
  private async sendEmailAlert(
    emails: string[],
    items: LowStockItem[],
    userName: string
  ): Promise<void> {
    console.log('📧 Email Alert (simulated):');
    console.log('To:', emails.join(', '));
    console.log('Subject: Low Stock Alert - Action Required');
    console.log('Items:', items.length);
    
    // In a real implementation, you would use SendGrid, AWS SES, or similar
    // For now, we'll log the alert
    const outOfStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const critical = items.filter((i) => i.status === 'CRITICAL').length;
    const low = items.filter((i) => i.status === 'LOW').length;

    console.log(`\nLow Stock Alert Summary for ${userName}:`);
    console.log(`- Out of Stock: ${outOfStock} items`);
    console.log(`- Critical (< 10% of reorder level): ${critical} items`);
    console.log(`- Low Stock: ${low} items`);
    console.log('\nTop 5 items requiring attention:');
    items.slice(0, 5).forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.name} (SKU: ${item.sku}) - ${item.quantity} units (${item.status})`
      );
    });
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(
    phoneNumbers: string[],
    items: LowStockItem[]
  ): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('Twilio is not configured');
    }

    const outOfStock = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const critical = items.filter((i) => i.status === 'CRITICAL').length;
    const low = items.filter((i) => i.status === 'LOW').length;

    const message = `Low Stock Alert: ${outOfStock} out of stock, ${critical} critical, ${low} low. Check your inventory dashboard.`;

    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioNumber) {
      throw new Error('TWILIO_PHONE_NUMBER is not configured');
    }

    for (const number of phoneNumbers) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: twilioNumber,
          to: number,
        });
        console.log(`📱 SMS sent to ${number}`);
      } catch (error: any) {
        console.error(`Failed to send SMS to ${number}:`, error.message);
        throw error;
      }
    }
  }
}

export const lowStockAlertService = new LowStockAlertService();
