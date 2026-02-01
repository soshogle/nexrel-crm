import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * GET /api/platform-admin/users/[id]
 * Get specific user details (SUPER_ADMIN only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify SUPER_ADMIN access
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        industry: true,
        phone: true,
        businessCategory: true,
        businessDescription: true,
        createdAt: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow editing other SUPER_ADMINs
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot edit Super Admin accounts' },
        { status: 403 }
      );
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/platform-admin/users/[id]
 * Update user email and/or password (SUPER_ADMIN only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify SUPER_ADMIN access
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Get the user
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow editing other SUPER_ADMINs
    if (existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot edit Super Admin accounts' },
        { status: 403 }
      );
    }

    // Check if new email is already taken (if email is being changed)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (email) {
      updateData.email = email;
    }

    if (name) {
      updateData.name = name;
    }

    if (password) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        industry: true,
        createdAt: true,
      },
    });

    console.log(`✅ Super Admin updated user ${params.id}:`, {
      email: email ? 'changed' : 'unchanged',
      password: password ? 'changed' : 'unchanged',
      name: name ? 'changed' : 'unchanged',
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
