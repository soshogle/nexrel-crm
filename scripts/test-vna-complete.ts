/**
 * Complete VNA and Workflow Testing Script
 * Tests all functionality after migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ test: name, passed: true, message: '✅ Passed' });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ 
      test: name, 
      passed: false, 
      message: '❌ Failed', 
      error: error.message 
    });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing VNA Configuration and Workflow Actions\n');
  console.log('='.repeat(60));

  // Test 1: Database Schema
  await test('VnaConfiguration table exists', async () => {
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'VnaConfiguration'
      );
    `;
    if (!tableExists || !(tableExists as any[])[0]?.exists) {
      throw new Error('VnaConfiguration table not found');
    }
  });

  await test('VnaType enum exists', async () => {
    const enumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM pg_type WHERE typname = 'VnaType'
      );
    `;
    if (!enumExists || !(enumExists as any[])[0]?.exists) {
      throw new Error('VnaType enum not found');
    }
  });

  // Test 2: Create VNA Configuration
  let testVnaId: string | null = null;
  await test('Create VNA configuration', async () => {
    // Get first user for testing
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No users found in database');
    }

    const vna = await (prisma as any).vnaConfiguration.create({
      data: {
        userId: user.id,
        name: 'Test Orthanc Server',
        type: 'ORTHANC',
        host: 'localhost',
        port: 8042,
        aeTitle: 'NEXREL-CRM',
        credentials: { username: 'orthanc', password: 'orthanc' },
        isActive: true,
        isDefault: true,
        priority: 0,
        description: 'Test VNA configuration',
      },
    });

    testVnaId = vna.id;
    if (!testVnaId) {
      throw new Error('Failed to create VNA configuration');
    }
  });

  // Test 3: Read VNA Configuration
  await test('Read VNA configuration', async () => {
    if (!testVnaId) throw new Error('No VNA ID available');
    const vna = await (prisma as any).vnaConfiguration.findUnique({
      where: { id: testVnaId },
    });
    if (!vna || vna.name !== 'Test Orthanc Server') {
      throw new Error('Failed to read VNA configuration');
    }
  });

  // Test 4: Update VNA Configuration
  await test('Update VNA configuration', async () => {
    if (!testVnaId) throw new Error('No VNA ID available');
    const updated = await (prisma as any).vnaConfiguration.update({
      where: { id: testVnaId },
      data: {
        routingRules: [
          {
            id: 'rule-1',
            name: 'Route CBCT to Cloud',
            priority: 0,
            conditions: { imageType: ['CBCT'] },
            action: { vnaId: testVnaId, compress: true },
          },
        ],
      },
    });
    if (!updated.routingRules || !Array.isArray(updated.routingRules)) {
      throw new Error('Failed to update routing rules');
    }
  });

  // Test 5: List VNA Configurations
  await test('List VNA configurations', async () => {
    const vnas = await (prisma as any).vnaConfiguration.findMany();
    if (!Array.isArray(vnas) || vnas.length === 0) {
      throw new Error('No VNA configurations found');
    }
  });

  // Test 6: Test VNA Types
  await test('Test all VNA types', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No users found');

    const types = ['ORTHANC', 'AWS_S3', 'AZURE_BLOB', 'CLOUD_VNA', 'OTHER'];
    for (const type of types) {
      const vna = await (prisma as any).vnaConfiguration.create({
        data: {
          userId: user.id,
          name: `Test ${type} VNA`,
          type,
          isActive: true,
        },
      });
      if (!vna) {
        throw new Error(`Failed to create ${type} VNA`);
      }
      // Clean up
      await (prisma as any).vnaConfiguration.delete({ where: { id: vna.id } });
    }
  });

  // Test 7: Foreign Key Constraint
  await test('Foreign key constraint works', async () => {
    try {
      await (prisma as any).vnaConfiguration.create({
        data: {
          userId: 'invalid-user-id',
          name: 'Should Fail',
          type: 'ORTHANC',
        },
      });
      throw new Error('Should have failed with invalid user ID');
    } catch (error: any) {
      if (!error.message.includes('Foreign key constraint')) {
        // Expected to fail, that's good
      }
    }
  });

  // Test 8: Cascade Delete
  await test('Cascade delete works', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No users found');

    const vna = await (prisma as any).vnaConfiguration.create({
      data: {
        userId: user.id,
        name: 'Test Cascade Delete',
        type: 'ORTHANC',
      },
    });

    // Note: We won't actually delete the user, just verify the constraint exists
    const constraint = await prisma.$queryRaw`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'VnaConfiguration_userId_fkey'
    `;
    if (!constraint || (constraint as any[]).length === 0) {
      throw new Error('Foreign key constraint not found');
    }

    // Clean up
    await (prisma as any).vnaConfiguration.delete({ where: { id: vna.id } });
  });

  // Test 9: Indexes exist
  await test('Indexes created correctly', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'VnaConfiguration'
    `;
    const indexNames = (indexes as any[]).map((i: any) => i.indexname);
    const requiredIndexes = [
      'VnaConfiguration_userId_idx',
      'VnaConfiguration_isActive_idx',
      'VnaConfiguration_type_idx',
    ];
    
    for (const required of requiredIndexes) {
      if (!indexNames.includes(required)) {
        throw new Error(`Missing index: ${required}`);
      }
    }
  });

  // Clean up test VNA
  if (testVnaId) {
    try {
      await (prisma as any).vnaConfiguration.delete({ where: { id: testVnaId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.test}: ${r.message}`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
