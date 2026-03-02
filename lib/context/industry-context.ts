/**
 * Industry Context - Phase 1
 * Provides industry from session for DAL routing.
 *
 * Use in API routes and server components:
 *   const industry = getIndustryFromSession(session);
 *   const ctx = { userId: session.user.id, industry };
 */

import type { Session } from 'next-auth';
import type { Industry } from '@/lib/industry-menu-config';
import { prisma } from '@/lib/db';

/**
 * Get industry from session for DAL context.
 * Returns null if not set (DAL will use default/single DB in Phase 1).
 */
export function getIndustryFromSession(session: Session | null): Industry | null {
  if (!session?.user?.industry) return null;
  return session.user.industry as Industry;
}

/**
 * Build DalContext from session for use in DAL services.
 */
export function getDalContextFromSession(session: Session | null): {
  userId: string;
  industry: Industry | null;
} | null {
  if (!session?.user?.id) return null;
  return {
    userId: session.user.id,
    industry: getIndustryFromSession(session),
  };
}

/**
 * Create DalContext from userId and optional industry.
 * Use in libs/jobs when session is not available (e.g. workflow instance has userId).
 * Import from @/lib/context/industry-context when userId comes from params.
 */
export function createDalContext(
  userId: string,
  industry?: Industry | string | null
): { userId: string; industry: Industry | null } {
  return {
    userId,
    industry: (industry as Industry) ?? null,
  };
}

/**
 * Resolve DAL context with user industry when you only have userId (no session).
 * Looks up user.industry from the main DB so getCrmDb(ctx) routes to the correct industry DB.
 * Use in libs, background jobs, and AI handlers where session is not available.
 */
export async function resolveDalContext(userId: string): Promise<{
  userId: string;
  industry: Industry | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { industry: true },
  });
  return createDalContext(userId, user?.industry ?? null);
}
