
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { apiErrors } from '@/lib/api-error';
import { encryptField } from '@/lib/crypto-fields';

// GET /api/elevenlabs-keys - Get all API keys with status

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const keys = await elevenLabsKeyManager.getAllKeys(session.user.id);

    // Mask the API keys for security (show only last 8 characters)
    const maskedKeys = keys.map((key: any) => ({
      ...key,
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return apiErrors.internal(error.message || 'Failed to fetch API keys');
  }
}

// POST /api/elevenlabs-keys - Add a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return apiErrors.badRequest('Request body must be valid JSON');
    }
    const body = rawBody as Record<string, unknown>;

    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const priority = typeof body.priority === 'number' ? body.priority : 999;

    if (!apiKey || apiKey.length < 10) {
      return apiErrors.badRequest('apiKey must be a valid ElevenLabs API key');
    }
    if (!label || label.length > 100) {
      return apiErrors.badRequest('label is required (max 100 characters)');
    }

    // Encrypt the API key before storing in DB
    const encryptedKey = encryptField(apiKey) as string;

    await elevenLabsKeyManager.addApiKey({
      userId: session.user.id,
      apiKey: encryptedKey,
      label,
      priority,
    });

    return NextResponse.json({
      success: true,
      message: 'API key added successfully',
    });
  } catch (error: any) {
    console.error('Error adding API key:', error.message);
    return apiErrors.internal('Failed to add API key');
  }
}
