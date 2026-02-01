import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function decrypt(text: string): string {
  try {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-12';
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(key.slice(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return text;
  }
}

// POST /api/tools/execute - Execute a tool action
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { instanceId, actionType, method, endpoint, payload, context } = body;

    if (!instanceId || !actionType || !method || !endpoint) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: instanceId, actionType, method, endpoint',
        },
        { status: 400 }
      );
    }

    // Get tool instance
    const instance = await prisma.toolInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true },
    });

    if (!instance) {
      return NextResponse.json(
        { error: 'Tool instance not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (instance.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if tool is active
    if (instance.status === 'INACTIVE' || instance.status === 'FAILED') {
      return NextResponse.json(
        {
          error: `Tool is ${instance.status.toLowerCase()}. Please activate it first.`,
        },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const credentialsData: any = instance.credentials;
    const decryptedCredentials = JSON.parse(
      decrypt(credentialsData.encrypted)
    );

    // Build request URL
    const baseUrl = instance.definition.baseUrl || '';
    const fullUrl = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint}`;

    // Build headers based on auth type
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (instance.definition.authType === 'API_KEY') {
      headers['Authorization'] = `Bearer ${decryptedCredentials.apiKey}`;
    } else if (instance.definition.authType === 'BEARER_TOKEN') {
      headers['Authorization'] = `Bearer ${decryptedCredentials.token}`;
    } else if (instance.definition.authType === 'BASIC_AUTH') {
      const credentials = Buffer.from(
        `${decryptedCredentials.username}:${decryptedCredentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Execute API call
    let response: Response;
    let responseData: any;
    let success = false;
    let statusCode: number;
    let errorMessage: string | null = null;

    try {
      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(payload);
      }

      response = await fetch(fullUrl, requestOptions);
      statusCode = response.status;
      success = response.ok;

      // Try to parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { raw: await response.text() };
      }

      if (!success) {
        errorMessage = responseData.error || responseData.message || 'API call failed';
      }
    } catch (error: any) {
      success = false;
      statusCode = 0;
      errorMessage = error.message;
      responseData = { error: error.message };
    }

    const duration = Date.now() - startTime;

    // Log the action
    const action = await prisma.toolAction.create({
      data: {
        userId: session.user.id,
        instanceId,
        actionType,
        method,
        endpoint,
        requestPayload: payload || {},
        responsePayload: responseData,
        statusCode,
        duration,
        success,
        errorMessage,
        triggeredBy: context?.triggeredBy || 'User',
        context: context || {},
      },
    });

    // Update instance stats
    const updateData: any = {
      lastUsed: new Date(),
      totalCalls: { increment: 1 },
    };

    if (success) {
      updateData.successfulCalls = { increment: 1 };
      updateData.consecutiveErrors = 0;

      // Update average response time
      const avgResponseTime = instance.avgResponseTime || 0;
      const totalCalls = instance.totalCalls + 1;
      updateData.avgResponseTime =
        (avgResponseTime * instance.totalCalls + duration) / totalCalls;
    } else {
      updateData.failedCalls = { increment: 1 };
      updateData.consecutiveErrors = { increment: 1 };
      updateData.lastError = errorMessage;
      updateData.lastErrorAt = new Date();

      // Auto-disable after 5 consecutive errors
      if (instance.consecutiveErrors >= 4) {
        updateData.status = 'FAILED';
      }
    }

    await prisma.toolInstance.update({
      where: { id: instanceId },
      data: updateData,
    });

    // Calculate uptime
    const successRate =
      (instance.successfulCalls + (success ? 1 : 0)) / (instance.totalCalls + 1);

    return NextResponse.json({
      success,
      actionId: action.id,
      statusCode,
      response: responseData,
      duration,
      errorMessage,
      stats: {
        totalCalls: instance.totalCalls + 1,
        successRate: Math.round(successRate * 100),
        avgResponseTime: updateData.avgResponseTime,
      },
    });
  } catch (error: any) {
    console.error('Error executing tool action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute tool action' },
      { status: 500 }
    );
  }
}
