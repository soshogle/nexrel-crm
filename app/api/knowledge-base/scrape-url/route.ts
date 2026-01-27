
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { documentExtractor } from '@/lib/document-extractor';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, category } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract text from URL
    const extracted = await documentExtractor.extractFromURL(url);

    if (!extracted.success) {
      return NextResponse.json(
        { error: extracted.error || 'Failed to extract content from URL' },
        { status: 400 }
      );
    }

    // Save to knowledge base
    const entry = await prisma.knowledgeBase.create({
      data: {
        userId: session.user.id,
        category: category || 'website',
        title: `Website: ${url}`,
        content: extracted.text,
        tags: JSON.stringify(['website', 'scraped']),
        priority: 5,
      },
    });

    return NextResponse.json({
      success: true,
      entry,
      metadata: extracted.metadata,
    });
  } catch (error: any) {
    console.error('URL scrape error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape URL' },
      { status: 500 }
    );
  }
}
