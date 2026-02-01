import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/platform-admin/create-business-owner
 * Creates a new business owner account that will go through onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Verify Super Admin access
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, phone, businessCategory } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new business owner
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        businessCategory: businessCategory || null,
        role: 'BUSINESS_OWNER',
        onboardingCompleted: false, // This triggers the onboarding wizard
        industry: null, // User will select during onboarding
      },
    });

    console.log('✅ Business owner created:', {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      message: 'Business owner account created successfully. They will go through onboarding on first login.',
    });
  } catch (error: any) {
    console.error('Error creating business owner:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create business owner' },
      { status: 500 }
    );
  }
}
