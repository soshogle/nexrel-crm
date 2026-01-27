import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testSession() {
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: 'michaelmendeznow@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyId: true,
      }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('=== USER DETAILS ===');
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Agency ID: ${user.agencyId}`);
    
    // Check leads for this user
    const leadsCount = await prisma.lead.count({
      where: { userId: user.id }
    });
    
    console.log(`\n=== LEADS FOR THIS USER ===`);
    console.log(`Total leads: ${leadsCount}`);
    
    // Check if there's a session for this user
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { expires: 'desc' },
      take: 5
    });
    
    console.log(`\n=== ACTIVE SESSIONS ===`);
    console.log(`Sessions found: ${sessions.length}`);
    sessions.forEach((s, i) => {
      console.log(`Session ${i + 1}:`);
      console.log(`  Token: ${s.sessionToken.substring(0, 20)}...`);
      console.log(`  Expires: ${s.expires}`);
      console.log(`  User ID: ${s.userId}`);
    });
    
    // Check accounts (Google OAuth)
    const accounts = await prisma.account.findMany({
      where: { userId: user.id }
    });
    
    console.log(`\n=== LINKED ACCOUNTS ===`);
    console.log(`Accounts found: ${accounts.length}`);
    accounts.forEach((a, i) => {
      console.log(`Account ${i + 1}:`);
      console.log(`  Provider: ${a.provider}`);
      console.log(`  Type: ${a.type}`);
      console.log(`  Provider Account ID: ${a.providerAccountId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSession();
