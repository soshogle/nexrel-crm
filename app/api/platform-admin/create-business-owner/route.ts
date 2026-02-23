import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { apiErrors } from '@/lib/api-error';
import { provisionAIEmployeesForUser } from '@/lib/ai-employee-auto-provision';
import { Industry } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_INDUSTRIES = Object.values(Industry);

/**
 * POST /api/platform-admin/create-business-owner
 * Creates a new business owner account that will go through onboarding
 * If industry is provided, AI employees are provisioned immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Verify Super Admin access
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden('Unauthorized - Super Admin access required');
    }

    const body = await request.json();
    const { email, password, name, phone, businessCategory, industry } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return apiErrors.badRequest('Missing required fields: email, password, name');
    }

    // Validate industry if provided
    const industryValue =
      industry && VALID_INDUSTRIES.includes(industry) ? industry : null;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiErrors.conflict('A user with this email already exists');
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
        industry: industryValue || null,
      },
    });

    console.log('✅ Business owner created:', {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      industry: industryValue ?? '(will select during onboarding)',
    });

    // If industry was set, provision AI employees immediately (fire-and-forget)
    if (industryValue) {
      provisionAIEmployeesForUser(newUser.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        industry: newUser.industry,
      },
      message: industryValue
        ? 'Business owner account created. AI employees are being provisioned. They will go through onboarding on first login.'
        : 'Business owner account created successfully. They will go through onboarding on first login.',
    });
  } catch (error: any) {
    console.error('Error creating business owner:', error);
    return apiErrors.internal(error.message || 'Failed to create business owner');
  }
}
