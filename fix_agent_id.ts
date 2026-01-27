import * as dotenv from 'dotenv';

dotenv.config();

async function fixAgentPhoneAssignment() {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const phoneNumberId = 'phnum_0601k9z9wvzceha8zh2pd0ykb5a1';
  const agentId = 'agent_8101k9z9trhgex1b80dn6fq33s4a';
  
  console.log('🔧 Assigning phone number to agent via phone number API...\n');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('Agent ID:', agentId);
  console.log('');
  
  // Try to assign the agent to the phone number using PATCH on the phone number endpoint
  const patchResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`,
    {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
      }),
    }
  );

  console.log('PATCH Phone Response Status:', patchResponse.status, patchResponse.statusText);

  if (!patchResponse.ok) {
    const errorText = await patchResponse.text();
    console.error('\n❌ PATCH phone failed:');
    console.error('Response:', errorText);
  } else {
    const patchData = await patchResponse.json();
    console.log('\n✅ Phone number updated successfully:');
    console.log(patchData);
  }
  
  // Now check if the agent has the phone number
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
    console.log('Agent Phone Numbers:', agentData.phone_numbers || []);
    console.log('Agent Phone Number ID (deprecated):', agentData.phone_number_id || 'NOT SET');
  }
  
  // Also check phone number details
  console.log('\n\n🔍 Verifying phone number details...\n');
  
  const phoneResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`,
    {
      headers: {
        'xi-api-key': apiKey,
      }
    }
  );

  if (phoneResponse.ok) {
    const phoneData = await phoneResponse.json();
    console.log('Phone Assigned Agent:', phoneData.assigned_agent?.agent_id || 'NO AGENT');
  }
}

fixAgentPhoneAssignment();
