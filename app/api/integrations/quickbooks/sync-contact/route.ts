
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncContactToQuickBooks } from '@/lib/integrations/quickbooks-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID required' },
        { status: 400 }
      );
    }

    const result = await syncContactToQuickBooks(session.user.id, contactId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId: result.customerId
    });

  } catch (error) {
    console.error('Sync contact error:', error);
    return NextResponse.json(
      { error: 'Failed to sync contact' },
      { status: 500 }
    );
  }
}
