
/**
 * BNPL Application Detail API
 * GET - Get application by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BnplService } from '@/lib/payments/bnpl-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const application = await BnplService.getApplication(params.id);

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error('Error fetching BNPL application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BNPL application' },
      { status: 500 }
    );
  }
}
