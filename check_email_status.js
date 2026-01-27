const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Get the test user
    const user = await prisma.user.findUnique({
      where: { email: 'michaelmendeznow@gmail.com' },
      select: { id: true, email: true, name: true }
    });
    console.log('\n==== USER ====');
    console.log(user);

    if (!user) {
      console.log('User not found');
      return;
    }

    // Check Gmail connection
    const gmailConn = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'EMAIL',
        providerType: 'GMAIL'
      },
      select: {
        id: true,
        status: true,
        channelIdentifier: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true
      }
    });
    console.log('\n==== GMAIL CONNECTION ====');
    if (gmailConn) {
      console.log({
        ...gmailConn,
        accessToken: gmailConn.accessToken ? `${gmailConn.accessToken.substring(0, 20)}...` : null,
        refreshToken: gmailConn.refreshToken ? `${gmailConn.refreshToken.substring(0, 20)}...` : null
      });
    } else {
      console.log('No Gmail connection found');
    }

    // Get voice agents
    const voiceAgents = await prisma.voiceAgent.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        sendRecordingEmail: true,
        recordingEmailAddress: true
      }
    });
    console.log('\n==== VOICE AGENTS ====');
    console.log(voiceAgents);

    // Get recent call logs
    const callLogs = await prisma.callLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        twilioCallSid: true,
        elevenLabsConversationId: true,
        status: true,
        duration: true,
        emailSent: true,
        emailSentAt: true,
        createdAt: true,
        voiceAgent: {
          select: {
            name: true,
            sendRecordingEmail: true,
            recordingEmailAddress: true
          }
        }
      }
    });
    console.log('\n==== RECENT CALL LOGS ====');
    callLogs.forEach((log, index) => {
      console.log(`\n--- Call ${index + 1} ---`);
      console.log({
        id: log.id,
        twilioCallSid: log.twilioCallSid,
        elevenLabsConversationId: log.elevenLabsConversationId,
        status: log.status,
        duration: log.duration,
        emailSent: log.emailSent,
        emailSentAt: log.emailSentAt,
        createdAt: log.createdAt,
        voiceAgent: log.voiceAgent
      });
    });

  } finally {
    await prisma.$disconnect();
  }
})();
