import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking recent call logs...\n');
  
  const calls = await prisma.callLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      voiceAgent: { select: { name: true } }
    }
  });
  
  console.log(`Found ${calls.length} recent calls:\n`);
  
  calls.forEach((call, i) => {
    console.log(`${i + 1}. ${call.voiceAgent?.name || 'Unknown Agent'}`);
    console.log(`   From: ${call.fromNumber} → To: ${call.toNumber}`);
    console.log(`   Status: ${call.status} | Duration: ${call.duration || 0}s`);
    console.log(`   ElevenLabs ID: ${call.elevenLabsConversationId || 'N/A'}`);
    console.log(`   Recording: ${call.recordingUrl ? '✅ Yes' : '❌ No'}`);
    console.log(`   Transcript: ${call.transcription ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${call.createdAt.toLocaleString()}\n`);
  });
  
  const byStatus = await prisma.callLog.groupBy({
    by: ['status'],
    _count: true
  });
  
  console.log('\n📊 Calls by status:');
  byStatus.forEach(s => console.log(`   ${s.status}: ${s._count}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
