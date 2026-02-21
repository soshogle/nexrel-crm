/**
 * Review Intelligence Service
 * - AI-powered sentiment analysis and theme extraction
 * - Auto-response generation based on owner criteria
 * - Review analytics and brand insights reporting
 * - Review request orchestration via SMS/email
 */

import { prisma } from '@/lib/db';

interface ReviewAnalysis {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  sentimentScore: number; // -1.0 to 1.0
  themes: string[];
  summary: string;
}

interface AutoResponseConfig {
  tone: string; // professional, friendly, casual, empathetic
  brandVoice?: string;
  includeOwnerName?: boolean;
  ownerName?: string;
  alwaysThank?: boolean;
  addressNegativeConcerns?: boolean;
  maxLength?: number;
  customInstructions?: string;
}

export interface BrandInsightsReport {
  overallSentiment: string;
  satisfactionScore: number;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  platformBreakdown: Record<string, number>;
  topStrengths: string[];
  topWeaknesses: string[];
  commonThemes: { theme: string; count: number; sentiment: string }[];
  trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
  recentVsPastRating: { recent: number; past: number };
  responseRate: number;
  recommendations: string[];
  // Web mentions data (populated when brand scans exist)
  webMentions?: {
    total: number;
    sourceBreakdown: Record<string, number>;
    sentimentBreakdown: Record<string, number>;
    recentMentions: {
      source: string;
      title: string | null;
      snippet: string;
      sourceUrl: string | null;
      sentiment: string | null;
      sentimentScore: number | null;
      themes: string[];
      publishedAt: string | null;
      createdAt: string;
    }[];
    topMentionThemes: { theme: string; count: number; sentiment: string }[];
    overallWebSentiment: string;
    overallWebSentimentScore: number;
  };
  lastScanAt?: string | null;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  jsonMode = true
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1000,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function analyzeReviewSentiment(
  reviewText: string,
  rating: number
): Promise<ReviewAnalysis> {
  const prompt = `Analyze this customer review and return JSON with:
- "sentiment": one of "POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"
- "sentimentScore": float from -1.0 (very negative) to 1.0 (very positive)
- "themes": array of short theme labels (e.g. "fast service", "rude staff", "great product")
- "summary": one-sentence summary of what the reviewer is saying

Review (${rating}/5 stars): "${reviewText}"`;

  const raw = await callOpenAI(
    'You are a review analysis AI. Return only valid JSON.',
    prompt
  );

  try {
    const parsed = JSON.parse(raw);
    return {
      sentiment: parsed.sentiment || (rating >= 4 ? 'POSITIVE' : rating <= 2 ? 'NEGATIVE' : 'NEUTRAL'),
      sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : (rating - 3) / 2,
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      summary: parsed.summary || '',
    };
  } catch {
    return {
      sentiment: rating >= 4 ? 'POSITIVE' : rating <= 2 ? 'NEGATIVE' : 'NEUTRAL',
      sentimentScore: (rating - 3) / 2,
      themes: [],
      summary: reviewText?.slice(0, 100) || '',
    };
  }
}

export async function generateAutoResponse(
  review: { reviewText: string; rating: number; reviewerName?: string; source: string },
  config: AutoResponseConfig
): Promise<string> {
  const ownerLabel = config.includeOwnerName && config.ownerName
    ? config.ownerName
    : 'The Owner';

  const prompt = `Write a response to this ${review.source} review on behalf of the business owner.

Review by ${review.reviewerName || 'a customer'} (${review.rating}/5 stars):
"${review.reviewText}"

Response guidelines:
- Tone: ${config.tone || 'professional'}
${config.brandVoice ? `- Brand voice: ${config.brandVoice}` : ''}
${config.alwaysThank !== false ? '- Always thank the reviewer' : ''}
${config.addressNegativeConcerns !== false && review.rating <= 3 ? '- Address their specific concerns empathetically' : ''}
${config.maxLength ? `- Maximum ${config.maxLength} words` : '- Keep it concise (50-150 words)'}
${config.customInstructions ? `- Additional instructions: ${config.customInstructions}` : ''}
- Sign off as: ${ownerLabel}
- Do NOT include a subject line

Return JSON with: {"response": "the response text"}`;

  const raw = await callOpenAI(
    'You are a professional business reputation manager. Write authentic, helpful review responses.',
    prompt
  );

  try {
    const parsed = JSON.parse(raw);
    return parsed.response || raw;
  } catch {
    return raw;
  }
}

export async function generateBrandInsights(userId: string): Promise<BrandInsightsReport> {
  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  if (reviews.length === 0) {
    return {
      overallSentiment: 'N/A',
      satisfactionScore: 0,
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      platformBreakdown: {},
      topStrengths: [],
      topWeaknesses: [],
      commonThemes: [],
      trendDirection: 'STABLE',
      recentVsPastRating: { recent: 0, past: 0 },
      responseRate: 0,
      recommendations: ['Start collecting reviews to get brand insights.'],
    };
  }

  // Rating distribution
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const k = Math.min(5, Math.max(1, r.rating));
    ratingDist[k] = (ratingDist[k] || 0) + 1;
  });

  // Platform breakdown
  const platformBreakdown: Record<string, number> = {};
  reviews.forEach((r) => {
    platformBreakdown[r.source] = (platformBreakdown[r.source] || 0) + 1;
  });

  // Average rating
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  // Trend: compare recent 30 days vs. older
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recent = reviews.filter((r) => r.createdAt >= thirtyDaysAgo);
  const past = reviews.filter((r) => r.createdAt < thirtyDaysAgo);
  const recentAvg = recent.length > 0 ? recent.reduce((s, r) => s + r.rating, 0) / recent.length : avgRating;
  const pastAvg = past.length > 0 ? past.reduce((s, r) => s + r.rating, 0) / past.length : avgRating;
  const trendDirection = recentAvg > pastAvg + 0.2 ? 'IMPROVING' : recentAvg < pastAvg - 0.2 ? 'DECLINING' : 'STABLE';

  // Response rate
  const responded = reviews.filter((r) => r.ownerResponse || r.aiResponseStatus === 'PUBLISHED').length;
  const responseRate = reviews.length > 0 ? (responded / reviews.length) * 100 : 0;

  // Theme aggregation from stored themes
  const themeMap = new Map<string, { count: number; sentimentSum: number }>();
  reviews.forEach((r) => {
    const themes = (r.themes as string[]) || [];
    const score = r.sentimentScore ?? (r.rating >= 4 ? 0.5 : r.rating <= 2 ? -0.5 : 0);
    themes.forEach((t) => {
      const existing = themeMap.get(t) || { count: 0, sentimentSum: 0 };
      existing.count++;
      existing.sentimentSum += score;
      themeMap.set(t, existing);
    });
  });

  const sortedThemes = Array.from(themeMap.entries())
    .map(([theme, data]) => ({
      theme,
      count: data.count,
      sentiment: data.sentimentSum / data.count > 0.1 ? 'POSITIVE' : data.sentimentSum / data.count < -0.1 ? 'NEGATIVE' : 'NEUTRAL',
    }))
    .sort((a, b) => b.count - a.count);

  const topStrengths = sortedThemes
    .filter((t) => t.sentiment === 'POSITIVE')
    .slice(0, 5)
    .map((t) => t.theme);

  const topWeaknesses = sortedThemes
    .filter((t) => t.sentiment === 'NEGATIVE')
    .slice(0, 5)
    .map((t) => t.theme);

  // AI-generated recommendations if we have enough data
  let recommendations: string[] = [];
  if (reviews.length >= 5) {
    try {
      const prompt = `Based on these review statistics, give 3-5 actionable recommendations:
- Average rating: ${avgRating.toFixed(1)}/5
- Total reviews: ${reviews.length}
- Trend: ${trendDirection}
- Response rate: ${responseRate.toFixed(0)}%
- Top strengths: ${topStrengths.join(', ') || 'none identified'}
- Top weaknesses: ${topWeaknesses.join(', ') || 'none identified'}
- Rating distribution: 5★:${ratingDist[5]}, 4★:${ratingDist[4]}, 3★:${ratingDist[3]}, 2★:${ratingDist[2]}, 1★:${ratingDist[1]}

Return JSON: {"recommendations": ["recommendation 1", ...]}`;

      const raw = await callOpenAI(
        'You are a business reputation consultant. Give specific, actionable advice.',
        prompt
      );
      const parsed = JSON.parse(raw);
      recommendations = parsed.recommendations || [];
    } catch {
      recommendations = [
        responseRate < 50 ? 'Respond to more reviews — aim for 80%+ response rate.' : 'Keep up the great response rate!',
        avgRating < 4 ? 'Focus on addressing common complaints to improve ratings.' : 'Maintain quality — your ratings are strong.',
        'Ask satisfied customers to leave reviews on Google for maximum SEO impact.',
      ];
    }
  }

  const satisfactionScore = Math.round(
    ((avgRating / 5) * 0.5 +
      (responseRate / 100) * 0.2 +
      (trendDirection === 'IMPROVING' ? 0.3 : trendDirection === 'STABLE' ? 0.2 : 0.1)) *
      100
  );

  // ─── Web mentions from brand scans ─────────────────────────────────
  let webMentions: BrandInsightsReport['webMentions'];
  let lastScanAt: string | null = null;

  try {
    const lastScan = await prisma.brandScan.findFirst({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });
    lastScanAt = lastScan?.completedAt?.toISOString() ?? null;

    const mentions = await prisma.brandMention.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    if (mentions.length > 0) {
      const sourceBreakdown: Record<string, number> = {};
      const sentimentBreakdown: Record<string, number> = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0 };
      const mentionThemeMap = new Map<string, { count: number; sentimentSum: number }>();
      let totalScore = 0;

      for (const m of mentions) {
        sourceBreakdown[m.source] = (sourceBreakdown[m.source] || 0) + 1;
        if (m.sentiment && sentimentBreakdown[m.sentiment] !== undefined) {
          sentimentBreakdown[m.sentiment]++;
        }
        totalScore += m.sentimentScore ?? 0;

        const mThemes = (m.themes as string[]) || [];
        const mScore = m.sentimentScore ?? 0;
        for (const t of mThemes) {
          const ex = mentionThemeMap.get(t) || { count: 0, sentimentSum: 0 };
          ex.count++;
          ex.sentimentSum += mScore;
          mentionThemeMap.set(t, ex);
        }
      }

      const topMentionThemes = Array.from(mentionThemeMap.entries())
        .map(([theme, data]) => ({
          theme,
          count: data.count,
          sentiment: data.sentimentSum / data.count > 0.1 ? 'POSITIVE' : data.sentimentSum / data.count < -0.1 ? 'NEGATIVE' : 'NEUTRAL',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      const avgWebScore = mentions.length > 0 ? totalScore / mentions.length : 0;

      webMentions = {
        total: mentions.length,
        sourceBreakdown,
        sentimentBreakdown,
        recentMentions: mentions.slice(0, 20).map((m) => ({
          source: m.source,
          title: m.title,
          snippet: m.snippet.slice(0, 300),
          sourceUrl: m.sourceUrl,
          sentiment: m.sentiment,
          sentimentScore: m.sentimentScore,
          themes: (m.themes as string[]) || [],
          publishedAt: m.publishedAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
        topMentionThemes,
        overallWebSentiment: avgWebScore > 0.2 ? 'POSITIVE' : avgWebScore < -0.2 ? 'NEGATIVE' : avgWebScore > 0.05 || avgWebScore < -0.05 ? 'MIXED' : 'NEUTRAL',
        overallWebSentimentScore: Math.round(avgWebScore * 100) / 100,
      };
    }
  } catch (e: any) {
    console.warn('Failed to load web mentions for brand insights:', e.message);
  }

  return {
    overallSentiment: avgRating >= 4 ? 'POSITIVE' : avgRating >= 3 ? 'MIXED' : 'NEGATIVE',
    satisfactionScore: Math.min(100, satisfactionScore),
    totalReviews: reviews.length,
    averageRating: Math.round(avgRating * 10) / 10,
    ratingDistribution: ratingDist,
    platformBreakdown,
    topStrengths,
    topWeaknesses,
    commonThemes: sortedThemes.slice(0, 15),
    trendDirection,
    recentVsPastRating: {
      recent: Math.round(recentAvg * 10) / 10,
      past: Math.round(pastAvg * 10) / 10,
    },
    responseRate: Math.round(responseRate),
    recommendations,
    webMentions,
    lastScanAt,
  };
}

export async function sendReviewRequest(
  userId: string,
  leadId: string,
  method: 'SMS' | 'EMAIL' | 'BOTH',
  reviewUrl?: string,
  customMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [user, lead] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, legalEntityName: true } }),
      prisma.lead.findUnique({ where: { id: leadId }, select: { name: true, email: true, phone: true } }),
    ]);

    if (!lead) return { success: false, error: 'Lead not found' };

    const businessName = user?.legalEntityName || user?.name || 'Our Business';
    const defaultMessage = `Hi ${lead.name || 'there'}! Thank you for choosing ${businessName}. We'd love to hear about your experience. Could you take a moment to leave us a review? ${reviewUrl || 'It would mean a lot to us!'}\n\nThank you!\n${user?.name || businessName}`;
    const message = customMessage || defaultMessage;

    if ((method === 'SMS' || method === 'BOTH') && lead.phone) {
      try {
        const smsRes = await fetch(`${process.env.NEXTAUTH_URL}/api/messaging/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.NEXTAUTH_SECRET || '',
          },
          body: JSON.stringify({
            to: lead.phone,
            message,
            userId,
          }),
        });
        if (!smsRes.ok) console.warn('Review request SMS failed:', await smsRes.text());
      } catch (e: any) {
        console.warn('Review request SMS error:', e.message);
      }
    }

    if ((method === 'EMAIL' || method === 'BOTH') && lead.email) {
      try {
        const emailRes = await fetch(`${process.env.NEXTAUTH_URL}/api/messaging/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.NEXTAUTH_SECRET || '',
          },
          body: JSON.stringify({
            to: lead.email,
            subject: `How was your experience with ${businessName}?`,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
            userId,
          }),
        });
        if (!emailRes.ok) console.warn('Review request email failed:', await emailRes.text());
      } catch (e: any) {
        console.warn('Review request email error:', e.message);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processIncomingReview(
  userId: string,
  reviewData: {
    source: string;
    rating: number;
    reviewText?: string;
    reviewerName?: string;
    reviewUrl?: string;
    platformReviewId?: string;
    leadId?: string;
  }
): Promise<{ review: any; triggered: boolean }> {
  // Analyze sentiment
  const analysis = reviewData.reviewText
    ? await analyzeReviewSentiment(reviewData.reviewText, reviewData.rating)
    : {
        sentiment: reviewData.rating >= 4 ? 'POSITIVE' : reviewData.rating <= 2 ? 'NEGATIVE' : 'NEUTRAL' as const,
        sentimentScore: (reviewData.rating - 3) / 2,
        themes: [] as string[],
        summary: '',
      };

  // Create the review record
  const review = await prisma.review.create({
    data: {
      userId,
      source: reviewData.source as any,
      rating: reviewData.rating,
      reviewText: reviewData.reviewText,
      reviewerName: reviewData.reviewerName,
      reviewUrl: reviewData.reviewUrl,
      platformReviewId: reviewData.platformReviewId,
      leadId: reviewData.leadId || undefined,
      isPublic: true,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      themes: analysis.themes,
      aiSummary: analysis.summary,
    },
  });

  // Fire workflow triggers
  let triggered = false;
  try {
    const { workflowEngine } = await import('@/lib/workflow-engine');

    await workflowEngine.triggerWorkflow('REVIEW_RECEIVED' as any, {
      userId,
      leadId: reviewData.leadId,
      variables: {
        reviewId: review.id,
        rating: reviewData.rating,
        source: reviewData.source,
        sentiment: analysis.sentiment,
        reviewerName: reviewData.reviewerName,
      },
    });

    if (analysis.sentiment === 'POSITIVE' || reviewData.rating >= 4) {
      await workflowEngine.triggerWorkflow('REVIEW_POSITIVE' as any, {
        userId,
        leadId: reviewData.leadId,
        variables: {
          reviewId: review.id,
          rating: reviewData.rating,
          source: reviewData.source,
        },
      });
    }

    if (analysis.sentiment === 'NEGATIVE' || reviewData.rating <= 2) {
      await workflowEngine.triggerWorkflow('REVIEW_NEGATIVE' as any, {
        userId,
        leadId: reviewData.leadId,
        variables: {
          reviewId: review.id,
          rating: reviewData.rating,
          source: reviewData.source,
        },
      });
    }

    triggered = true;
  } catch (e: any) {
    console.warn('Review workflow trigger error (non-critical):', e.message);
  }

  return { review, triggered };
}
