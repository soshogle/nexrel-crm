/**
 * Website Media Library API
 * GET - List media for website
 * POST - Upload new media (image, video, file)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService, getCrmDb } from '@/lib/dal';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await websiteService.findUnique(ctx, params.id);
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // IMAGE, VIDEO, FILE
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = { websiteId: params.id };
    if (type) where.type = type;

    const media = await getCrmDb(ctx).websiteMedia.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ media });
  } catch (error: any) {
    console.error('Error listing media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list media' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await websiteService.findUnique(ctx, params.id);
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    const contentType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 10MB.' },
        { status: 400 }
      );
    }

    let mediaType = 'FILE';
    if (ALLOWED_IMAGE_TYPES.includes(contentType)) mediaType = 'IMAGE';
    else if (ALLOWED_VIDEO_TYPES.includes(contentType) || contentType.startsWith('video/')) mediaType = 'VIDEO';

    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_FILE_TYPES];
    if (!allowedTypes.includes(contentType) && !contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: `Invalid file type: ${contentType}` },
        { status: 400 }
      );
    }

    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 12);
    const ext = contentType.split('/')[1] || 'bin';
    const filename = `${hash}-${Date.now()}.${ext}`;
    const basePath = `website-media/${ctx.userId}/${params.id}`;
    const storagePath = `${basePath}/${filename}`;

    let url: string;
    let width: number | null = null;
    let height: number | null = null;
    let optimizedUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (mediaType === 'IMAGE' && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(storagePath, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
      url = blob.url;

      try {
        const meta = await sharp(buffer).metadata();
        width = meta.width || null;
        height = meta.height || null;

        if (width && height && (width > 1200 || height > 1200)) {
          const optimized = await sharp(buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
          const optBlob = await put(`${basePath}/opt-${filename}.webp`, optimized, {
            access: 'public',
            contentType: 'image/webp',
            addRandomSuffix: false,
          });
          optimizedUrl = optBlob.url;
        }

        const thumb = await sharp(buffer)
          .resize(200, 200, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
        const thumbBlob = await put(`${basePath}/thumb-${filename}.webp`, thumb, {
          access: 'public',
          contentType: 'image/webp',
          addRandomSuffix: false,
        });
        thumbnailUrl = thumbBlob.url;
      } catch {
        // ignore sharp errors
      }
    } else {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          { error: 'BLOB_READ_WRITE_TOKEN not configured' },
          { status: 500 }
        );
      }
      const blob = await put(storagePath, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
      url = blob.url;
    }

    const media = await getCrmDb(ctx).websiteMedia.create({
      data: {
        websiteId: params.id,
        url,
        path: storagePath,
        filename: file.name || filename,
        mimeType: contentType,
        size: buffer.length,
        type: mediaType,
        width,
        height,
        alt: alt || null,
        thumbnailUrl,
        optimizedUrl,
      },
    });

    return NextResponse.json({ media });
  } catch (error: any) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media' },
      { status: 500 }
    );
  }
}
