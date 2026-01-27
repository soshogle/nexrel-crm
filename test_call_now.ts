import * as dotenv from 'dotenv';

dotenv.config();

async function testCall() {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const agentId = 'agent_8101k9z9trhgex1b80dn6fq33s4a';
  const testPhoneNumber = '+15149928774';
  
  console.log('📞 Testing call initiation...\n');
  console.log('Agent ID:', agentId);
  console.log('Calling:', testPhoneNumber);
  console.log('');
  
  const callResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/call`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: testPhoneNumber,
      }),
    }
  );

  console.log('Call API Response Status:', callResponse.status, callResponse.statusText);

  if (!callResponse.ok) {
    const errorText = await callResponse.text();
    console.error('\n❌ Call initiation failed:');
    console.error('Response:', errorText);
  } else {
    const callData = await callResponse.json();
    console.log('\n✅ Call initiated successfully!');
    console.log(callData);
  }
}

testCall();
