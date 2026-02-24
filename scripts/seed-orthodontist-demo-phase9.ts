/**
 * Orthodontist Demo - Phase 9: Messaging & Conversations
 * Creates: ChannelConnection (2-4), Conversation (20-30), ConversationMessage (60-300)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const USER_EMAIL = 'orthodontist@nexrel.com';

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const INBOUND_MESSAGES = [
  "Hi, I'd like to book a consultation for my daughter.",
  'When is my next adjustment appointment?',
  'My bracket came off, what should I do?',
  'Can I reschedule my appointment for next week?',
  "Thanks for the reminder! I'll be there.",
  'Do you offer payment plans for Invisalign?',
  'Is the office open on Saturdays?',
  'I have a question about my retainer.',
];

const OUTBOUND_MESSAGES = [
  'Thank you for reaching out! We have availability next week.',
  'Your appointment is confirmed for Tuesday at 2pm.',
  'Please come in as soon as possible for the bracket.',
  'We have rescheduled you to Thursday at 10am.',
  'Great! See you then.',
  'Yes, we offer flexible payment plans. Let me send you the details.',
  'We are open Saturdays 9am-1pm.',
  'Please bring your retainer to your next visit so we can check it.',
];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 9: Messaging & Conversations\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  if (leads.length < 20) {
    console.error('❌ Not enough leads. Run Phases 1-2 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${leads.length} leads\n`);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 9 data
  console.log('🧹 Cleaning existing Phase 9 data...');
  const existingChannels = await prisma.channelConnection.findMany({ where: { userId: user.id }, select: { id: true } });
  for (const ch of existingChannels) {
    const convos = await prisma.conversation.findMany({ where: { channelConnectionId: ch.id }, select: { id: true } });
    for (const c of convos) {
      await prisma.conversationMessage.deleteMany({ where: { conversationId: c.id } });
    }
    await prisma.conversation.deleteMany({ where: { channelConnectionId: ch.id } });
  }
  await prisma.channelConnection.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. ChannelConnections (2-4) ─────────────────────────────────────────────
  console.log('📱 Creating channel connections...');
  const channels = await Promise.all([
    prisma.channelConnection.create({
      data: {
        userId: user.id,
        channelType: 'SMS',
        channelIdentifier: '+15145550001',
        displayName: 'Montreal Orthodontics SMS',
        status: 'CONNECTED',
        providerType: 'twilio',
        isDefault: true,
        isActive: true,
      },
    }),
    prisma.channelConnection.create({
      data: {
        userId: user.id,
        channelType: 'EMAIL',
        channelIdentifier: 'info@montrealortho.com',
        displayName: 'Practice Email',
        status: 'CONNECTED',
        providerType: 'internal',
        isActive: true,
      },
    }),
    prisma.channelConnection.create({
      data: {
        userId: user.id,
        channelType: 'WHATSAPP',
        channelIdentifier: '+15145550002',
        displayName: 'WhatsApp Business',
        status: 'CONNECTED',
        providerType: 'whatsapp',
        isActive: true,
      },
    }),
    prisma.channelConnection.create({
      data: {
        userId: user.id,
        channelType: 'GOOGLE_BUSINESS',
        channelIdentifier: 'montreal-orthodontics',
        displayName: 'Google Business Messages',
        status: 'CONNECTED',
        providerType: 'google',
        isActive: true,
      },
    }),
  ]);
  console.log(`   ✓ Created ${channels.length} channel connections\n`);

  // ─── 2. Conversations (20-30) + Messages (60-300) ───────────────────────────
  console.log('💬 Creating conversations and messages...');
  let convCount = 0;
  let msgCount = 0;
  for (let i = 0; i < 25; i++) {
    const lead = leads[i % leads.length];
    const channel = channels[i % channels.length];
    const contactIdentifier =
      channel.channelType === 'EMAIL'
        ? lead.email || `lead${i}@example.com`
        : lead.phone || `514555${String(1000 + i).padStart(4, '0')}`;
    try {
      const conv = await prisma.conversation.create({
        data: {
          userId: user.id,
          channelConnectionId: channel.id,
          leadId: lead.id,
          contactName: lead.contactPerson || lead.businessName,
          contactIdentifier,
          status: randomElement(['ACTIVE', 'ACTIVE', 'ARCHIVED'] as const),
          unreadCount: Math.random() > 0.7 ? randomInt(1, 3) : 0,
          lastMessageAt: randomDate(threeMonthsAgo, now),
          lastMessagePreview: 'Thanks for your message!',
        },
      });
      convCount++;
      const numMessages = 2 + Math.floor(Math.random() * 8);
      for (let m = 0; m < numMessages; m++) {
        const direction = m % 2 === 0 ? 'INBOUND' : 'OUTBOUND';
        const content =
          direction === 'INBOUND'
            ? randomElement(INBOUND_MESSAGES)
            : randomElement(OUTBOUND_MESSAGES);
        await prisma.conversationMessage.create({
          data: {
            conversationId: conv.id,
            userId: user.id,
            direction,
            status: randomElement(['SENT', 'DELIVERED', 'READ'] as const),
            content,
            sentAt: randomDate(threeMonthsAgo, now),
            deliveredAt: Math.random() > 0.3 ? randomDate(threeMonthsAgo, now) : null,
            readAt: Math.random() > 0.5 ? randomDate(threeMonthsAgo, now) : null,
          },
        });
        msgCount++;
      }
    } catch (e: any) {
      if (!e?.code || e.code !== 'P2002') throw e;
      // unique constraint - skip
    }
  }
  console.log(`   ✓ Created ${convCount} conversations, ${msgCount} messages\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 9 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Channel connections: ${channels.length}`);
  console.log(`   • Conversations: ${convCount}, Messages: ${msgCount}`);
  console.log('\n🎉 Run Phase 10 next for call logs & voice.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
