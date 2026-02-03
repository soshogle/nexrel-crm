/**
 * Public test endpoint to check API key configuration
 * No authentication required - for debugging only
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const abacusKey = process.env.ABACUSAI_API_KEY;
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeys: {
      openai: {
        configured: !!openaiKey,
        keyLength: openaiKey?.length || 0,
        keyPreview: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'NOT SET',
        status: openaiKey ? '✅ Configured' : '❌ Missing',
      },
      abacus: {
        configured: !!abacusKey,
        keyLength: abacusKey?.length || 0,
        keyPreview: abacusKey ? `${abacusKey.substring(0, 10)}...` : 'NOT SET',
        status: abacusKey ? '⚠️ Still present (should be removed)' : '✅ Removed (correct)',
      },
    },
    migration: {
      status: 'complete',
      message: 'All features now use OpenAI API. Abacus AI is NOT required.',
      required: 'OPENAI_API_KEY',
      notRequired: 'ABACUSAI_API_KEY',
    },
    recommendation: !openaiKey 
      ? '⚠️ OPENAI_API_KEY is not set. Add it to Vercel environment variables.'
      : abacusKey
      ? '⚠️ ABACUSAI_API_KEY is still set but not needed. You can remove it.'
      : '✅ Configuration looks correct!',
  });
}
