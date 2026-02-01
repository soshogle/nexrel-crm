import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test endpoint to send an email via Gmail OAuth
 * POST /api/gmail/test-send
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'recipientEmail is required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing Gmail send to:', recipientEmail);
    console.log('🧪 Using userId:', session.user.id);

    // Try to send a test email
    const success = await emailService.sendEmail({
      to: recipientEmail,
      subject: '🧪 Test Email from Soshogle CRM',
      html: `
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin-bottom: 30px;
            }
            .content {
              background: #f7f7f7;
              padding: 25px;
              border-radius: 10px;
              margin: 20px 0;
            }
            .success-icon {
              font-size: 48px;
              text-align: center;
              margin: 20px 0;
            }
            .info-box {
              background: #e8f4f8;
              border-left: 4px solid #4a90e2;
              padding: 15px;
              margin: 15px 0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Gmail OAuth Integration Test</p>
          </div>

          <div class="success-icon">✅</div>

          <div class="content">
            <h2>Gmail OAuth is Working!</h2>
            <p>This test email was successfully sent via <strong>Gmail OAuth</strong> from your connected Google Workspace account.</p>
            
            <div class="info-box">
              <p><strong>✅ What this confirms:</strong></p>
              <ul>
                <li>Gmail OAuth connection is active</li>
                <li>Access token is valid (or was successfully refreshed)</li>
                <li>Email sending permissions are properly configured</li>
                <li>The email service is correctly routing through Gmail</li>
              </ul>
            </div>

            <div class="info-box" style="border-left-color: #10b981; background: #f0fdf4;">
              <p><strong>🎯 Next Steps:</strong></p>
              <ul>
                <li>Voice AI call notifications will now use Gmail OAuth</li>
                <li>Appointment confirmations will be sent from your Gmail</li>
                <li>All system emails will appear from your business email</li>
              </ul>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>Sent at: ${new Date().toLocaleString()}</p>
            <p>Powered by Soshogle AI Agents</p>
          </div>
        </body>
        </html>
      `,
      text: `
Test Email - Gmail OAuth Integration

✅ Gmail OAuth is Working!

This test email was successfully sent via Gmail OAuth from your connected Google Workspace account.

What this confirms:
- Gmail OAuth connection is active
- Access token is valid (or was successfully refreshed)
- Email sending permissions are properly configured
- The email service is correctly routing through Gmail

Next Steps:
- Voice AI call notifications will now use Gmail OAuth
- Appointment confirmations will be sent from your Gmail
- All system emails will appear from your business email

Sent at: ${new Date().toLocaleString()}
Powered by Soshogle AI Agents
      `,
      userId: session.user.id, // Pass userId to enable Gmail OAuth
    });

    if (success) {
      console.log('✅ Test email sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully via Gmail OAuth',
        sentTo: recipientEmail,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('❌ Test email failed to send');
      return NextResponse.json(
        { 
          success: false,
          error: 'Email failed to send. Check server logs for details.',
          fallbackUsed: true,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Test email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
