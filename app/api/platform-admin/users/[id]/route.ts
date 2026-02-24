import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiErrors } from '@/lib/api-error';

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
      return apiErrors.unauthorized();
    }

    // Verify SUPER_ADMIN access
    if (session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Super Admin access required');
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
      return apiErrors.notFound('User not found');
    }

    // Don't allow editing other SUPER_ADMINs
    if (user.role === 'SUPER_ADMIN') {
      return apiErrors.forbidden('Cannot edit Super Admin accounts');
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return apiErrors.internal(error.message || 'Failed to fetch user');
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
      return apiErrors.unauthorized();
    }

    // Verify SUPER_ADMIN access
    if (session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Super Admin access required');
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Get the user
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return apiErrors.notFound('User not found');
    }

    // Don't allow editing other SUPER_ADMINs
    if (existingUser.role === 'SUPER_ADMIN') {
      return apiErrors.forbidden('Cannot edit Super Admin accounts');
    }

    // Check if new email is already taken (if email is being changed)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return apiErrors.badRequest('Email already in use');
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
    return apiErrors.internal(error.message || 'Failed to update user');
  }
}

/**
 * DELETE /api/platform-admin/users/[id]
 * Soft delete a user (SUPER_ADMIN only) - sets deletedAt, blocks login
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Super Admin access required');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, deletedAt: true },
    });

    if (!existingUser) {
      return apiErrors.notFound('User not found');
    }

    if (existingUser.role === 'SUPER_ADMIN') {
      return apiErrors.forbidden('Cannot delete Super Admin accounts');
    }

    if (existingUser.deletedAt) {
      return apiErrors.badRequest('User is already deleted');
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    console.log(`✅ Super Admin soft-deleted user ${params.id}`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return apiErrors.internal(error.message || 'Failed to delete user');
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
