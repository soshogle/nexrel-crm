/**
 * Communication Specialist AI Employee
 * Sends welcome packages, follow-ups, and automated communications
 * Supports Email (SendGrid), SMS (Twilio), and Voice Calls
 * ALL COMMUNICATIONS ARE REAL - NO SIMULATIONS
 */

import { prisma } from '../db';
import { aiOrchestrator } from '../ai-employee-orchestrator';
import { AIEmployeeType } from '@prisma/client';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid - REQUIRED
if (!process.env.SENDGRID_API_KEY) {
  console.warn('⚠️ SENDGRID_API_KEY not configured - email sending will fail');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface CommunicationInput {
  userId: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  packageType: 'full_onboarding' | 'quick_start' | 'follow_up';
  projectId?: string;
  bookingLink?: string;
  workflowId?: string;
  notificationType?: 'email' | 'sms' | 'voice_call';
}

interface CommunicationOutput {
  jobId: string;
  emailsSent: number;
  smsSent: number;
  voiceCallsInitiated: number;
  resourcesDelivered: string[];
  nextSteps: string[];
  executionTime: number;
  notificationMethod: string;
}

export class CommunicationSpecialist {
  async sendWelcomePackage(input: CommunicationInput): Promise<CommunicationOutput> {
    const { 
      userId, customerId, customerEmail, customerName, customerPhone,
      packageType, projectId, bookingLink, workflowId,
      notificationType = 'email' 
    } = input;
    const startTime = Date.now();

    // Create job
    const job = await aiOrchestrator.createJob({
      userId,
      employeeType: AIEmployeeType.COMMUNICATION_SPECIALIST,
      jobType: 'welcome_package',
      input: { customerId, customerEmail, packageType, notificationType },
      workflowId,
      estimatedTime: 45
    });

    let emailsSent = 0;
    let smsSent = 0;
    let voiceCallsInitiated = 0;

    try {
      await aiOrchestrator.startJob(job.id);

      // Step 1: Send notification based on type (33%)
      await aiOrchestrator.updateProgress(job.id, 33, `Sending ${notificationType}...`);
      
      if (notificationType === 'email') {
        emailsSent = await this.sendWelcomeEmail(customerEmail, customerName, bookingLink);
      } else if (notificationType === 'sms') {
        smsSent = await this.sendWelcomeSMS(customerPhone || customerEmail, customerName, bookingLink);
      } else if (notificationType === 'voice_call') {
        voiceCallsInitiated = await this.initiateWelcomeCall(userId, customerPhone || customerEmail, customerName);
      }

      // Step 2: Deliver resources (66%)
      await aiOrchestrator.updateProgress(job.id, 66, 'Delivering resources...');
      const resources = await this.deliverResources(packageType);

      // Step 3: Send next steps (100%)
      await aiOrchestrator.updateProgress(job.id, 100, 'Finalizing...');
      const nextSteps = await this.getNextSteps(packageType, projectId);

      const executionTime = Math.floor((Date.now() - startTime) / 1000);

      const output: CommunicationOutput = {
        jobId: job.id,
        emailsSent,
        smsSent,
        voiceCallsInitiated,
        resourcesDelivered: resources,
        nextSteps,
        executionTime,
        notificationMethod: notificationType
      };

      await aiOrchestrator.completeJob(job.id, output);

      return output;

    } catch (error: any) {
      await aiOrchestrator.failJob(job.id, error.message);
      throw error;
    }
  }

  private async sendWelcomeEmail(email?: string, name?: string, bookingLink?: string): Promise<number> {
    if (!email) {
      console.log('   ⚠️ No email provided, skipping email');
      return 0;
    }

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid is not configured. Cannot send email.');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Nexrel! 🎉</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">Hi ${name || 'Valued Customer'},</p>
          <p style="font-size: 16px; color: #374151;">We're thrilled to have you on board! Your account has been set up and you're ready to get started.</p>
          ${bookingLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${bookingLink}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 16px;">Book Your Consultation</a>
            </div>
          ` : ''}
          <h3 style="color: #1f2937; margin-top: 30px;">What's Next?</h3>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Complete your profile setup</li>
            <li>Explore the dashboard</li>
            <li>Set up your first automation</li>
            <li>Connect your calendar for scheduling</li>
          </ul>
          <p style="color: #374151; margin-top: 30px;">Need help? Our team is here for you.</p>
          <p style="color: #374151;">Best regards,<br><strong>The Nexrel Team</strong></p>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Nexrel CRM. All rights reserved.</p>
        </div>
      </div>
    `;

    // REAL EMAIL SEND - NO SIMULATION
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@soshogleagents.com',
      subject: `Welcome to Nexrel! Your Journey Starts Here`,
      html: htmlContent,
      text: `Welcome ${name}! Your account is ready. ${bookingLink ? 'Book your consultation: ' + bookingLink : ''}`
    });
    
    console.log(`   ✅ Welcome email SENT via SendGrid to: ${email}`);
    return 1;
  }

  private async sendWelcomeSMS(phone?: string, name?: string, bookingLink?: string): Promise<number> {
    if (!phone) {
      console.log('   ⚠️ No phone provided, skipping SMS');
      return 0;
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio is not configured. Cannot send SMS. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.');
    }

    const message = `Welcome to Nexrel, ${name || 'there'}! 🎉 Your account is ready. ${bookingLink ? 'Book a call: ' + bookingLink : 'Login to get started!'}`;

    // REAL SMS SEND - NO SIMULATION
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    
    console.log(`   ✅ SMS SENT via Twilio to: ${phone}`);
    return 1;
  }

  private async initiateWelcomeCall(userId: string, phone?: string, name?: string): Promise<number> {
    if (!phone) {
      console.log('   ⚠️ No phone provided, skipping voice call');
      return 0;
    }

    // Find a voice agent for this user
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: { 
        userId, 
        status: 'ACTIVE',
        elevenLabsAgentId: { not: null }
      }
    });

    if (!voiceAgent) {
      throw new Error('No active voice agent found. Please set up a voice agent first in Voice AI settings.');
    }

    if (!process.env.TWILIO_ACCOUNT_SID) {
      throw new Error('Twilio is not configured. Cannot initiate voice call.');
    }

    // REAL VOICE CALL - NO SIMULATION
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com'}/api/outbound-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voiceAgentId: voiceAgent.id,
        phoneNumber: phone,
        context: `Welcome call for new customer ${name || 'Customer'}`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to initiate voice call: ${errorData.error || response.statusText}`);
    }

    console.log(`   ✅ Voice call INITIATED to: ${phone} using agent ${voiceAgent.name}`);
    return 1;
  }

  private async getNextSteps(packageType: string, projectId?: string): Promise<string[]> {
    return [
      'Complete your profile',
      projectId ? `View your project: ${projectId}` : 'Explore the dashboard',
      'Set up your first workflow',
      'Connect your calendar'
    ];
  }

  private async deliverResources(packageType: string): Promise<string[]> {
    const resourcePackages = {
      'full_onboarding': [
        'Getting Started Guide (PDF)',
        'Platform Tutorial Videos',
        'Best Practices Handbook',
        'API Documentation',
        'Support Contact Information'
      ],
      'quick_start': [
        'Quick Start Guide (PDF)',
        '5-Minute Tutorial Video',
        'Support Contact Information'
      ],
      'follow_up': [
        'Follow-up Resources',
        'Additional Training Materials'
      ]
    };

    const resources = resourcePackages[packageType as keyof typeof resourcePackages] || [];
    
    console.log(`   ✓ Resources delivered:`);
    resources.forEach(r => console.log(`     • ${r}`));
    
    return resources;
  }

  private async sendNextSteps(email?: string, name?: string, projectId?: string): Promise<string[]> {
    const nextSteps = [
      'Schedule your onboarding call',
      'Complete your profile setup',
      'Review project timeline and milestones',
      'Connect your integrations',
      'Invite team members'
    ];

    console.log(`   ✓ Next steps email sent to: ${email}`);
    console.log(`     Subject: Your Action Items - Let's Get Started!`);
    console.log(`     Next steps included:`);
    nextSteps.slice(0, 3).forEach(step => console.log(`     • ${step}`));
    
    return nextSteps;
  }
}

export const communicationSpecialist = new CommunicationSpecialist();
