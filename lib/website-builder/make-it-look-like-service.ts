/**
 * "Make it look like X" - Analyze reference site and suggest layout/style changes
 */

import OpenAI from 'openai';
import { websiteScraper } from './scraper';
import { getWebsiteStructureSummary } from './granular-tools';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MakeItLookLikeResult {
  suggestions: Array<{
    type: 'globalStyles' | 'section' | 'hero';
    description: string;
    changes: Record<string, any>;
  }>;
  referenceSummary: string;
}

export async function analyzeReferenceAndSuggest(
  referenceUrl: string,
  currentStructure: any,
  websiteId: string
): Promise<MakeItLookLikeResult> {
  const scraped = await websiteScraper.scrapeWebsite(referenceUrl);
  const currentSummary = getWebsiteStructureSummary(currentStructure);

  const referenceSummary = JSON.stringify({
    colors: scraped.styles?.colors || [],
    fonts: scraped.styles?.fonts || [],
    layout: scraped.structure?.layout || 'unknown',
    seo: scraped.seo,
    images: (scraped.images || []).length,
  }, null, 2);

  const prompt = `You are a website design expert. Analyze this reference website data and the user's current website structure. Suggest specific changes to make the user's site look like the reference.

REFERENCE WEBSITE (from ${referenceUrl}):
${referenceSummary}

CURRENT WEBSITE STRUCTURE:
${JSON.stringify(currentSummary, null, 2)}

Return a JSON object with:
{
  "suggestions": [
    {
      "type": "globalStyles" | "section" | "hero",
      "description": "Short description of the change",
      "changes": { ... } // Object to merge into structure (e.g. globalStyles.colors.primary, hero props, etc.)
    }
  ]
}

Focus on: colors, fonts, hero section style (title size, button style), spacing. Keep changes minimal and actionable.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return {
    suggestions: parsed.suggestions || [],
    referenceSummary,
  };
}
