import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAgent() {
  try {
    // Find Sarah voice agent
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        OR: [
          { name: { contains: 'Sarah', mode: 'insensitive' } },
          { name: { contains: 'Sara', mode: 'insensitive' } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            businessCategory: true
          }
        }
      }
    });
    
    console.log('\n=== VOICE AGENT CHECK: Sarah/Sara ===\n');
    if (!agent) {
      console.log('❌ No Sarah/Sara voice agent found\n');
      return;
    }
    
    console.log('✅ Voice Agent Found:');
    console.log('Agent ID:', agent.id);
    console.log('Agent Name:', agent.name);
    console.log('Phone Number:', agent.phoneNumber);
    console.log('ElevenLabs Agent ID:', agent.elevenLabsAgentId);
    console.log('Status:', agent.status);
    
    console.log('\n=== OWNER INFORMATION ===');
    console.log('Owner User ID:', agent.user.id);
    console.log('Owner Email:', agent.user.email);
    console.log('Owner Name:', agent.user.name);
    console.log('Owner Role:', agent.user.role);
    console.log('Business Category:', agent.user.businessCategory);
    
    console.log('\n=== SUPER ADMIN DASHBOARD ===');
    console.log('Is owner SUPER_ADMIN?', agent.user.role === 'SUPER_ADMIN');
    console.log('Should appear in dashboard?', agent.user.role !== 'SUPER_ADMIN');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAgent();
