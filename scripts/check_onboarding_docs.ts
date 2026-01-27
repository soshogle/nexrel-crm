import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOnboardingDocs() {
  try {
    // Find user by email with onboarding fields
    const user = await prisma.user.findUnique({
      where: { email: 'pharmacie4177@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        onboardingCompleted: true,
        onboardingProgress: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found with email: pharmacie4177@gmail.com');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: user.onboardingCompleted
    });
    console.log('');

    // Check onboarding progress
    if (!user.onboardingProgress) {
      console.log('❌ No onboarding progress data found for this user');
      console.log('   The onboardingProgress field is null or empty');
      return;
    }

    // Parse the JSON field
    const progress = typeof user.onboardingProgress === 'string' 
      ? JSON.parse(user.onboardingProgress) 
      : user.onboardingProgress;

    console.log('📋 Onboarding Progress Data:');
    console.log(JSON.stringify(progress, null, 2));
    console.log('');

    // Check for uploaded documents
    if (progress.uploadedDocuments) {
      const docs = Array.isArray(progress.uploadedDocuments) 
        ? progress.uploadedDocuments 
        : [];
      
      console.log('📁 Uploaded Documents:', docs.length, 'files');
      console.log('');
      
      if (docs.length > 0) {
        docs.forEach((doc: any, index: number) => {
          console.log(`  Document ${index + 1}:`);
          console.log(`    Filename: ${doc.filename || doc.name || 'Unknown'}`);
          if (doc.size) console.log(`    Size: ${doc.size} bytes`);
          if (doc.uploadDate) console.log(`    Upload Date: ${doc.uploadDate}`);
          if (doc.extractedText) {
            const preview = doc.extractedText.substring(0, 100);
            console.log(`    Text Preview: "${preview}..."`);
            console.log(`    Text Length: ${doc.extractedText.length} characters`);
          }
          console.log('');
        });
      } else {
        console.log('  ℹ️  No documents in the uploadedDocuments array');
      }
    } else {
      console.log('📁 No uploadedDocuments field found in onboarding progress');
    }

    // Check for extracted text (might be at root level)
    if (progress.extractedText) {
      const textLength = progress.extractedText.length;
      const preview = progress.extractedText.substring(0, 200);
      
      console.log('📝 Extracted Text (root level):');
      console.log(`  Total Length: ${textLength} characters`);
      console.log(`  Preview: "${preview}..."`);
      console.log('');
    }

    // Show other onboarding fields
    console.log('🔧 Other Onboarding Fields:');
    if (progress.currentStep !== undefined) {
      console.log(`  Current Step: ${progress.currentStep}`);
    }
    if (progress.completedSteps) {
      console.log(`  Completed Steps:`, progress.completedSteps);
    }
    if (progress.businessName) {
      console.log(`  Business Name: ${progress.businessName}`);
    }
    if (progress.industry) {
      console.log(`  Industry: ${progress.industry}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOnboardingDocs();
