import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { provisionAIEmployeesForUser } from '@/lib/ai-employee-auto-provision';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { industry } = await req.json();

    if (!industry) {
      return apiErrors.badRequest('Industry is required');
    }

    // Validate industry enum value
    const validIndustries = [
      'ACCOUNTING',
      'RESTAURANT',
      'SPORTS_CLUB',
      'CONSTRUCTION',
      'LAW',
      'MEDICAL',
      'DENTIST',
      'MEDICAL_SPA',
      'OPTOMETRIST',
      'HEALTH_CLINIC',
      'REAL_ESTATE',
      'HOSPITAL',
      'TECHNOLOGY',
      'ORTHODONTIST',
    ];

    if (!validIndustries.includes(industry)) {
      return apiErrors.badRequest('Invalid industry value');
    }

    // Update user's industry
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { industry },
      select: {
        id: true,
        email: true,
        name: true,
        industry: true,
      },
    });

    // Auto-provision AI employees in background (Real Estate, Dental, etc.)
    provisionAIEmployeesForUser(session.user.id);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error saving industry:', error);
    return apiErrors.internal('Failed to save industry');
  }
}
