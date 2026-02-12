/**
 * Seed multiple voice agents for a user to test the My Voice Agents UI
 * Usage: npx tsx scripts/seed-voice-agents.ts [userEmail]
 * If no email provided, uses the first non-super-admin user.
 */

import { PrismaClient } from '@prisma/client';
import { getVoiceAgentTemplates } from '../lib/voice-agent-templates';

const prisma = new PrismaClient();

async function main() {
  const userEmail = process.argv[2];

  const user = userEmail
    ? await prisma.user.findUnique({ where: { email: userEmail } })
    : await prisma.user.findFirst({
        where: { role: { not: 'SUPER_ADMIN' } },
        orderBy: { createdAt: 'asc' },
      });

  if (!user) {
    console.error('No user found. Usage: npx tsx scripts/seed-voice-agents.ts [userEmail]');
    process.exit(1);
  }

  const existing = await prisma.voiceAgent.count({ where: { userId: user.id } });
  const limit = 12;
  const toCreate = Math.min(5, limit - existing);

  if (toCreate <= 0) {
    console.log(`User ${user.email} already has ${existing} agents (max ${limit}). Nothing to create.`);
    process.exit(0);
  }

  const templates = getVoiceAgentTemplates(null).slice(0, toCreate);

  for (const template of templates) {
    await prisma.voiceAgent.create({
      data: {
        userId: user.id,
        name: template.name,
        description: template.description,
        type: template.id.includes('follow') || template.id.includes('reminder') ? 'OUTBOUND' : 'BOTH',
        status: 'ACTIVE',
        businessName: user.name || user.email?.split('@')[0] || 'My Business',
      },
    });
    console.log(`Created: ${template.name}`);
  }

  console.log(`\nCreated ${templates.length} voice agents for ${user.email}. Visit /dashboard/voice-agents to see them.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
