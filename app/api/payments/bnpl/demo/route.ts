
/**
 * BNPL Demo Data API
 * POST - Generate demo applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    if (!isOrthoDemo) {
      return apiErrors.forbidden('Demo data generation is restricted');
    }

    const body = await request.json();
    const count = body.count || 3;

    const applications = await BnplService.generateDemoApplications(
      session.user.id,
      count
    );

    return NextResponse.json({
      message: `Generated ${applications.length} demo BNPL applications`,
      applications,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating demo BNPL applications:', error);
    return apiErrors.internal('Failed to generate demo applications');
  }
}
