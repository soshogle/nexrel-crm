/**
 * Voice Assistant Chat API
 * Processes voice-transcribed text and returns text response for TTS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getAIAssistantFunctions,
  mapFunctionToAction,
  getNavigationUrlForAction,
} from '@/lib/ai-assistant-functions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user data (same as AI assistant chat)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        language: true,
        businessName: true,
        industry: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userLanguage = user.language || 'en';

    // Language instructions
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: Respond in English. Keep responses concise (1-2 sentences) for voice interaction.',
      'fr': 'CRITIQUE: Répondez en français. Gardez les réponses concises (1-2 phrases) pour l\'interaction vocale.',
      'es': 'CRÍTICO: Responde en español. Mantén las respuestas concisas (1-2 frases) para la interacción por voz.',
      'zh': '关键：请用中文回复。保持回复简洁（1-2句话）适合语音交互。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Call OpenAI with voice-optimized prompt
    const openai = (await import('openai')).default;
    const openaiClient = new openai({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    const systemPrompt = `${languageInstruction}

You are a voice assistant for a CRM system. Users speak to you, and you respond verbally.

IMPORTANT FOR VOICE INTERACTION:
- Keep responses SHORT (1-2 sentences maximum)
- Be conversational and natural
- Ask ONE question at a time
- Confirm actions before executing
- Use simple, spoken language

When users ask you to do something:
1. Acknowledge briefly
2. Ask for missing info (one piece at a time)
3. Execute using functions
4. Confirm completion briefly

Available functions: ${getAIAssistantFunctions().map(f => f.function.name).join(', ')}

Remember: You're speaking, not typing. Keep it brief!`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: message },
    ];

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages,
      functions: getAIAssistantFunctions(),
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 150, // Shorter for voice
    });

    const responseMessage = completion.choices[0]?.message;

    if (!responseMessage) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Handle function calls
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments || '{}');

      // Execute function (same logic as AI assistant chat)
      const action = mapFunctionToAction(functionName, functionArgs, user.id);
      
      // For now, return a simple response indicating the function was called
      // In production, you'd execute the function and return results
      return NextResponse.json({
        text: `I'll ${functionName.replace(/_/g, ' ')} for you. Let me do that now.`,
        functionCall: {
          name: functionName,
          args: functionArgs,
        },
      });
    }

    // Return text response for TTS
    return NextResponse.json({
      text: responseMessage.content || 'I understand. How can I help?',
    });
  } catch (error: any) {
    console.error('Voice assistant chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process voice message' },
      { status: 500 }
    );
  }
}
