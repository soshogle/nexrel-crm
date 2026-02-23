
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/user/language - Get user's language preference

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });

    return NextResponse.json({ language: user?.language || 'en' });
  } catch (error: any) {
    console.error('Error fetching user language:', error);
    return apiErrors.internal(error.message || 'Failed to fetch language');
  }
}

// PUT /api/user/language - Update user's language preference
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { language } = body;

    if (!language) {
      return apiErrors.badRequest('Language is required');
    }

    // Validate language
    const supportedLanguages = ['en', 'fr', 'es', 'zh'];
    if (!supportedLanguages.includes(language)) {
      return apiErrors.badRequest('Unsupported language');
    }

    // Update user's language preference
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { language },
      select: { id: true, language: true, name: true, email: true },
    });

    return NextResponse.json({
      success: true,
      language: user.language,
      message: 'Language updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user language:', error);
    return apiErrors.internal(error.message || 'Failed to update language');
  }
}
