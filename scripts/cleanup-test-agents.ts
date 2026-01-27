#!/usr/bin/env tsx
import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function cleanupTestAgents() {
  console.log('🗑️  Cleaning up test agents...\n');
  
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
  });
  
  if (!response.ok) {
    console.log('Failed to fetch agents');
    return;
  }
  
  const data = await response.json();
  const agents = data.agents || [];
  
  const testAgents = agents.filter((a: any) => 
    a.name?.toLowerCase().includes('test') || 
    a.name?.toLowerCase().includes('fixed')
  );
  
  console.log(`Found ${testAgents.length} test agent(s) to clean up\n`);
  
  for (const agent of testAgents) {
    console.log(`Deleting: ${agent.name} (${agent.agent_id})`);
    const deleteResponse = await fetch(
      `${ELEVENLABS_BASE_URL}/convai/agents/${agent.agent_id}`,
      {
        method: 'DELETE',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
      }
    );
    
    if (deleteResponse.ok) {
      console.log('  ✅ Deleted\n');
    } else {
      console.log('  ⚠️  Failed to delete\n');
    }
  }
  
  console.log('✅ Cleanup complete');
}

cleanupTestAgents();
