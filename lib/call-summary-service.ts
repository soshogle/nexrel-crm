/**
 * AI meeting/call summary service
 * Summarizes call transcripts and adds as note to lead
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/db';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CallSummaryResult {
  summary: string;
  actionItems: string[];
  sentiment: string;
  noteId?: string;
}

export async function summarizeCallAndAddNote(
  callLogId: string,
  userId: string
): Promise<CallSummaryResult> {
  const call = await prisma.callLog.findFirst({
    where: { id: callLogId, userId },
    include: { lead: true },
  });

  if (!call) throw new Error('Call not found');

  const transcript = call.transcript || call.transcription || call.conversationData || '';
  if (!transcript || transcript.length < 50) {
    throw new Error('Call has no transcript to summarize');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Summarize the call transcript. Return JSON: { "summary": "2-3 sentence summary", "actionItems": ["item1", "item2"], "sentiment": "positive|neutral|negative" }',
      },
      { role: 'user', content: transcript.slice(0, 8000) },
    ],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  const summary = parsed.summary || 'No summary generated';
  const actionItems = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
  const sentiment = parsed.sentiment || 'neutral';

  let noteId: string | undefined;
  if (call.leadId) {
    const noteContent = [
      `**Call Summary** (${new Date().toLocaleDateString()})`,
      summary,
      actionItems.length > 0 ? `\n**Action items:**\n${actionItems.map((a) => `- ${a}`).join('\n')}` : '',
      `\nSentiment: ${sentiment}`,
    ].join('\n');

    const note = await prisma.note.create({
      data: {
        userId,
        leadId: call.leadId,
        content: noteContent,
      },
    });
    noteId = note.id;
  }

  return {
    summary,
    actionItems,
    sentiment,
    noteId,
  };
}
