import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function updateUserStatus() {
  try {
    console.log('🔍 Looking for user: beshater@gmail.com');
    
    const user = await prisma.user.update({
      where: { email: 'beshater@gmail.com' },
      data: { accountStatus: 'PENDING_APPROVAL' },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        role: true,
        createdAt: true,
      }
    });
    
    console.log('\n✅ User status updated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.accountStatus);
    console.log('Created:', user.createdAt.toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ This user will now see the pending approval page');
    console.log('   and must be approved by a super admin to access the CRM.\n');
    
  } catch (error: any) {
    console.error('❌ Error updating user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateUserStatus();
