import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentCalls() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const recentCalls = await prisma.callLog.findMany({
    where: {
      createdAt: { gte: fiveMinutesAgo }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      voiceAgent: { select: { name: true, id: true } }
    }
  });
  
  console.log('Recent calls (last 5 minutes):', recentCalls.length);
  recentCalls.forEach(call => {
    console.log({
      id: call.id,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      status: call.status,
      agent: call.voiceAgent?.name,
      createdAt: call.createdAt,
      elevenLabsConversationId: call.elevenLabsConversationId
    });
  });
  
  const specificCall = await prisma.callLog.findFirst({
    where: {
      OR: [
        { toNumber: { contains: '4506391671' } },
        { fromNumber: { contains: '4506391671' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (specificCall) {
    console.log('Call to/from +1 450 639 1671:');
    console.log(JSON.stringify(specificCall, null, 2));
  } else {
    console.log('No call found for +1 450 639 1671');
  }
  
  await prisma.$disconnect();
}

checkRecentCalls().catch(console.error);
