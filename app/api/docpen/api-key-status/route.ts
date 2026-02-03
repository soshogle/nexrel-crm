/**
 * Simple API key status check - uses same path pattern as transcribe
 * This should work since transcribe route exists
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
    openai: {
      configured: !!openaiKey,
      keyLength: openaiKey?.length || 0,
      preview: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'NOT SET',
    },
    abacus: {
      configured: !!abacusKey,
      shouldBeRemoved: !!abacusKey,
    },
    message: 'All features use OpenAI. Abacus AI is NOT required.',
    recommendation: !openaiKey 
      ? 'Add OPENAI_API_KEY to Vercel environment variables'
      : abacusKey
      ? 'ABACUSAI_API_KEY can be removed'
      : 'Configuration is correct',
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache',
    },
  });
}
