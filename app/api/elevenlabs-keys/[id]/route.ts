
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

// DELETE /api/elevenlabs-keys/[id] - Remove an API key

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await elevenLabsKeyManager.removeApiKey(session.user.id, params.id);

    return NextResponse.json({
      success: true,
      message: 'API key removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove API key' },
      { status: 500 }
    );
  }
}

// PATCH /api/elevenlabs-keys/[id] - Update API key (priority or active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priority, isActive } = body;

    if (priority !== undefined) {
      await elevenLabsKeyManager.updatePriority(session.user.id, params.id, priority);
    }

    if (isActive !== undefined) {
      await elevenLabsKeyManager.toggleActive(session.user.id, params.id, isActive);
    }

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update API key' },
      { status: 500 }
    );
  }
}
