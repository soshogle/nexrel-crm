
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createAdminSession, hasValidAdminSession, invalidateAdminSession } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/admin/session - Verify password and create admin session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create admin session
    const ipAddress = request.ip || request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const sessionToken = await createAdminSession(user.id, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    });
  } catch (error: any) {
    console.error('Error creating admin session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin session' },
      { status: 500 }
    );
  }
}

// GET /api/admin/session - Check if admin session is valid
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isValid = await hasValidAdminSession(session.user.id);

    return NextResponse.json({
      isValid,
    });
  } catch (error: any) {
    console.error('Error checking admin session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check admin session' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/session - Invalidate admin session
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      );
    }

    await invalidateAdminSession(sessionToken);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error invalidating admin session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to invalidate admin session' },
      { status: 500 }
    );
  }
}
