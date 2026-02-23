
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncContactToQuickBooks } from '@/lib/integrations/quickbooks-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { contactId } = body;

    if (!contactId) {
      return apiErrors.badRequest('Contact ID required');
    }

    const result = await syncContactToQuickBooks(session.user.id, contactId);

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({
      success: true,
      customerId: result.customerId
    });

  } catch (error) {
    console.error('Sync contact error:', error);
    return apiErrors.internal('Failed to sync contact');
  }
}
