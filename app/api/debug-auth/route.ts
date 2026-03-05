/**
 * REMOVED: Debug auth endpoint was a security vulnerability.
 * It leaked NEXTAUTH_SECRET previews, DATABASE_URL previews,
 * and allowed unauthenticated password testing.
 * Removed as part of security audit - March 2026.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
