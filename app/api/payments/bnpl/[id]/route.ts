
/**
 * BNPL Application Detail API
 * GET - Get application by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const application = await BnplService.getApplication(params.id);

    if (!application) {
      return apiErrors.notFound('Application not found');
    }

    if (application.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error('Error fetching BNPL application:', error);
    return apiErrors.internal('Failed to fetch BNPL application');
  }
}
