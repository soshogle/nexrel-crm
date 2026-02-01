import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Instagram Webhook Test Endpoint
 * Provides webhook testing functionality
 */

export async function POST(request: NextRequest) {
  try {
    const { testType, verifyToken, baseUrl } = await request.json();

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    // Test 1: Webhook Verification
    if (testType === 'all' || testType === 'verification') {
      const challenge = 'test_' + Math.random().toString(36).substring(7);
      const testUrl = `${baseUrl || request.nextUrl.origin}/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`;

      try {
        const response = await fetch(testUrl);
        const responseText = await response.text();

        results.tests.push({
          name: 'Webhook Verification',
          passed: response.ok && responseText === challenge,
          status: response.status,
          expected: challenge,
          received: responseText,
          message:
            response.ok && responseText === challenge
              ? 'Verification successful'
              : 'Verification failed - response mismatch',
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Webhook Verification',
          passed: false,
          error: error.message,
          message: 'Failed to connect to webhook endpoint',
        });
      }
    }

    // Test 2: Message Handling
    if (testType === 'all' || testType === 'messaging') {
      const testPayload = {
        object: 'instagram',
        entry: [
          {
            id: '123456789',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'test_user_123' },
                recipient: { id: 'test_page_123' },
                timestamp: Date.now(),
                message: {
                  mid: 'test_msg_' + Math.random().toString(36).substring(7),
                  text: 'Test message',
                },
              },
            ],
          },
        ],
      };

      try {
        const response = await fetch(`${baseUrl || request.nextUrl.origin}/api/instagram/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
        });

        const data = await response.json();

        results.tests.push({
          name: 'Message Handling',
          passed: response.ok && data.received,
          status: response.status,
          response: data,
          message: response.ok ? 'Message handling successful' : 'Message handling failed',
        });
      } catch (error: any) {
        results.tests.push({
          name: 'Message Handling',
          passed: false,
          error: error.message,
          message: 'Failed to send test message',
        });
      }
    }

    const allPassed = results.tests.every((test: any) => test.passed);

    return NextResponse.json({
      success: allPassed,
      ...results,
    });
  } catch (error: any) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/instagram/webhook/test',
    description: 'Test Instagram webhook endpoint',
    methods: ['POST'],
    payload: {
      testType: 'all | verification | messaging',
      verifyToken: 'Your Instagram verify token',
      baseUrl: 'Optional: Base URL for testing (defaults to request origin)',
    },
  });
}
