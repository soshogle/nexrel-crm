
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Generate subject line variants for A/B testing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { subject, count, tone } = body;

    // Validation
    if (!subject) {
      return apiErrors.badRequest('Subject line is required');
    }

    // Generate variants using AI
    const variants = await aiCampaignGenerator.generateSubjectVariants(
      subject,
      count || 5,
      tone
    );

    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Error generating subject variants:', error);
    return apiErrors.internal('Failed to generate subject variants');
  }
}
