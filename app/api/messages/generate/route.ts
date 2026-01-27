
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // Verify lead belongs to user
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        userId: session.user.id,
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Prepare the prompt for AI message generation
    const prompt = `Generate a personalized outreach message for a business lead with the following information:

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

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
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
                    const message = await prisma.message.create({
                      data: {
                        leadId,
                        userId: session.user.id,
                        content: buffer.trim(),
                        messageType: 'ai_generated',
                        isUsed: false,
                      }
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
