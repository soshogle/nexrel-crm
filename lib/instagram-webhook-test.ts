/**
 * Instagram Webhook Test Utility
 * Tests webhook endpoint verification and message handling
 */

export interface WebhookTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function testWebhookVerification(
  baseUrl: string,
  verifyToken: string
): Promise<WebhookTestResult> {
  const challenge = 'test_challenge_' + Math.random().toString(36).substring(7);
  const url = `${baseUrl}/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${challenge}`;

  try {
    const response = await fetch(url);
    const responseText = await response.text();

    if (response.ok && responseText === challenge) {
      return {
        success: true,
        message: 'Webhook verification successful',
        details: { challenge, response: responseText },
      };
    } else {
      return {
        success: false,
        message: `Verification failed. Expected: ${challenge}, Got: ${responseText}`,
        details: { status: response.status, challenge, response: responseText },
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Error testing webhook: ${error.message}`,
      details: error,
    };
  }
}

export async function testWebhookMessageHandling(
  baseUrl: string
): Promise<WebhookTestResult> {
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
              text: 'Test message from webhook utility',
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`${baseUrl}/api/instagram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    if (response.ok && data.received) {
      return {
        success: true,
        message: 'Message handling endpoint is working',
        details: data,
      };
    } else {
      return {
        success: false,
        message: 'Message handling failed',
        details: { status: response.status, data },
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Error testing message handling: ${error.message}`,
      details: error,
    };
  }
}
