
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

// GET /api/elevenlabs-keys - Get all API keys with status

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await elevenLabsKeyManager.getAllKeys(session.user.id);

    // Mask the API keys for security (show only last 8 characters)
    const maskedKeys = keys.map(key => ({
      ...key,
      apiKey: '...' + key.apiKey.slice(-8),
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/elevenlabs-keys - Add a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, label, priority } = body;

    if (!apiKey || !label) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, label' },
        { status: 400 }
      );
    }

    // Add the API key (will verify it works)
    await elevenLabsKeyManager.addApiKey({
      userId: session.user.id,
      apiKey,
      label,
      priority: priority || 999, // Default to low priority if not specified
    });

    return NextResponse.json({
      success: true,
      message: 'API key added successfully',
    });
  } catch (error: any) {
    console.error('Error adding API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add API key' },
      { status: 500 }
    );
  }
}
