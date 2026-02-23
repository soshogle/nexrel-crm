/**
 * Helper for API routes - gets a DAL-routed DB client from a session.
 * Use in API routes: const db = getRouteDb(session)
 * For non-session contexts (webhooks): use getCrmDb(createDalContext(userId, industry))
 */

import { getCrmDb } from './db'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import type { Session } from 'next-auth'

const FALLBACK_CTX = { userId: '', industry: null } as const

export function getRouteDb(session: Session | null) {
  const ctx = getDalContextFromSession(session)
  return getCrmDb(ctx ?? FALLBACK_CTX)
}
