/**
 * Check deployment status and API key configuration
 * This helps diagnose if the latest code is deployed
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const hasAbacusKey = !!process.env.ABACUSAI_API_KEY;
  
  return NextResponse.json({
    deployment: {
      timestamp: new Date().toISOString(),
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      environment: process.env.VERCEL_ENV || 'development',
    },
    apiKeys: {
      openai: {
        configured: !!apiKey,
        keyLength: apiKey?.length || 0,
        keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'not set',
      },
      abacus: {
        configured: hasAbacusKey,
        shouldBeRemoved: hasAbacusKey,
      },
    },
    codeVersion: {
      check: 'latest',
      message: 'If you see this, the latest code is deployed',
    },
  });
}
