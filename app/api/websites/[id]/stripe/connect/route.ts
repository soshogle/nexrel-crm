/**
 * Stripe Connect API for Websites
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteStripeConnect } from '@/lib/website-builder/stripe-connect';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, returnUrl } = body;

    if (action === 'create_link') {
      const result = await websiteStripeConnect.createAccountLink(
        params.id,
        returnUrl || `${process.env.NEXTAUTH_URL}/dashboard/websites/${params.id}`
      );

      return NextResponse.json({
        success: true,
        onboardingUrl: result.onboardingUrl,
        accountId: result.accountId,
      });
    }

    if (action === 'create_login_link') {
      const result = await websiteStripeConnect.createLoginLink(params.id);
      return NextResponse.json({
        success: true,
        loginUrl: result.url,
        expiresAt: result.expiresAt,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await websiteStripeConnect.getAccountStatus(params.id);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Error getting Stripe status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
