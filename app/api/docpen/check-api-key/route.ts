/**
 * Check if OPENAI_API_KEY is configured
 * Useful for debugging API key issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    return NextResponse.json({
      configured: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : null,
      environment: process.env.NODE_ENV,
      hint: !apiKey 
        ? 'OPENAI_API_KEY is not set. Add it to Vercel environment variables.'
        : 'API key is configured. If transcription still fails, check if the key is valid.'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
