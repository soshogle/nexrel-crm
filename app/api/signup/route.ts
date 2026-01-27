
import { NextRequest, NextResponse } from 'next/server'

/**
 * Direct signups are disabled.
 * Users must either:
 * 1. Purchase a subscription and be created by admin
 * 2. Be invited by an administrator
 * 
 * Note: Parent signups for sports clubs are still available at /auth/parent/signup
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Direct signups are disabled',
      message: 'To use this CRM, you must either purchase a subscription plan or be invited by an administrator. Contact sales@soshogle.com for more information.'
    },
    { status: 403 }
  );
}
