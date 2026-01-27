import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function testFixedPayload() {
  console.log('🧪 Testing FIXED Full Payload with asr.quality = "high"');
  console.log('='.repeat(60));
  
  const fixedPayload = {
    name: "FIXED Test Agent",
    conversation_config: {
      agent: {
        prompt: {
          prompt: "You are a helpful AI assistant."
        },
        first_message: "Hello! How can I help you?",
        language: "en"
      },
      tts: {
        voice_id: "EXAVITQu4vr4xnSDxMaL",
        stability: 0.5,
        similarity_boost: 0.75,
        optimize_streaming_latency: 3
      },
      conversation: {
        max_duration_seconds: 1800
      },
      asr: {
        quality: "high"
      }
    },
    platform_settings: {
      widget_enabled: true
    }
  };
  
  console.log('Payload:', JSON.stringify(fixedPayload, null, 2));
  
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fixedPayload),
  });
  
  console.log('\nResponse Status:', response.status, response.statusText);
  
  const responseData = await response.text();
  console.log('Response Body:', responseData);
  
  if (response.ok) {
    console.log('\n✅ SUCCESS! The fix works - agent created with full configuration!');
    const data = JSON.parse(responseData);
    console.log('Agent ID:', data.agent_id);
  } else {
    console.log('\n❌ FAILED: Still getting errors');
  }
}

testFixedPayload();
