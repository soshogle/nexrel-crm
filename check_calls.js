const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n📞 RECENT CALL LOGS (Last 10):');
  console.log('='.repeat(80));
  
  const calls = await prisma.callLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      voiceAgent: { select: { name: true } }
    }
  });
  
  for (const call of calls) {
    console.log(`\nCall ID: ${call.id}`);
    console.log(`Agent: ${call.voiceAgent?.name || 'N/A'}`);
    console.log(`Status: ${call.status}`);
    console.log(`Direction: ${call.direction || 'N/A'}`);
    console.log(`From: ${call.fromNumber || 'N/A'}`);
    console.log(`To: ${call.toNumber || 'N/A'}`);
    console.log(`Duration: ${call.duration ? `${call.duration}s` : 'N/A'}`);
    console.log(`Has Recording: ${call.recordingUrl ? 'YES' : 'NO'}`);
    console.log(`Has Transcript: ${call.transcription ? 'YES' : 'NO'}`);
    console.log(`Email Sent: ${call.emailSent ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Email Sent At: ${call.emailSentAt || 'N/A'}`);
    console.log(`Created: ${call.createdAt}`);
    console.log('-'.repeat(80));
  }
  
  console.log('\n📊 CALL STATUS SUMMARY:');
  console.log('='.repeat(80));
  const statusCounts = await prisma.callLog.groupBy({
    by: ['status'],
    _count: true
  });
  
  for (const stat of statusCounts) {
    console.log(`${stat.status}: ${stat._count}`);
  }
  
  console.log('\n📧 EMAIL NOTIFICATION STATUS:');
  console.log('='.repeat(80));
  const emailStats = await prisma.callLog.groupBy({
    by: ['emailSent'],
    _count: true
  });
  
  for (const stat of emailStats) {
    console.log(`Email Sent = ${stat.emailSent}: ${stat._count} calls`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
