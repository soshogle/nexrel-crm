/**
 * LLM-based explanation for statistical predictions.
 * The actual prediction numbers come from predictive-models.ts (no LLM).
 * This service adds human-readable explanations for each prediction.
 */

import OpenAI from 'openai';
import type { Prediction } from './predictive-models';
import type { BusinessDataSnapshot } from './data-pipeline';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface PredictionWithExplanation extends Prediction {
  explanation?: string;
}

/**
 * Generate natural language explanations for each prediction using LLM.
 * Returns predictions unchanged if OpenAI is not configured.
 */
export async function addExplanations(
  predictions: Prediction[],
  _data: BusinessDataSnapshot
): Promise<PredictionWithExplanation[]> {
  if (!openai || predictions.length === 0) {
    return predictions as PredictionWithExplanation[];
  }

  try {
    const metricLabels: Record<string, string> = {
      revenue: 'Revenue',
      leadConversions: 'Lead conversions',
      dealValue: 'Deal closure value',
    };

    const prompt = `You are a business analyst. For each prediction below, write ONE short sentence (max 15 words) explaining why this forecast was made. Be specific and reference the factors. No preamble.

Predictions:
${predictions
  .map(
    (p) =>
      `- ${metricLabels[p.metric] || p.metric}: $${p.predictedValue.toLocaleString()} predicted (${p.confidence}% confidence). Factors: ${p.factors.slice(0, 2).join('; ')}`
  )
  .join('\n')}

Return JSON array only, one explanation per prediction in order: ["explanation1", "explanation2", ...]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Return only a valid JSON array of strings. No other text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return predictions as PredictionWithExplanation[];

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return predictions as PredictionWithExplanation[];

    const explanations: string[] = JSON.parse(jsonMatch[0]);
    return predictions.map((p, i) => ({
      ...p,
      explanation: explanations[i] && typeof explanations[i] === 'string' ? explanations[i] : undefined,
    }));
  } catch (err) {
    console.warn('[PredictionExplainer] Failed to add explanations:', err);
    return predictions as PredictionWithExplanation[];
  }
}
