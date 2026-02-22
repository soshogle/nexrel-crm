export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { leadService } from '@/lib/dal/lead-service'
import { messageService } from '@/lib/dal/message-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const lead = await leadService.findUnique(ctx, leadId)

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Get user's language preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });
    const userLanguage = user?.language || 'en';
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST generate the message ONLY in English. Every single word must be in English.',
      'fr': 'CRITIQUE : Vous DEVEZ générer le message UNIQUEMENT en français. Chaque mot doit être en français.',
      'es': 'CRÍTICO: DEBES generar el mensaje SOLO en español. Cada palabra debe estar en español.',
      'zh': '关键：您必须仅用中文生成消息。每个词都必须是中文。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Prepare the prompt for AI message generation
    const prompt = `${languageInstruction}

Generate a personalized outreach message for a business lead with the following information:

Business Name: ${lead.businessName}
Contact Person: ${lead.contactPerson || 'Not specified'}
Business Category: ${lead.businessCategory || 'Not specified'}
Location: ${lead.city ? `${lead.city}, ${lead.state || ''}` : 'Not specified'}
Rating: ${lead.rating ? `${lead.rating}/5 stars` : 'Not specified'}
Website: ${lead.website || 'Not specified'}

Create a professional, personalized cold outreach message that:
1. Addresses the business directly (use business name)
2. Shows you've researched them specifically
3. Offers clear value proposition
4. Has a specific call-to-action
5. Is concise but engaging
6. Sounds natural and not overly salesy

The message should be suitable for email outreach and be around 150-200 words.`

    const messages = [
      {
        role: "user",
        content: prompt
      }
    ]

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.error(new Error('No response body'))
          return
        }

        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''
        let partialRead = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            partialRead += decoder.decode(value, { stream: true })
            let lines = partialRead.split('\n')
            partialRead = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  // Save the generated message to database
                  try {
                    const message = await messageService.create(ctx, {
                      leadId,
                      content: buffer.trim(),
                      messageType: 'ai_generated',
                      isUsed: false,
                    })

                    const finalData = JSON.stringify({
                      status: 'completed',
                      message
                    })
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                  } catch (dbError) {
                    console.error('Database error:', dbError)
                    const errorData = JSON.stringify({
                      status: 'error',
                      message: 'Failed to save message'
                    })
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                  }
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  buffer += content

                  // Send progress update
                  const progressData = JSON.stringify({
                    status: 'generating',
                    progress: buffer.length
                  })
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          const errorData = JSON.stringify({
            status: 'error',
            message: 'Generation failed'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Generate message error:', error)
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    )
  }
}
