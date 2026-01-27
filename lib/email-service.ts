/**
 * Email Service for sending notifications
 * Supports Gmail OAuth, SendGrid, and console fallback
 */

import { prisma } from '@/lib/db';
import sgMail from '@sendgrid/mail';
import { CallSummaryExtractor } from '@/lib/call-summary-extractor';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  userId?: string; // For Gmail OAuth lookup
}

export class EmailService {
  private fromEmail: string;
  private isSendGridConfigured: boolean;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'michael@soshogleagents.com';
    this.isSendGridConfigured = !!process.env.SENDGRID_API_KEY;
    
    // Initialize SendGrid if API key is available
    if (this.isSendGridConfigured) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      
      // Set EU data residency if configured (for EU-pinned subusers)
      // Note: This method is available in @sendgrid/mail v7.6.0+
      if (process.env.SENDGRID_DATA_RESIDENCY === 'eu') {
        try {
          // Use type assertion for the setDataResidency method
          (sgMail as any).setDataResidency('eu');
          console.log('✅ SendGrid email service initialized with EU data residency');
        } catch (error) {
          console.log('⚠️  EU data residency not supported in this SendGrid version');
          console.log('✅ SendGrid email service initialized');
        }
      } else {
        console.log('✅ SendGrid email service initialized');
      }
    } else {
      console.log('ℹ️  SendGrid not configured - will use Gmail OAuth if available');
    }
  }

  /**
   * Refresh Gmail access token using refresh token
   */
  private async refreshGmailToken(connectionId: string, refreshToken: string): Promise<string | null> {
    try {
      console.log('🔄 Refreshing Gmail access token...');

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('❌ Missing Google OAuth credentials');
        return null;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('❌ Token refresh failed:', errorData);
        return null;
      }

      const tokens = await tokenResponse.json();
      const { access_token, expires_in } = tokens;

      if (!access_token) {
        console.error('❌ No access token in refresh response');
        return null;
      }

      // Update the connection with new token and expiry
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      await prisma.channelConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: access_token,
          expiresAt,
        },
      });

      console.log('✅ Gmail access token refreshed successfully, new expiry:', expiresAt);
      return access_token;

    } catch (error: any) {
      console.error('❌ Error refreshing Gmail token:', error.message);
      return null;
    }
  }

  /**
   * Send email via Gmail OAuth using user's connected account
   */
  private async sendViaGmail(options: EmailOptions, userId: string): Promise<boolean> {
    try {
      console.log('📧 [Gmail OAuth] Attempting to send email for user:', userId);

      // Get Gmail connection for this user
      let gmailConnection = await prisma.channelConnection.findFirst({
        where: {
          userId,
          channelType: 'EMAIL',
          providerType: 'GMAIL',
          status: 'CONNECTED'
        }
      });

      if (!gmailConnection || !gmailConnection.accessToken) {
        console.log('⚠️  [Gmail OAuth] No Gmail connection found for user');
        console.log('   User ID:', userId);
        console.log('   Has connection:', !!gmailConnection);
        console.log('   Has access token:', !!gmailConnection?.accessToken);
        return false;
      }

      console.log('✅ [Gmail OAuth] Found Gmail connection:', gmailConnection.channelIdentifier);
      console.log('   Connection ID:', gmailConnection.id);
      console.log('   Status:', gmailConnection.status);
      console.log('   Expires at:', gmailConnection.expiresAt);

      // Check if token is expired and refresh if needed
      const now = new Date();
      if (gmailConnection.expiresAt && gmailConnection.expiresAt < now) {
        console.log('⚠️  [Gmail OAuth] Access token expired, attempting refresh...');
        console.log('   Expired at:', gmailConnection.expiresAt);
        console.log('   Current time:', now);
        
        if (!gmailConnection.refreshToken) {
          console.error('❌ [Gmail OAuth] No refresh token available, cannot refresh');
          return false;
        }

        const newAccessToken = await this.refreshGmailToken(
          gmailConnection.id,
          gmailConnection.refreshToken
        );

        if (!newAccessToken) {
          console.error('❌ [Gmail OAuth] Failed to refresh token');
          return false;
        }

        // Update the access token for sending
        gmailConnection.accessToken = newAccessToken;
        console.log('✅ [Gmail OAuth] Token refreshed successfully');
      } else {
        console.log('✅ [Gmail OAuth] Access token is still valid');
      }

      // Create email message in RFC 2822 format
      const emailLines = [
        `To: ${options.to}`,
        `From: ${gmailConnection.channelIdentifier}`,
        `Subject: ${options.subject}`,
        `Content-Type: text/html; charset=utf-8`,
        '',
        options.html
      ];

      const email = emailLines.join('\r\n');
      const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      console.log('📧 [Gmail OAuth] Sending email via Gmail API...');
      
      // Send via Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gmailConnection.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ [Gmail OAuth] Gmail API error:', error);
        console.error('   Status:', response.status);
        console.error('   Status text:', response.statusText);
        return false;
      }

      const result = await response.json();
      console.log('✅ [Gmail OAuth] Email sent successfully via Gmail');
      console.log('   Message ID:', result.id);
      console.log('   Thread ID:', result.threadId);
      return true;

    } catch (error: any) {
      console.error('❌ [Gmail OAuth] Send error:', error.message);
      console.error('   Error type:', error.constructor.name);
      if (error.stack) {
        console.error('   Stack trace:', error.stack);
      }
      return false;
    }
  }

  /**
   * Send an email using the best available method:
   * 1. Gmail OAuth (if userId provided and Gmail connected)
   * 2. SendGrid (if configured)
   * 3. Console log (fallback for development)
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('📧 [Email Service] Sending email:', {
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        userId: options.userId || 'not provided',
        hasHtml: !!options.html,
        htmlLength: options.html?.length || 0
      });

      // Priority 1: Try Gmail OAuth if userId provided
      if (options.userId) {
        console.log('📧 [Email Service] Attempting Gmail OAuth (Priority 1)');
        const gmailSent = await this.sendViaGmail(options, options.userId);
        if (gmailSent) {
          console.log('✅ [Email Service] Email sent successfully via Gmail OAuth');
          return true;
        }
        console.log('⚠️  [Email Service] Gmail OAuth send failed, falling back to SendGrid');
      } else {
        console.log('ℹ️  [Email Service] No userId provided, skipping Gmail OAuth');
      }

      // Priority 2: Try SendGrid if configured
      if (this.isSendGridConfigured) {
        console.log('📧 [Email Service] Attempting SendGrid (Priority 2)');
        try {
          const result = await sgMail.send({
            to: options.to,
            from: options.from || this.fromEmail,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
          });
          console.log('✅ [Email Service] Email sent successfully via SendGrid');
          console.log('   To:', options.to);
          console.log('   Subject:', options.subject);
          console.log('   Response:', result[0]?.statusCode);
          return true;
        } catch (sendGridError: any) {
          console.error('❌ [Email Service] SendGrid send failed:', sendGridError.message);
          if (sendGridError.response) {
            console.error('   SendGrid error details:', JSON.stringify(sendGridError.response.body, null, 2));
          }
          if (sendGridError.code) {
            console.error('   Error code:', sendGridError.code);
          }
          throw sendGridError; // Re-throw to be caught by outer catch
        }
      } else {
        console.log('⚠️  [Email Service] SendGrid not configured (no API key)');
      }

      // Priority 3: Console fallback for development
      console.log('⚠️  [Email Service] No email provider configured - logging email to console');
      console.log('📧 To:', options.to);
      console.log('📧 Subject:', options.subject);
      console.log('📧 HTML preview:', options.html.substring(0, 200) + '...');
      console.log('📧 NOTE: This is development mode. Email would be sent in production with proper config.');
      return true;

    } catch (error: any) {
      console.error('❌ [Email Service] Failed to send email:', error.message);
      console.error('   Error type:', error.constructor.name);
      console.error('   Error code:', error.code);
      if (error.response) {
        console.error('   Response details:', JSON.stringify(error.response.body, null, 2));
      }
      if (error.stack) {
        console.error('   Stack trace:', error.stack);
      }
      return false;
    }
  }

  /**
   * Send a call summary email after a voice AI conversation
   */
  async sendCallSummaryEmail(params: {
    recipientEmail: string;
    callerName: string;
    callerPhone: string;
    callerEmail?: string;
    callReason?: string;
    agentName: string;
    callDuration: string;
    callDate: Date;
    transcript?: string;
    summary?: string;
    recordingUrl?: string;
    userId: string;
    conversationData?: any;
  }): Promise<boolean> {
    const {
      recipientEmail,
      callerName,
      callerPhone,
      callerEmail,
      callReason,
      agentName,
      callDuration,
      callDate,
      transcript,
      summary,
      recordingUrl,
      userId,
      conversationData
    } = params;

    // Get user/business info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, businessCategory: true }
    });

    const businessName = user?.name || 'Your Business';

    // Extract structured information from the call
    const extractedInfo = CallSummaryExtractor.extractInformation({
      transcript,
      summary,
      conversationData
    });
    
    // Use extracted information to enhance caller details
    const displayCallerName = extractedInfo.callerName || callerName;
    const displayCallerEmail = extractedInfo.email || callerEmail;
    const displayCallReason = extractedInfo.callReason || callReason;
    const displayAddress = extractedInfo.address || '';

    // Format dates in multiple formats as specified
    const dateMMDDYYYY = callDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });

    const dateMonthDDYYYY = callDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const dateFullWithDay = callDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const time12Hour = callDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Subject line format: "new voice ai-[caller name] [date/time]"
    const subjectDateTime = `${dateMMDDYYYY} ${time12Hour}`;
    const subject = `new voice ai-${displayCallerName} ${subjectDateTime}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .info-card {
            background: #fff;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
          }
          .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #555;
            min-width: 180px;
            flex-shrink: 0;
          }
          .value {
            color: #333;
            flex: 1;
          }
          .transcript-section {
            background: #fff;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .transcript {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 20px;
            border-radius: 6px;
            max-height: 500px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.8;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .summary-content {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            border-radius: 6px;
            color: #1e3a8a;
            line-height: 1.8;
          }
          .appointment-section {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .appointment-title {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 12px;
          }
          .next-steps-section {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .next-steps-title {
            font-size: 16px;
            font-weight: 600;
            color: #065f46;
            margin-bottom: 12px;
          }
          .next-steps-list {
            margin: 0;
            padding-left: 20px;
          }
          .next-steps-list li {
            margin-bottom: 8px;
            color: #064e3b;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
            font-weight: 600;
            text-align: center;
          }
          .button:hover {
            background: #5568d3;
          }
          .recording-section {
            text-align: center;
            background: #fff;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .footer {
            text-align: center;
            color: #888;
            font-size: 12px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📞 Voice AI Call Summary</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${businessName}</p>
        </div>

        <!-- Caller Information -->
        <div class="info-card">
          <div class="section-title">👤 Caller Information</div>
          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">${displayCallerName}</span>
          </div>
          <div class="info-row">
            <span class="label">Phone:</span>
            <span class="value">${callerPhone}</span>
          </div>
          ${displayCallerEmail ? `
          <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">${displayCallerEmail}</span>
          </div>
          ` : ''}
          ${displayCallReason ? `
          <div class="info-row">
            <span class="label">Reason for Call:</span>
            <span class="value">${displayCallReason}</span>
          </div>
          ` : ''}
          ${displayAddress ? `
          <div class="info-row">
            <span class="label">Address:</span>
            <span class="value">${displayAddress}</span>
          </div>
          ` : ''}
        </div>

        <!-- Call Details -->
        <div class="info-card">
          <div class="section-title">📋 Call Details</div>
          <div class="info-row">
            <span class="label">Date (MM/DD/YYYY):</span>
            <span class="value">${dateMMDDYYYY}</span>
          </div>
          <div class="info-row">
            <span class="label">Date (Month DD, YYYY):</span>
            <span class="value">${dateMonthDDYYYY}</span>
          </div>
          <div class="info-row">
            <span class="label">Date (Full):</span>
            <span class="value">${dateFullWithDay}</span>
          </div>
          <div class="info-row">
            <span class="label">Time:</span>
            <span class="value">${time12Hour}</span>
          </div>
          <div class="info-row">
            <span class="label">Duration:</span>
            <span class="value">${callDuration}</span>
          </div>
          <div class="info-row">
            <span class="label">AI Agent:</span>
            <span class="value">${agentName}</span>
          </div>
        </div>

        <!-- AI Summary -->
        ${extractedInfo.callSummary || summary ? `
        <div class="info-card">
          <div class="section-title">🤖 AI Summary</div>
          <div class="summary-content">
            ${extractedInfo.callSummary || summary}
          </div>
        </div>
        ` : ''}

        <!-- Appointment (if applicable) -->
        ${extractedInfo.appointmentDate && extractedInfo.appointmentTime ? `
        <div class="appointment-section">
          <div class="appointment-title">📅 Appointment Scheduled</div>
          <div class="info-row" style="border: none; padding: 5px 0;">
            <span class="label">Date:</span>
            <span class="value">${extractedInfo.appointmentDate}</span>
          </div>
          <div class="info-row" style="border: none; padding: 5px 0;">
            <span class="label">Time:</span>
            <span class="value">${extractedInfo.appointmentTime}</span>
          </div>
        </div>
        ` : ''}

        <!-- Next Steps -->
        ${extractedInfo.followUpNeeded && extractedInfo.actionItems && extractedInfo.actionItems.length > 0 ? `
        <div class="next-steps-section">
          <div class="next-steps-title">✅ Next Steps</div>
          <ul class="next-steps-list">
            ${extractedInfo.actionItems.map((step: string) => `<li>${step}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <!-- Call Transcript -->
        ${transcript ? `
        <div class="transcript-section">
          <div class="section-title">📝 Call Transcript</div>
          <div class="transcript">${transcript}</div>
        </div>
        ` : ''}

        <!-- Call Recording -->
        ${recordingUrl ? `
        <div class="recording-section">
          <div class="section-title">🎧 Call Recording</div>
          <a href="${recordingUrl}" class="button" target="_blank">Listen to Recording</a>
        </div>
        ` : ''}

        <div class="footer">
          <p>This is an automated notification from your Voice AI system.</p>
          <p>Powered by Soshogle AI Agents</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Voice AI Call Summary
${businessName}

CALLER INFORMATION
Name: ${displayCallerName}
Phone: ${callerPhone}
${displayCallerEmail ? `Email: ${displayCallerEmail}` : ''}
${displayCallReason ? `Reason for Call: ${displayCallReason}` : ''}
${displayAddress ? `Address: ${displayAddress}` : ''}

CALL DETAILS
Date (MM/DD/YYYY): ${dateMMDDYYYY}
Date (Month DD, YYYY): ${dateMonthDDYYYY}
Date (Full): ${dateFullWithDay}
Time: ${time12Hour}
Duration: ${callDuration}
AI Agent: ${agentName}

${extractedInfo.callSummary || summary ? `AI SUMMARY:\n${extractedInfo.callSummary || summary}\n\n` : ''}
${extractedInfo.appointmentDate ? `APPOINTMENT: ${extractedInfo.appointmentDate} at ${extractedInfo.appointmentTime}\n\n` : ''}
${transcript ? `TRANSCRIPT:\n${transcript}\n\n` : ''}
${recordingUrl ? `RECORDING: ${recordingUrl}` : ''}
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      userId // Pass userId to enable Gmail OAuth sending
    });
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(params: {
    recipientEmail: string;
    customerName: string;
    appointmentDate: Date;
    appointmentTime: string;
    businessName: string;
    confirmationCode?: string;
    userId?: string;
  }): Promise<boolean> {
    const { recipientEmail, customerName, appointmentDate, appointmentTime, businessName, confirmationCode, userId } = params;

    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `✅ Appointment Confirmed - ${formattedDate} at ${appointmentTime}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .checkmark {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .appointment-details {
            background: #f0fdf4;
            border: 2px solid #10b981;
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .detail-row {
            margin: 15px 0;
            font-size: 16px;
          }
          .label {
            font-weight: bold;
            color: #065f46;
          }
          .confirmation-code {
            background: #fff;
            border: 2px dashed #10b981;
            padding: 15px;
            text-align: center;
            border-radius: 5px;
            margin: 20px 0;
          }
          .code {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            letter-spacing: 3px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="checkmark">✅</div>
          <h1>Appointment Confirmed!</h1>
          <p>We look forward to seeing you</p>
        </div>

        <p>Hello ${customerName},</p>
        <p>Your appointment with <strong>${businessName}</strong> has been confirmed.</p>

        <div class="appointment-details">
          <div class="detail-row">
            <span class="label">📅 Date:</span> ${formattedDate}
          </div>
          <div class="detail-row">
            <span class="label">🕐 Time:</span> ${appointmentTime}
          </div>
          <div class="detail-row">
            <span class="label">👤 Name:</span> ${customerName}
          </div>
        </div>

        ${confirmationCode ? `
          <div class="confirmation-code">
            <p style="margin: 0 0 10px 0; color: #065f46;"><strong>Confirmation Code</strong></p>
            <div class="code">${confirmationCode}</div>
          </div>
        ` : ''}

        <p><strong>Important:</strong> Please arrive 5-10 minutes early for your appointment.</p>
        <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px; text-align: center;">
          <p>Thank you for choosing ${businessName}</p>
          <p>Powered by Soshogle AI Agents</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      userId
    });
  }
}

export const emailService = new EmailService();
