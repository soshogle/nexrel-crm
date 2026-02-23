import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createABTest, getActiveTests } from '@/lib/lead-generation/ab-testing';
import { apiErrors } from '@/lib/api-error';

/**
 * POST /api/lead-generation/ab-test
 * Create new A/B test
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    
    const body = await request.json();
    
    const test = await createABTest({
      userId: session.user.id,
      name: body.name,
      type: body.type,
      variants: body.variants
    });
    
    return NextResponse.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return apiErrors.internal('Failed to create A/B test');
  }
}

/**
 * GET /api/lead-generation/ab-test
 * Get active A/B tests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    
    const tests = await getActiveTests(session.user.id);
    
    return NextResponse.json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    return apiErrors.internal('Failed to fetch A/B tests');
  }
}
