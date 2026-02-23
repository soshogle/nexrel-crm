export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const { text, field, sectionType, instruction } = await request.json();

    if (!text || typeof text !== 'string') {
      return apiErrors.badRequest('Text is required');
    }

    if (!process.env.OPENAI_API_KEY) {
      return apiErrors.internal('OpenAI not configured');
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an expert copywriter for business websites. Rewrite the provided text to be more compelling, professional, and conversion-focused. 
Keep the same general meaning but improve clarity, engagement, and SEO value.
Context: This is the "${field || 'content'}" field in a "${sectionType || 'website'}" section of a ${website.type || 'business'} website called "${website.name}".
${instruction ? `User instruction: ${instruction}` : ''}
Return ONLY the rewritten text, no explanations or quotes.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const rewritten = completion.choices[0]?.message?.content?.trim() || text;

    return NextResponse.json({ original: text, rewritten });
  } catch (error: any) {
    console.error('[AI Rewrite] Error:', error);
    return apiErrors.internal('Failed to rewrite text');
  }
}
