/**
 * Customer Onboarding AI Employee
 * Handles customer record creation, invoice generation, and receipt emails
 * ALL OPERATIONS ARE REAL - NO SIMULATIONS
 */

import { prisma } from '../db';
import { aiOrchestrator } from '../ai-employee-orchestrator';
import { AIEmployeeType } from '@prisma/client';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface OnboardingInput {
  userId: string;
  customerData: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  purchaseData: {
    serviceType?: string;
    amount?: number;
    description?: string;
  };
  workflowId?: string;
}

interface OnboardingOutput {
  jobId: string;
  customerId: string;
  leadId: string;
  invoiceId: string;
  invoiceNumber: string;
  emailSent: boolean;
  executionTime: number;
}

export class CustomerOnboardingAgent {
  async onboard(input: OnboardingInput): Promise<OnboardingOutput> {
    const { userId, customerData, purchaseData, workflowId } = input;
    const startTime = Date.now();

    // Create job
    const job = await aiOrchestrator.createJob({
      userId,
      employeeType: AIEmployeeType.CUSTOMER_ONBOARDING,
      jobType: 'customer_onboarding',
      input: { customerData, purchaseData },
      workflowId,
      estimatedTime: 60
    });

    try {
      await aiOrchestrator.startJob(job.id);

      // Step 1: Create customer record (33%)
      await aiOrchestrator.updateProgress(job.id, 33, 'Creating customer record...');
      const lead = await this.createCustomerRecord(userId, customerData);

      // Step 2: Generate invoice (66%)
      await aiOrchestrator.updateProgress(job.id, 66, 'Generating invoice...');
      const invoice = await this.generateInvoice(userId, lead.id, purchaseData);

      // Step 3: Send receipt email (100%)
      await aiOrchestrator.updateProgress(job.id, 100, 'Sending receipt email...');
      const emailSent = await this.sendReceiptEmail(lead, invoice);

      const executionTime = Math.floor((Date.now() - startTime) / 1000);

      const output: OnboardingOutput = {
        jobId: job.id,
        customerId: lead.id,
        leadId: lead.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        emailSent,
        executionTime
      };

      await aiOrchestrator.completeJob(job.id, output);

      return output;

    } catch (error: any) {
      await aiOrchestrator.failJob(job.id, error.message);
      throw error;
    }
  }

  private async createCustomerRecord(userId: string, customerData: any) {
    const lead = await prisma.lead.create({
      data: {
        userId,
        businessName: customerData.company || customerData.name || 'New Customer',
        contactPerson: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        status: 'CONVERTED',
        source: 'purchase',
        contactType: 'customer'
      }
    });

    console.log(`   ✓ Customer record created: ${lead.id}`);
    return lead;
  }

  private async generateInvoice(userId: string, leadId: string, purchaseData: any) {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const amount = purchaseData.amount || 0;

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        leadId,
        invoiceNumber,
        customerName: 'Customer',
        customerEmail: 'customer@example.com',
        status: 'PAID',
        items: [
          {
            description: purchaseData.serviceType || 'Service',
            quantity: 1,
            unitPrice: amount,
            total: amount
          }
        ],
        subtotal: amount,
        taxAmount: 0,
        totalAmount: amount,
        paidAmount: amount,
        currency: 'USD'
      }
    });

    console.log(`   ✓ Invoice generated: ${invoiceNumber}`);
    return invoice;
  }

  private async sendReceiptEmail(lead: any, invoice: any): Promise<boolean> {
    if (!lead.email) {
      console.log('   ⚠️ No email address for customer, skipping receipt email');
      return false;
    }

    if (!process.env.SENDGRID_API_KEY) {
      console.error('   ❌ SendGrid not configured - cannot send receipt email');
      throw new Error('SendGrid is not configured. Cannot send receipt email.');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Payment Receipt ✓</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">Hi ${lead.contactPerson || lead.businessName || 'Valued Customer'},</p>
          <p style="font-size: 16px; color: #374151;">Thank you for your purchase! Here's your receipt:</p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date:</td>
                <td style="padding: 8px 0; color: #1f2937; text-align: right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #1f2937; font-weight: 600;">Total Amount:</td>
                <td style="padding: 12px 0; color: #10b981; font-weight: 700; font-size: 20px; text-align: right;">$${(invoice.totalAmount || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #374151;">Your account has been activated and you can now access all features.</p>
          <p style="color: #374151; margin-top: 30px;">Questions? Reply to this email or contact our support team.</p>
          <p style="color: #374151;">Best regards,<br><strong>The Nexrel Team</strong></p>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Nexrel CRM. All rights reserved.</p>
        </div>
      </div>
    `;

    // REAL EMAIL SEND - NO SIMULATION
    await sgMail.send({
      to: lead.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@soshogleagents.com',
      subject: `Receipt - Invoice ${invoice.invoiceNumber}`,
      html: htmlContent,
      text: `Receipt for Invoice ${invoice.invoiceNumber}. Amount: $${(invoice.totalAmount || 0).toFixed(2)}. Thank you for your purchase!`
    });
    
    console.log(`   ✅ Receipt email SENT via SendGrid to: ${lead.email}`);
    console.log(`     Invoice: ${invoice.invoiceNumber}`);
    console.log(`     Amount: $${(invoice.totalAmount || 0).toFixed(2)}`);
    
    return true;
  }
}

export const customerOnboardingAgent = new CustomerOnboardingAgent();
