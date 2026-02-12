/**
 * Clear stale CRM voice agent IDs that no longer exist in ElevenLabs.
 * Run this if you get "agent not found" errors.
 *
 * Usage: npx tsx scripts/clear-stale-crm-voice-agent.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { prisma } from '../lib/db';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY required');
  process.exit(1);
}

async function main() {
  const users = await prisma.user.findMany({
    where: { crmVoiceAgentId: { not: null } },
    select: { id: true, name: true, crmVoiceAgentId: true },
  });

  for (const user of users) {
    if (!user.crmVoiceAgentId) continue;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${user.crmVoiceAgentId}`,
      { headers: { 'xi-api-key': apiKey } }
    );
    if (!res.ok) {
      console.log(`Clearing stale agent for ${user.name}: ${user.crmVoiceAgentId}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { crmVoiceAgentId: null },
      });
    }
  }

  console.log('Done. Next time you open AI Brain chat, a new agent will be created.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
