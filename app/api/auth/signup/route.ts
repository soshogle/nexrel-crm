import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return apiErrors.badRequest('Name, email, and password are required');
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return apiErrors.badRequest('Invalid email format');
    }

    // Validate password length
    if (password.length < 8) {
      return apiErrors.badRequest('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return apiErrors.conflict('An account with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with PENDING_APPROVAL status
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        accountStatus: 'PENDING_APPROVAL',
        role: 'USER',
        onboardingCompleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('✅ New user created with PENDING_APPROVAL status:', {
      id: user.id,
      email: user.email,
      name: user.name,
      accountStatus: user.accountStatus,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. Please wait for admin approval.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accountStatus: user.accountStatus,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Signup error:', error);
    return apiErrors.internal(error.message || 'Failed to create account');
  }
}
