/**
 * REMOVED: Debug session endpoint was a security vulnerability.
 * It returned full session data including user details without
 * proper access controls.
 * Removed as part of security audit - March 2026.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
