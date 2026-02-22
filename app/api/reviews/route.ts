import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ReviewSource } from '@prisma/client';
import { processIncomingReview } from '@/lib/reviews/review-intelligence-service';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { campaignService } from '@/lib/dal/campaign-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const sentiment = searchParams.get('sentiment');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    const search = searchParams.get('search');
    const needsResponse = searchParams.get('needsResponse');

    const where: any = { userId: session.user.id };

    if (source && source !== 'ALL') where.source = source;
    if (sentiment) where.sentiment = sentiment;
    if (minRating) where.rating = { ...where.rating, gte: parseInt(minRating) };
    if (maxRating) where.rating = { ...where.rating, lte: parseInt(maxRating) };
    if (search) {
      where.OR = [
        { reviewText: { contains: search, mode: 'insensitive' } },
        { reviewerName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (needsResponse === 'true') {
      where.ownerResponse = null;
      where.aiResponseStatus = { not: 'PUBLISHED' };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        lead: {
          select: { id: true, businessName: true, contactPerson: true, email: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      source, rating, reviewText, reviewUrl, reviewerName, isPublic,
      campaignId, leadId, platformReviewId,
    } = body;

    if (!source || !rating) {
      return NextResponse.json({ error: 'source and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // If campaignId provided, verify ownership
    if (campaignId) {
      const ctx = getDalContextFromSession(session);
      if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const campaign = await campaignService.findUnique(ctx, campaignId);
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
    }

    // Process through intelligence service (sentiment + workflow triggers)
    const { review, triggered } = await processIncomingReview(session.user.id, {
      source,
      rating,
      reviewText,
      reviewerName,
      reviewUrl,
      platformReviewId,
      leadId,
    });

    // Link to campaign if provided
    if (campaignId) {
      await prisma.review.update({
        where: { id: review.id },
        data: { campaignId },
      });

      if (leadId) {
        await prisma.campaignLead.updateMany({
          where: { campaignId, leadId },
          data: { status: 'RESPONDED', respondedAt: new Date() },
        });
      }
    }

    const fullReview = await prisma.review.findUnique({
      where: { id: review.id },
      include: {
        lead: { select: { id: true, businessName: true, contactPerson: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ review: fullReview, triggered }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
