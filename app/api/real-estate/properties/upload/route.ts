import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put } from '@vercel/blob';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];

    if (!files || files.length === 0) {
      return apiErrors.badRequest('No files provided');
    }

    if (files.length > 20) {
      return apiErrors.badRequest('Maximum 20 photos per upload');
    }

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10 MB limit` },
          { status: 400 }
        );
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `property-photos/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const blob = await put(path, file, {
        access: 'public',
        contentType: file.type,
      });

      urls.push(blob.url);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error: any) {
    console.error('[Property Upload] Error:', error);
    return apiErrors.internal(error.message || 'Failed to upload photos');
  }
}
