import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

async function main() {
  console.log('🧪 Testing ElevenLabs Phone Number Import (FIXED)...\n');
  
  const phoneNumber = '+19048170321'; // From Twilio
  
  const payload = {
    label: `Test Import - ${phoneNumber}`,
    phone_number: phoneNumber,  // FIXED: was "number"
    sid: TWILIO_ACCOUNT_SID,     // FIXED: was "twilio_account_sid"
    token: TWILIO_AUTH_TOKEN,    // FIXED: was "twilio_auth_token"
  };
  
  console.log('📞 Importing:', phoneNumber);
  console.log('   Payload:', { ...payload, token: '***' });
  
  const response = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  console.log('   Response Status:', response.status);
  
  const responseText = await response.text();
  console.log('   Response Body:', responseText);
  
  if (response.ok) {
    console.log('✅ Import successful!');
    const data = JSON.parse(responseText);
    console.log('   Phone Number ID:', data.phone_number_id || data.id);
  } else {
    console.error('❌ Import failed!');
  }
}

main().catch(console.error);
