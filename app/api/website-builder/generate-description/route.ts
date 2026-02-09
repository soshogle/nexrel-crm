/**
 * AI Business Description Generator
 * Generates enhanced business descriptions for website building
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessDescription, websiteName, templateType, services, products } = body;

    if (!businessDescription || businessDescription.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide at least 10 characters of business description' },
        { status: 400 }
      );
    }

    // Get user's business context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        industry: true,
        businessDescription: true,
        name: true,
      },
    });

    // Build AI prompt
    const prompt = `You are an expert website content writer. Generate an enhanced, professional business description for a website.

Business Name: ${websiteName || 'Business'}
Website Type: ${templateType === 'SERVICE' ? 'Service-based business' : 'E-commerce/Product-based business'}
Industry: ${user?.industry || 'General'}

Current Description: ${businessDescription}

${templateType === 'SERVICE' && services ? `Services Offered: ${services}` : ''}
${templateType === 'PRODUCT' && products ? `Products: ${products}` : ''}

Generate:
1. An enhanced, compelling business description (2-3 paragraphs, SEO-optimized)
2. Key value propositions (3-5 bullet points)
3. Target audience description
4. Call-to-action suggestions

Return as JSON:
{
  "enhancedDescription": "...",
  "valuePropositions": ["...", "..."],
  "targetAudience": "...",
  "ctaSuggestions": ["...", "..."]
}`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert website content writer. Always return valid JSON responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let aiResponse;
    try {
      aiResponse = JSON.parse(content);
    } catch (e) {
      // If JSON parsing fails, extract description from text
      aiResponse = {
        enhancedDescription: content,
        valuePropositions: [],
        targetAudience: '',
        ctaSuggestions: [],
      };
    }

    return NextResponse.json({
      success: true,
      generated: aiResponse,
    });
  } catch (error: any) {
    console.error('Error generating business description:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate description' },
      { status: 500 }
    );
  }
}
