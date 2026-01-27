import * as nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  trackingId?: string;
}

/**
 * Send drip campaign email
 */
export async function sendDripEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const {
      to,
      subject,
      html,
      text,
      fromName,
      fromEmail,
      replyTo,
      trackingId,
    } = options;

    // Get user's email configuration
    // For now, we'll use SMTP configuration from environment
    // Later, this should pull from user's email provider settings
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Inject tracking pixel and replace links
    let finalHtml = html;
    if (trackingId) {
      finalHtml = injectTrackingPixel(html, trackingId);
      finalHtml = replaceLinksWithTracking(finalHtml, trackingId);
    }

    const mailOptions = {
      from: fromEmail && fromName 
        ? `${fromName} <${fromEmail}>`
        : fromEmail || process.env.SMTP_FROM,
      to,
      subject,
      html: finalHtml,
      text: text || '',
      replyTo: replyTo || fromEmail || process.env.SMTP_FROM,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Inject tracking pixel into HTML content
 */
function injectTrackingPixel(html: string, trackingId: string): string {
  const trackingPixel = `<img src="${process.env.NEXTAUTH_URL}/api/campaigns/drip/track/${trackingId}/open" width="1" height="1" alt="" style="display:none;" />`;
  
  // Try to inject before closing body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`);
  }
  
  // Otherwise append to end
  return html + trackingPixel;
}

/**
 * Replace links with tracking links
 */
function replaceLinksWithTracking(html: string, trackingId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL;
  const regex = /<a([^>]*)href=["']([^"']+)["']([^>]*)>/gi;
  
  return html.replace(regex, (match, before, url, after) => {
    // Skip if already a tracking link
    if (url.includes('/api/campaigns/drip/track/')) {
      return match;
    }
    
    const trackingUrl = `${baseUrl}/api/campaigns/drip/track/${trackingId}/click?url=${encodeURIComponent(url)}`;
    return `<a${before}href="${trackingUrl}"${after}>`;
  });
}
