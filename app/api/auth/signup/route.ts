import { NextRequest, NextResponse } from 'next/server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public signups are disabled.
 * Users must either:
 * 1. Be created by a Super Admin (platform-admin create-business-owner)
 * 2. Be invited by an administrator
 * 3. Use parent signup (club-specific flow at /auth/parent/signup)
 *
 * Contact sales@soshogle.com for access.
 */
export async function POST(request: NextRequest) {
  return apiErrors.forbidden(
    'Direct signups are disabled. To use this CRM, you must either purchase a subscription plan or be invited by an administrator. Contact sales@soshogle.com for more information.'
  );
}
