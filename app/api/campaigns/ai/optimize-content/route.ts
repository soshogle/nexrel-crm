
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Optimize campaign content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { content, contentType, optimizationGoals } = body;

    // Validation
    if (!content || !contentType) {
      return apiErrors.badRequest('Content and content type are required');
    }

    if (!['email', 'sms'].includes(contentType)) {
      return apiErrors.badRequest('Content type must be "email" or "sms"');
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
    return apiErrors.internal('Failed to optimize content');
  }
}
