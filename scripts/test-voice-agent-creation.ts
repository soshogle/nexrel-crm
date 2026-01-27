#!/usr/bin/env tsx
/**
 * Integration test for voice agent creation with the fixed payload
 */

import 'dotenv/config';
import { elevenLabsProvisioning } from '../lib/elevenlabs-provisioning';

async function testVoiceAgentCreation() {
  console.log('🧪 Testing Voice Agent Creation (Integration Test)');
  console.log('='.repeat(60));
  console.log('');
  
  const testAgentOptions = {
    name: 'Integration Test Agent',
    businessName: 'Test Business Inc',
    businessIndustry: 'Technology',
    greetingMessage: 'Hi! This is a test agent. How can I help?',
    systemPrompt: 'You are a test assistant.',
    language: 'en',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    maxCallDuration: 1800,
    userId: 'test-user-id',
    voiceAgentId: 'test-voice-agent-id',
  };
  
  console.log('Creating test agent with options:', {
    name: testAgentOptions.name,
    businessName: testAgentOptions.businessName,
    voiceId: testAgentOptions.voiceId,
  });
  console.log('');
  
  try {
    // This will use our fixed payload with asr.quality = "high"
    const result = await elevenLabsProvisioning.createAgent(testAgentOptions);
    
    console.log('');
    console.log('Result:', result);
    console.log('');
    
    if (result.success) {
      console.log('✅ SUCCESS! Voice agent created successfully');
      console.log('   Agent ID:', result.agentId);
      console.log('');
      console.log('🎉 The fix works! Voice agents can now be created without 500 errors.');
      
      // Clean up - delete the test agent
      if (result.agentId) {
        console.log('');
        console.log('🗑️  Cleaning up test agent...');
        const deleteResult = await elevenLabsProvisioning.deleteAgent(result.agentId, testAgentOptions.userId);
        if (deleteResult.success) {
          console.log('✅ Test agent deleted successfully');
        }
      }
    } else {
      console.log('❌ FAILED! Voice agent creation failed');
      console.log('   Error:', result.error);
      console.log('');
      console.log('The fix did not work as expected. Please review the error above.');
      process.exit(1);
    }
  } catch (error: any) {
    console.log('');
    console.log('❌ EXCEPTION during voice agent creation:');
    console.log('   Error:', error.message);
    console.log('   Stack:', error.stack);
    process.exit(1);
  }
}

testVoiceAgentCreation();
