const sgMail = require('@sendgrid/mail');

// Load environment variables
require('dotenv').config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'michael@soshogleagents.com';

console.log('🔧 Testing SendGrid Configuration...');
console.log('📧 From Email:', SMTP_FROM_EMAIL);
console.log('🔑 API Key:', SENDGRID_API_KEY ? `${SENDGRID_API_KEY.substring(0, 10)}...` : 'NOT SET');

if (!SENDGRID_API_KEY) {
  console.error('❌ SendGrid API key not configured!');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

const testEmail = {
  to: 'michaelmendeznow@gmail.com', // Test recipient
  from: SMTP_FROM_EMAIL,
  subject: '✅ SendGrid Sender Test - NEW SENDER',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
      <div style="background: white; padding: 30px; border-radius: 8px;">
        <h1 style="color: #667eea; margin-bottom: 20px;">✅ New Sender Email Test</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          This is a test email to verify that the <strong>NEW SENDER EMAIL</strong> configuration is working correctly.
        </p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>📧 Configuration Details:</strong><br><br>
            <strong>From Email:</strong> ${SMTP_FROM_EMAIL}<br>
            <strong>Provider:</strong> SendGrid<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
            <strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">✅ ACTIVE</span>
          </p>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          If you received this email, your SendGrid integration with the new sender (<strong>${SMTP_FROM_EMAIL}</strong>) is working perfectly! 🎉
        </p>
      </div>
    </div>
  `,
  text: `New Sender Email Test\n\nThis email confirms that your SendGrid integration with ${SMTP_FROM_EMAIL} is working correctly!\n\nTimestamp: ${new Date().toLocaleString()}`,
};

console.log('\n📤 Sending test email...\n');

sgMail.send(testEmail)
  .then((response) => {
    console.log('✅ SUCCESS! Test email sent successfully!');
    console.log('📧 Recipient:', testEmail.to);
    console.log('📧 From:', testEmail.from);
    console.log('📊 Status Code:', response[0].statusCode);
    console.log('📋 Message ID:', response[0].headers['x-message-id']);
    console.log('\n🎉 New sender email configuration is working correctly!');
    console.log('💡 Check the inbox for:', testEmail.to);
  })
  .catch((error) => {
    console.error('❌ ERROR! Failed to send test email');
    console.error('Error details:', error.response?.body || error.message);
    process.exit(1);
  });
