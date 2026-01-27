import * as dotenv from 'dotenv';

dotenv.config();

async function fixAgent() {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const agentId = 'agent_8101k9z9trhgex1b80dn6fq33s4a';  // soshogle AI test
  const phoneNumberId = 'phnum_0601k9z9wvzceha8zh2pd0ykb5a1';
  
  console.log('🔧 Fixing agent phone number assignment...\n');
  console.log('Agent ID:', agentId);
  console.log('Phone Number ID:', phoneNumberId);
  console.log('');
  
  // Try to assign the phone number to the agent using PATCH
  const patchResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number_id: phoneNumberId,
      }),
    }
  );

  console.log('PATCH Response Status:', patchResponse.status, patchResponse.statusText);

  if (!patchResponse.ok) {
    const errorText = await patchResponse.text();
    console.error('\n❌ PATCH failed:');
    console.error('Response:', errorText);
  } else {
    const patchData = await patchResponse.json();
    console.log('\n✅ Agent updated successfully:');
    console.log(patchData);
  }
  
  // Now check if it worked
  console.log('\n\n🔍 Verifying agent details...\n');
  
  const agentResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      headers: {
        'xi-api-key': apiKey,
      }
    }
  );

  if (agentResponse.ok) {
    const agentData = await agentResponse.json();
    console.log('Agent Phone Number ID:', agentData.phone_number_id || 'STILL NOT ASSIGNED');
  }
}

fixAgent();
