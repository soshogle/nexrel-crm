import dotenv from 'dotenv';

dotenv.config();

async function getAgentPhoneId() {
  try {
    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/agents/agent_050Ik9z7p73sf8vass9zxkce45p',
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        }
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('\n📞 Agent Phone Number Details:');
    console.log('Phone Number ID:', data.phone_number_id || 'NOT ASSIGNED');
    console.log('\n📋 Full Agent Data:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getAgentPhoneId();
