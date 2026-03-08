/**
 * CRM Database Client - Phase 2–5
 * Routes to industry DB when ctx.industry set and DATABASE_URL_* configured.
 * Falls back to main prisma when industry DB not configured (backward compatible).
 */

import { prisma } from "@/lib/db";
import { getIndustryDb } from "@/lib/db/industry-db";
import type { DalContext } from "./types";

function isStrictRoutingEnabled(): boolean {
  return process.env.DAL_STRICT_ROUTING === "true";
}

function isIndustryRequiredEnabled(): boolean {
  return process.env.DAL_STRICT_INDUSTRY_REQUIRED === "true";
}

/**
 * Get CRM database client for the given context.
 * When ctx.industry is set and DATABASE_URL_{INDUSTRY} exists, returns industry DB.
 * Otherwise returns shared prisma (single DB).
 */
export function getCrmDb(ctx: DalContext) {
  const industry = ctx.industry;

  if (isIndustryRequiredEnabled() && !industry) {
    throw new Error(
      "[DAL] Missing tenant industry in strict mode. Refusing fallback to main DB.",
    );
  }

  if (industry) {
    if (isStrictRoutingEnabled() && !process.env[`DATABASE_URL_${industry}`]) {
      throw new Error(
        `[DAL] Missing DATABASE_URL_${industry} while DAL_STRICT_ROUTING=true. Refusing fallback to main DB.`,
      );
    }

    if (process.env[`DATABASE_URL_${industry}`]) {
      if (
        process.env.NODE_ENV === "development" &&
        process.env.DAL_LOG_ROUTING === "true"
      ) {
        console.debug("[DAL] Routing to industry DB:", industry);
      }
      return getIndustryDb(industry);
    }

    if (isStrictRoutingEnabled()) {
      throw new Error(
        `[DAL] Industry provided (${industry}) but no industry DB URL available in strict mode.`,
      );
    }
  }

  if (isStrictRoutingEnabled() && !industry) {
    throw new Error(
      "[DAL] Strict routing enabled and no industry provided. Refusing fallback to main DB.",
    );
  }

  return prisma;
}
