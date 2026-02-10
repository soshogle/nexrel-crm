/**
 * Upload company logo during onboarding.
 * Stores in S3 (or configured storage) and saves URL to User.companyLogoUrl (Neon).
 * Same logo is used for CRM and website builder.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const key = `users/${session.user.id}/company-logo.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let url: string;
    try {
      url = await uploadToS3({
        key,
        body: buffer,
        contentType: file.type,
      });
    } catch (s3Error: any) {
      console.error('S3 upload error:', s3Error);
      return NextResponse.json(
        { error: 'Storage is not configured. Please set up S3 or add logo later in Settings.' },
        { status: 503 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { companyLogoUrl: url },
    });

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
