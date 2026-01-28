/**
 * Validate Apify Connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateApifyConnection } from '@/lib/real-estate/scrapers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await validateApifyConnection();
    
    return NextResponse.json({
      success: result.valid,
      connected: result.valid,
      user: result.user,
      error: result.error,
      message: result.valid 
        ? `Connected to Apify as ${result.user}`
        : result.error || 'Apify connection failed'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        connected: false,
        error: error instanceof Error ? error.message : 'Validation failed' 
      },
      { status: 500 }
    );
  }
}
