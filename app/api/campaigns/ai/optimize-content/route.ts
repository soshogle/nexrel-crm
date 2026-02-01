
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Optimize campaign content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, contentType, optimizationGoals } = body;

    // Validation
    if (!content || !contentType) {
      return NextResponse.json(
        { error: 'Content and content type are required' },
        { status: 400 }
      );
    }

    if (!['email', 'sms'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Content type must be "email" or "sms"' },
        { status: 400 }
      );
    }

    // Optimize content using AI
    const result = await aiCampaignGenerator.optimizeContent(
      content,
      contentType as 'email' | 'sms',
      optimizationGoals || ['clarity', 'engagement', 'call-to-action']
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error optimizing content:', error);
    return NextResponse.json(
      { error: 'Failed to optimize content' },
      { status: 500 }
    );
  }
}
