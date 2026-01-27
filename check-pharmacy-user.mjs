import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'pharmacie4177@gmail.com' },
    });
    
    console.log('\n=== USER CHECK: pharmacie4177@gmail.com ===\n');
    if (!user) {
      console.log('❌ User NOT FOUND in database\n');
      return;
    }
    
    console.log('✅ User EXISTS in database');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Industry:', user.industry);
    console.log('Business Category:', user.businessCategory);
    console.log('Onboarding Completed:', user.onboardingCompleted);
    console.log('Created At:', user.createdAt);
    
    console.log('\n=== SUPER ADMIN DASHBOARD VISIBILITY ===');
    console.log('Is SUPER_ADMIN role?', user.role === 'SUPER_ADMIN');
    console.log('Should appear in dashboard?', user.role !== 'SUPER_ADMIN');
    
    if (user.role === 'SUPER_ADMIN') {
      console.log('\n⚠️  This user has SUPER_ADMIN role');
      console.log('   Super Admins are EXCLUDED from the user list');
      console.log('   to prevent impersonating other admins\n');
    } else {
      console.log('\n✅ This user SHOULD appear in Super Admin dashboard\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
