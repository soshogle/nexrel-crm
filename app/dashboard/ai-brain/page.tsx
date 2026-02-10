/**
 * AI Brain Page - Redirects to unified AI Brain
 * This page redirects to the unified AI Brain feature
 * which includes both Voice Assistant and Analytical Dashboard modes
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AIBrainPage() {
  // Redirect to AI Brain with dashboard mode
  redirect('/dashboard/business-ai?mode=dashboard');
}
