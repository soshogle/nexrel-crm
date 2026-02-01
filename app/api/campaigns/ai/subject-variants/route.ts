
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Generate subject line variants for A/B testing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, count, tone } = body;

    // Validation
    if (!subject) {
      return NextResponse.json(
        { error: 'Subject line is required' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to generate subject variants' },
      { status: 500 }
    );
  }
}
