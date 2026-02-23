
/**
 * BNPL Application Approval API
 * POST - Process and approve/deny application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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

    const result = await BnplService.processApplication(params.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing BNPL application:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to process application');
  }
}
