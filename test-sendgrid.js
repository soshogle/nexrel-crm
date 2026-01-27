// Using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const sgMail = require('@sendgrid/mail');
require('dotenv').config({ path: './.env' });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'michaelmendeznow@gmail.com', // Your email for testing
  from: 'michael@soshogleagents.com', // Verified sender from your .env
  subject: 'SendGrid Test - Sending with SendGrid is Fun',
  text: 'and easy to do anywhere, even with Node.js',
  html: '<strong>and easy to do anywhere, even with Node.js</strong>',
};

console.log('🔧 Testing SendGrid API...');
console.log('📧 From:', msg.from);
console.log('📬 To:', msg.to);
console.log('🔑 API Key:', process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 10)}...` : 'NOT FOUND');

sgMail
  .send(msg)
  .then(() => {
    console.log('✅ Email sent successfully!');
    console.log('📨 Check your inbox at michaelmendeznow@gmail.com');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error sending email:');
    console.error(error.response ? error.response.body : error);
    process.exit(1);
  });
