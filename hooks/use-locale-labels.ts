'use client';

import { useSession } from 'next-auth/react';
import { getLocaleLabels, type LocaleLabels } from '@/lib/locale-labels';

/**
 * React hook that returns country-aware labels for address fields.
 * Reads the user's country from the session (set during auth).
 */
export function useLocaleLabels(): LocaleLabels {
  const { data: session } = useSession();
  const country = (session?.user as any)?.country ?? 'CA';
  return getLocaleLabels(country);
}
