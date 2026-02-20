export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, name: true, type: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const { text, field, sectionType, instruction } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
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
    return NextResponse.json({ error: 'Failed to rewrite text' }, { status: 500 });
  }
}
