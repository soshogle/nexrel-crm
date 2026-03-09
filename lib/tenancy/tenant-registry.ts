import type { Industry } from "@prisma/client";
import { getMetaDb } from "@/lib/db/meta-db";

export type TenantRoutingMode =
  | "TENANT_OVERRIDE"
  | "INDUSTRY_FALLBACK"
  | "DEFAULT_DATABASE";

export interface TenantRoutingRecord {
  tenantId: string;
  industry: Industry | null;
  subdomain: string | null;
  databaseEnvKey: string;
  databaseUrlConfigured: boolean;
  routingMode: TenantRoutingMode;
}

type TenantOverrideMap = Record<string, string>;

const INDUSTRY_ENV_MAP: Partial<Record<Industry, string>> = {
  ACCOUNTING: "DATABASE_URL_ACCOUNTING",
  CONSTRUCTION: "DATABASE_URL_CONSTRUCTION",
  DENTIST: "DATABASE_URL_DENTIST",
  HEALTH_CLINIC: "DATABASE_URL_HEALTH_CLINIC",
  HOSPITAL: "DATABASE_URL_HOSPITAL",
  LAW: "DATABASE_URL_LAW",
  MEDICAL: "DATABASE_URL_MEDICAL",
  MEDICAL_SPA: "DATABASE_URL_MEDICAL_SPA",
  OPTOMETRIST: "DATABASE_URL_OPTOMETRIST",
  ORTHODONTIST: "DATABASE_URL_ORTHODONTIST",
  REAL_ESTATE: "DATABASE_URL_REAL_ESTATE",
  RESTAURANT: "DATABASE_URL_RESTAURANT",
  RETAIL: "DATABASE_URL_RETAIL",
  SPORTS_CLUB: "DATABASE_URL_SPORTS_CLUB",
  TECHNOLOGY: "DATABASE_URL_TECHNOLOGY",
};

function readTenantOverrideMap(): TenantOverrideMap {
  const raw = process.env.TENANT_DB_OVERRIDES_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: TenantOverrideMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (
        typeof k === "string" &&
        typeof v === "string" &&
        v.startsWith("DATABASE_URL_")
      ) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeTenantOverrideMap(overrides: TenantOverrideMap): void {
  process.env.TENANT_DB_OVERRIDES_JSON = JSON.stringify(overrides);
}

export function resolveTenantOverrideEnvKey(tenantId: string): string | null {
  const overrides = readTenantOverrideMap();
  return overrides[tenantId] ?? null;
}

export function setTenantOverrideEnvKey(
  tenantId: string,
  databaseEnvKey: string,
): void {
  if (!databaseEnvKey.startsWith("DATABASE_URL_")) {
    throw new Error("Invalid database env key for tenant override");
  }
  const overrides = readTenantOverrideMap();
  overrides[tenantId] = databaseEnvKey;
  writeTenantOverrideMap(overrides);
}

export function getTenantOverrideMap(): TenantOverrideMap {
  return readTenantOverrideMap();
}

function resolveDatabaseEnvKey(
  tenantId: string,
  industry: Industry | null,
  overrides: TenantOverrideMap,
): { databaseEnvKey: string; routingMode: TenantRoutingMode } {
  const override = overrides[tenantId];
  if (override) {
    return { databaseEnvKey: override, routingMode: "TENANT_OVERRIDE" };
  }

  if (industry && INDUSTRY_ENV_MAP[industry]) {
    return {
      databaseEnvKey: INDUSTRY_ENV_MAP[industry]!,
      routingMode: "INDUSTRY_FALLBACK",
    };
  }

  return { databaseEnvKey: "DATABASE_URL", routingMode: "DEFAULT_DATABASE" };
}

function hasConfiguredEnvUrl(key: string): boolean {
  const value = process.env[key];
  return Boolean(value && value.replace(/\n/g, "").trim());
}

export async function resolveTenantRoutingByUserId(
  tenantId: string,
): Promise<TenantRoutingRecord | null> {
  const db = getMetaDb();
  const user = await db.user.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      industry: true,
      subdomain: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) return null;

  const overrides = readTenantOverrideMap();
  const { databaseEnvKey, routingMode } = resolveDatabaseEnvKey(
    user.id,
    user.industry,
    overrides,
  );

  return {
    tenantId: user.id,
    industry: user.industry,
    subdomain: user.subdomain,
    databaseEnvKey,
    databaseUrlConfigured: hasConfiguredEnvUrl(databaseEnvKey),
    routingMode,
  };
}

export async function resolveTenantRoutingBySubdomain(
  subdomain: string,
): Promise<TenantRoutingRecord | null> {
  const db = getMetaDb();
  const user = await db.user.findUnique({
    where: { subdomain },
    select: {
      id: true,
      industry: true,
      subdomain: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) return null;
  return resolveTenantRoutingByUserId(user.id);
}

export async function listTenantRoutingCoverage(limit = 500): Promise<{
  totalUsers: number;
  withConfiguredDbUrl: number;
  byMode: Record<TenantRoutingMode, number>;
}> {
  const records = await listTenantRoutingRecords(limit);
  const byMode: Record<TenantRoutingMode, number> = {
    TENANT_OVERRIDE: 0,
    INDUSTRY_FALLBACK: 0,
    DEFAULT_DATABASE: 0,
  };

  let withConfiguredDbUrl = 0;
  for (const record of records) {
    byMode[record.routingMode] += 1;
    if (record.databaseUrlConfigured) withConfiguredDbUrl += 1;
  }

  return {
    totalUsers: records.length,
    withConfiguredDbUrl,
    byMode,
  };
}

export async function listTenantRoutingRecords(
  limit = 500,
): Promise<TenantRoutingRecord[]> {
  const db = getMetaDb();
  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: { id: true, industry: true, subdomain: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const overrides = readTenantOverrideMap();
  const records: TenantRoutingRecord[] = [];

  for (const user of users) {
    const { databaseEnvKey, routingMode } = resolveDatabaseEnvKey(
      user.id,
      user.industry,
      overrides,
    );
    records.push({
      tenantId: user.id,
      industry: user.industry,
      subdomain: user.subdomain,
      databaseEnvKey,
      databaseUrlConfigured: hasConfiguredEnvUrl(databaseEnvKey),
      routingMode,
    });
  }

  return records;
}
