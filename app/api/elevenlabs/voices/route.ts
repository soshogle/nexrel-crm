
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsService } from '@/lib/elevenlabs';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/elevenlabs/voices
 * Fetch available ElevenLabs voices
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const voices = await elevenLabsService.getVoices();
    
    return NextResponse.json(voices);
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return apiErrors.internal(error.message || 'Failed to fetch voices');
  }
}
