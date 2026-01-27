import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOnboardingUpdate() {
  try {
    console.log('Testing database connection...');
    
    // Find a test user
    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@'
        }
      }
    });
    
    if (!user) {
      console.log('No users found in database');
      return;
    }
    
    console.log('Found user:', {
      id: user.id,
      email: user.email,
      name: user.name
    });
    
    // Test data that would be sent from onboarding step 1
    const testData = {
      name: 'Test Company',
      phone: '123-456-7890',
      address: '123 Test St',
      website: 'https://test.com',
      businessDescription: 'Test description',
      updatedAt: new Date()
    };
    
    console.log('\nAttempting to update user with:', testData);
    
    // Try the update
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: testData
    });
    
    console.log('\nUpdate successful!');
    console.log('Updated user:', {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      website: updated.website
    });
    
  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Meta:', error.meta);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOnboardingUpdate();
