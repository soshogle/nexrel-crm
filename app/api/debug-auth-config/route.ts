/**
 * REMOVED: Debug auth-config endpoint was a security vulnerability.
 * It leaked NEXTAUTH_SECRET previews and DATABASE_URL previews
 * without any authentication.
 * Removed as part of security audit - March 2026.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
