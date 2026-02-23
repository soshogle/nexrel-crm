/**
 * Stripe Connect API for Websites
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { websiteStripeConnect } from '@/lib/website-builder/stripe-connect';
import { apiErrors } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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

    return apiErrors.badRequest('Invalid action');
  } catch (error: any) {
    console.error('Stripe Connect error:', error);
    return apiErrors.internal(error.message || 'Failed to process request');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const status = await websiteStripeConnect.getAccountStatus(params.id);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Error getting Stripe status:', error);
    return apiErrors.internal(error.message || 'Failed to get status');
  }
}
