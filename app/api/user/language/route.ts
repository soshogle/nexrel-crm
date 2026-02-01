
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/user/language - Get user's language preference

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });

    return NextResponse.json({ language: user?.language || 'en' });
  } catch (error: any) {
    console.error('Error fetching user language:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch language' },
      { status: 500 }
    );
  }
}

// PUT /api/user/language - Update user's language preference
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { language } = body;

    if (!language) {
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      );
    }

    // Validate language
    const supportedLanguages = ['en', 'fr', 'es', 'zh'];
    if (!supportedLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Unsupported language' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: error.message || 'Failed to update language' },
      { status: 500 }
    );
  }
}
