#!/usr/bin/env npx tsx
/**
 * Fix all AI employee agents: multilingual prompt + voice-gender matching.
 * Updates existing agents in ElevenLabs and DB.
 *
 * Run: npx tsx scripts/fix-ai-employee-voices-and-multilingual.ts
 * Run: npx tsx scripts/fix-ai-employee-voices-and-multilingual.ts --dry-run
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { prisma } from '../lib/db';
import { elevenLabsProvisioning } from '../lib/elevenlabs-provisioning';
import { RE_AI_EMPLOYEE_PROMPTS } from '../lib/real-estate/ai-employee-prompts';
import { getIndustryAIEmployeeModule } from '../lib/industry-ai-employees/registry';
import { PROFESSIONAL_EMPLOYEE_PROMPTS } from '../lib/professional-ai-employees/prompts';
import { Industry, REAIEmployeeType } from '@prisma/client';
import type { ProfessionalAIEmployeeType } from '../lib/professional-ai-employees/config';

async function fixAgent(
  agentId: string,
  name: string,
  systemPrompt: string,
  firstMessage: string,
  voiceId: string,
  userId: string | undefined,
  updateDb: ((voiceId: string) => Promise<void>) | null
): Promise<{ updated: boolean; error?: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_RE_API_KEY;
  if (!apiKey) return { updated: false, error: 'No API key' };

  const result = await elevenLabsProvisioning.updateAgent(
    agentId,
    { systemPrompt, greetingMessage: firstMessage, voiceId },
    userId
  );

  if (!result.success) return { updated: false, error: result.error };
  if (updateDb) await updateDb(voiceId);
  return { updated: true };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('🔧 Fixing AI employee agents: multilingual + voice-gender matching\n');
  if (dryRun) console.log('DRY RUN - no changes will be made\n');

  let totalUpdated = 0;
  let totalFailed = 0;

  // 1. RE AI Employee Agents
  const reAgents = await prisma.rEAIEmployeeAgent.findMany({
    select: { id: true, name: true, employeeType: true, elevenLabsAgentId: true, userId: true, voiceId: true },
  });
  console.log(`📋 REAIEmployeeAgent: ${reAgents.length} agents`);
  for (const a of reAgents) {
    const promptConfig = RE_AI_EMPLOYEE_PROMPTS[a.employeeType as REAIEmployeeType];
    if (!promptConfig) {
      console.log(`  ⏭️  ${a.name} (${a.employeeType}) - no prompt config`);
      continue;
    }
    const voiceId = promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL';
    if (dryRun) {
      console.log(`  [DRY] ${a.name} → voiceId=${voiceId}`);
      totalUpdated++;
      continue;
    }
    const r = await fixAgent(
      a.elevenLabsAgentId,
      a.name,
      promptConfig.systemPrompt,
      promptConfig.firstMessage,
      voiceId,
      a.userId,
      async (vid) => {
        await prisma.rEAIEmployeeAgent.update({
          where: { id: a.id },
          data: { voiceId: vid },
        });
      }
    );
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // 2. Industry AI Employee Agents
  const industryAgents = await prisma.industryAIEmployeeAgent.findMany({
    select: { id: true, name: true, industry: true, employeeType: true, elevenLabsAgentId: true, userId: true, voiceId: true },
  });
  console.log(`\n📋 IndustryAIEmployeeAgent: ${industryAgents.length} agents`);
  for (const a of industryAgents) {
    const module = getIndustryAIEmployeeModule(a.industry as Industry);
    const promptConfig = module?.prompts[a.employeeType];
    if (!promptConfig) {
      console.log(`  ⏭️  ${a.name} (${a.industry}.${a.employeeType}) - no prompt config`);
      continue;
    }
    const voiceId = promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL';
    if (dryRun) {
      console.log(`  [DRY] ${a.name} → voiceId=${voiceId}`);
      totalUpdated++;
      continue;
    }
    const r = await fixAgent(
      a.elevenLabsAgentId,
      a.name,
      promptConfig.systemPrompt,
      promptConfig.firstMessage,
      voiceId,
      a.userId,
      async (vid) => {
        await prisma.industryAIEmployeeAgent.update({
          where: { id: a.id },
          data: { voiceId: vid },
        });
      }
    );
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // 3. Professional AI Employee Agents
  const profAgents = await prisma.professionalAIEmployeeAgent.findMany({
    select: { id: true, name: true, employeeType: true, elevenLabsAgentId: true, userId: true, voiceId: true },
  });
  console.log(`\n📋 ProfessionalAIEmployeeAgent: ${profAgents.length} agents`);
  for (const a of profAgents) {
    const promptConfig = PROFESSIONAL_EMPLOYEE_PROMPTS[a.employeeType as ProfessionalAIEmployeeType];
    if (!promptConfig) {
      console.log(`  ⏭️  ${a.name} (${a.employeeType}) - no prompt config`);
      continue;
    }
    const voiceId = promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL';
    if (dryRun) {
      console.log(`  [DRY] ${a.name} → voiceId=${voiceId}`);
      totalUpdated++;
      continue;
    }
    const r = await fixAgent(
      a.elevenLabsAgentId,
      a.name,
      promptConfig.systemPrompt,
      promptConfig.firstMessage,
      voiceId,
      a.userId,
      async (vid) => {
        await prisma.professionalAIEmployeeAgent.update({
          where: { id: a.id },
          data: { voiceId: vid },
        });
      }
    );
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n📊 Done. Updated: ${totalUpdated}, Failed: ${totalFailed}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
