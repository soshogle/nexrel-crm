/**
 * Industry Context - Phase 1
 * Provides industry from session for DAL routing.
 *
 * Use in API routes and server components:
 *   const industry = getIndustryFromSession(session);
 *   const ctx = { userId: session.user.id, industry };
 */

import type { Session } from "next-auth";
import type { Industry } from "@/lib/industry-menu-config";
import { prisma } from "@/lib/db";
import {
  resolveTenantOverrideEnvKey,
  resolveTenantRoutingByUserId,
} from "@/lib/tenancy/tenant-registry";

function isStrictOwnerTenancyEnabled(): boolean {
  return process.env.TENANCY_REQUIRE_OWNER_OVERRIDE === "true";
}

/**
 * Get industry from session for DAL context.
 * Returns null if not set (DAL will use default/single DB in Phase 1).
 */
export function getIndustryFromSession(
  session: Session | null,
): Industry | null {
  if (!session?.user?.industry) return null;
  return session.user.industry as Industry;
}

/**
 * Build DalContext from session for use in DAL services.
 */
export function getDalContextFromSession(session: Session | null): {
  userId: string;
  industry: Industry | null;
  databaseEnvKey?: string | null;
} | null {
  if (!session?.user?.id) return null;
  const resolvedOverride = resolveTenantOverrideEnvKey(session.user.id);
  const industryFallbackEnvKey = session.user.industry
    ? `DATABASE_URL_${session.user.industry}`
    : null;
  const ownerFallbackEnvKey =
    session.user.role === "BUSINESS_OWNER" &&
    industryFallbackEnvKey &&
    process.env[industryFallbackEnvKey]
      ? industryFallbackEnvKey
      : null;
  const databaseEnvKey = resolvedOverride
    ? resolvedOverride
    : session.user.role === "BUSINESS_OWNER"
      ? ownerFallbackEnvKey
      : session.user.databaseEnvKey ?? null;
  if (
    isStrictOwnerTenancyEnabled() &&
    session.user.role === "BUSINESS_OWNER" &&
    !databaseEnvKey
  ) {
    return null;
  }
  return {
    userId: session.user.id,
    industry: getIndustryFromSession(session),
    databaseEnvKey: databaseEnvKey ?? null,
  };
}

/**
 * Create DalContext from userId and optional industry.
 * Use in libs/jobs when session is not available (e.g. workflow instance has userId).
 * Import from @/lib/context/industry-context when userId comes from params.
 */
export function createDalContext(
  userId: string,
  industry?: Industry | string | null,
  databaseEnvKey?: string | null,
): {
  userId: string;
  industry: Industry | null;
  databaseEnvKey?: string | null;
} {
  const resolvedEnvKey = databaseEnvKey ?? resolveTenantOverrideEnvKey(userId);
  return {
    userId,
    industry: (industry as Industry) ?? null,
    databaseEnvKey: resolvedEnvKey ?? null,
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
  databaseEnvKey?: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { industry: true, role: true },
  });
  const routing = await resolveTenantRoutingByUserId(userId);
  if (
    isStrictOwnerTenancyEnabled() &&
    user?.role === "BUSINESS_OWNER" &&
    routing?.routingMode !== "TENANT_OVERRIDE"
  ) {
    throw new Error(
      "[DAL] Strict owner tenancy enabled and tenant override is missing for business owner",
    );
  }
  return createDalContext(
    userId,
    user?.industry ?? null,
    routing?.routingMode === "TENANT_OVERRIDE" ? routing.databaseEnvKey : null,
  );
}
