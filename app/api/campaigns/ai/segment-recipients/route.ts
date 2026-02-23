import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, dealService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Get AI-powered recipient segmentation suggestions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { campaignGoal, recipientType } = body;

    // Validation
    if (!campaignGoal) {
      return apiErrors.badRequest('Campaign goal is required');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Fetch user's leads or deals
    let availableData: any[] = [];

    if (recipientType === 'deals') {
      availableData = await dealService.findMany(ctx, {
        include: {
          lead: {
            select: {
              businessName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
        take: 100, // Limit for performance
      });
    } else {
      // Default to leads
      availableData = await leadService.findMany(ctx, {
        select: {
          id: true,
          businessName: true,
          email: true,
          phone: true,
          status: true,
          city: true,
          state: true,
        },
        take: 100, // Limit for performance
      });
    }

    // Get AI segmentation suggestions
    const segments = await aiCampaignGenerator.suggestRecipientSegments(
      campaignGoal,
      availableData
    );

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Error generating recipient segments:', error);
    return apiErrors.internal('Failed to generate recipient segments');
  }
}
