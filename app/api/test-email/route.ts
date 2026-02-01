import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test endpoint to verify SendGrid email configuration
 * GET /api/test-email?to=email@example.com
 */
export async function GET(request: Request) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recipient from query params
    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to') || session.user.email;

    if (!to) {
      return NextResponse.json(
        { error: 'No recipient email provided' },
        { status: 400 }
      );
    }

    // Send test email
    console.log('📧 Sending test email to:', to);
    
    const success = await emailService.sendEmail({
      to,
      subject: 'SendGrid Test Email - Soshogle CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c3aed; margin-bottom: 20px;">SendGrid Integration Test</h1>
          <p style="color: #333; line-height: 1.6;">
            This is a test email to verify that your SendGrid integration is working correctly.
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
              <strong>✅ Configuration Status:</strong><br>
              - SendGrid API Key: Configured<br>
              - From Email: ${process.env.SMTP_FROM_EMAIL || 'michael@soshogleagents.com'}<br>
              - Timestamp: ${new Date().toISOString()}
            </p>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you received this email, your SendGrid integration is working properly!
          </p>
        </div>
      `,
      text: 'This is a test email to verify that your SendGrid integration is working correctly.',
      userId: session.user.id,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        recipient: to,
        provider: 'SendGrid',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
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
