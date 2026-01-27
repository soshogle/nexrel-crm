import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function verifyUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'beshater@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        role: true,
        onboardingCompleted: true,
        industry: true,
        createdAt: true,
      }
    });
    
    console.log('\n📋 User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', user?.name);
    console.log('Email:', user?.email);
    console.log('Role:', user?.role);
    console.log('Account Status:', user?.accountStatus);
    console.log('Industry:', user?.industry || 'Not set');
    console.log('Onboarding:', user?.onboardingCompleted ? 'Complete' : 'Incomplete');
    console.log('Created:', user?.createdAt.toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (user?.accountStatus === 'PENDING_APPROVAL') {
      console.log('\n✅ VERIFICATION PASSED!');
      console.log('When this user logs in, they will:');
      console.log('1. Be redirected to /dashboard/pending-approval');
      console.log('2. See a message about waiting for admin approval');
      console.log('3. NOT have access to the full CRM');
      console.log('4. Need to be approved by a super admin from /platform-admin\n');
    } else {
      console.log('\n❌ Status is not PENDING_APPROVAL');
      console.log('Current status:', user?.accountStatus);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();
