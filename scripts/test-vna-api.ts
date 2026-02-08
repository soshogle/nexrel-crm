/**
 * API-Based VNA and Workflow Testing
 * Tests functionality via HTTP API endpoints
 */

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<any>) {
  try {
    const result = await fn();
    results.push({ test: name, passed: true, message: '✅ Passed', data: result });
    console.log(`✅ ${name}`);
    return result;
  } catch (error: any) {
    results.push({ 
      test: name, 
      passed: false, 
      message: `❌ Failed: ${error.message}`,
    });
    console.error(`❌ ${name}: ${error.message}`);
    throw error;
  }
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        console.log('✅ Server is ready');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server did not start in time');
}

async function runTests() {
  console.log('🧪 Testing VNA Configuration and Workflow Actions via API\n');
  console.log('='.repeat(60));

  // Wait for server
  console.log('⏳ Waiting for server to start...');
  await waitForServer();

  // Note: These tests require authentication
  // In a real scenario, you'd need to authenticate first
  console.log('\n⚠️  Note: These tests require authentication.');
  console.log('   Please ensure you are logged in and have a valid session.\n');

  // Test 1: Check API endpoint exists
  await test('VNA API endpoint exists', async () => {
    const response = await fetch(`${API_BASE}/api/dental/vna`, {
      method: 'GET',
    });
    
    // Should return 401 if not authenticated, or 200 if authenticated
    if (response.status === 401) {
      return { status: 'endpoint_exists', requiresAuth: true };
    }
    if (response.status === 200) {
      const data = await response.json();
      return { status: 'endpoint_exists', authenticated: true, vnas: data.vnas || [] };
    }
    throw new Error(`Unexpected status: ${response.status}`);
  });

  // Test 2: Check workflow triggers endpoint
  await test('Workflow triggers endpoint exists', async () => {
    const response = await fetch(`${API_BASE}/api/dental/workflows/templates`, {
      method: 'GET',
    });
    
    if (response.status === 401) {
      return { status: 'endpoint_exists', requiresAuth: true };
    }
    if (response.status === 200) {
      const data = await response.json();
      return { status: 'endpoint_exists', templates: data.templates || [] };
    }
    throw new Error(`Unexpected status: ${response.status}`);
  });

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.test}`);
    console.log(`   ${r.message}`);
    if (r.data) {
      console.log(`   Data: ${JSON.stringify(r.data).substring(0, 100)}...`);
    }
  });

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}\n`);

  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Navigate to http://localhost:3000/dashboard/dental/admin');
  console.log('2. Click "Configure VNAs" button');
  console.log('3. Create a test VNA configuration');
  console.log('4. Create routing rules');
  console.log('5. Test workflow actions via AI Employee workflow builder\n');

  if (failed === 0) {
    console.log('🎉 All API tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
