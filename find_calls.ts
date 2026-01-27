import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find ALL call logs from Dec 1, 2025
  const callLogs = await prisma.callLog.findMany({
    where: {
      createdAt: {
        gte: new Date('2025-12-01T00:00:00Z'),
        lte: new Date('2025-12-02T00:00:00Z')
      }
    },
    include: {
      voiceAgent: {
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📊 Found ${callLogs.length} call logs from Dec 1, 2025\n`);

  for (const call of callLogs) {
    console.log(`📞 Call at ${call.createdAt.toISOString()}`);
    console.log(`   User: ${call.voiceAgent?.user.email} (${call.voiceAgent?.user.name})`);
    console.log(`   Agent: ${call.voiceAgent?.name}`);
    console.log(`   Status: ${call.status}, Duration: ${call.duration || 'N/A'}s`);
    console.log(`   From: ${call.fromNumber} → To: ${call.toNumber}\n`);
  }

  // Also check for michaelmendeznow@gmail.com
  const michaelUser = await prisma.user.findUnique({
    where: { email: 'michaelmendeznow@gmail.com' },
    include: {
      voiceAgents: {
        include: {
          _count: {
            select: { callLogs: true }
            }
          }
        }
      }
  });

  if (michaelUser) {
    console.log(`\n🔍 Michael's account:`);
    console.log(`   Email: ${michaelUser.email}`);
    console.log(`   Voice Agents: ${michaelUser.voiceAgents.length}`);
    for (const agent of michaelUser.voiceAgents) {
      console.log(`   - ${agent.name}: ${agent._count.callLogs} calls`);
      console.log(`     Send Email: ${agent.sendRecordingEmail}`);
      console.log(`     Email To: ${agent.recordingEmailAddress || 'NOT SET'}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
