#!/usr/bin/env tsx

import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { Client } from "pg";
import { getMetaDb } from "@/lib/db/meta-db";
import { resolveTenantRoutingByUserId } from "@/lib/tenancy/tenant-registry";
import {
  createNeonTenantDatabase,
  deleteNeonProject,
  persistTenantOverride,
  tenantDatabaseEnvKey,
  verifyDatabaseConnection,
} from "@/lib/tenancy/owner-db-provisioning";

type Args = {
  apply: boolean;
  ownerId: string | null;
  skipOwnerIds: Set<string>;
  limit: number;
  envFile: string;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    if (i === -1) return null;
    return argv[i + 1] ?? null;
  };
  return {
    apply: argv.includes("--apply"),
    ownerId: get("--ownerId"),
    skipOwnerIds: new Set(
      String(get("--skipOwnerIds") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
    limit: Number(get("--limit") || "20"),
    envFile: get("--env") || ".env.local",
  };
}

function getUrlByEnvKey(key: string): string {
  const raw = process.env[key];
  if (!raw || !raw.trim()) {
    throw new Error(`Missing env URL for key ${key}`);
  }
  return raw;
}

async function hydrateTenantOverridesFromVercelEnv(): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return;

  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/env`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to read Vercel env for overrides: ${await res.text()}`,
    );
  }

  const payload = (await res.json()) as {
    envs?: Array<{ key: string; value?: string }>;
  };
  const overrideEnv = payload.envs?.find(
    (e) => e.key === "TENANT_DB_OVERRIDES_JSON",
  );
  if (overrideEnv?.value) {
    process.env.TENANT_DB_OVERRIDES_JSON = overrideEnv.value;
  }
}

async function listUserIdTables(source: Client): Promise<string[]> {
  const result = await source.query<{ table_name: string }>(
    `
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND c.column_name = 'userId'
      ORDER BY c.table_name ASC
    `,
  );
  return result.rows.map((r) => r.table_name);
}

async function copyRowById(
  source: Client,
  target: Client,
  table: "User" | "Agency",
  id: string,
): Promise<void> {
  const rowResult = await source.query(
    `SELECT * FROM "${table}" WHERE id = $1`,
    [id],
  );
  const row = rowResult.rows[0];
  if (!row) return;

  const columns = Object.keys(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const values = columns.map((k) => row[k]);
  const columnsSql = columns.map((c) => `"${c}"`).join(", ");

  await target.query(
    `INSERT INTO "${table}" (${columnsSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
    values,
  );
}

async function runSchemaPush(targetUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const p = spawn("npx", ["prisma", "db", "push", "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: targetUrl },
      stdio: "inherit",
    });
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma db push failed with code ${code}`));
    });
  });
}

async function copyTableRowsByTenant(
  source: Client,
  target: Client,
  table: string,
  _tenantId: string,
): Promise<void> {
  const rowsResult = await source.query(
    `SELECT * FROM "${table}" WHERE "userId" = $1`,
    [_tenantId],
  );
  const rows = rowsResult.rows;
  if (rows.length === 0) return;

  for (const row of rows) {
    await insertRowWithDependencies({
      source,
      target,
      table,
      row,
      trail: new Set<string>(),
    });
  }
}

const jsonColumnCache = new Map<string, Set<string>>();
const fkConstraintCache = new Map<
  string,
  {
    localColumns: string[];
    foreignTable: string;
    foreignColumns: string[];
  } | null
>();

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function rowMarker(table: string, row: Record<string, unknown>): string {
  if (row.id) return `${table}:id:${String(row.id)}`;
  const keys = Object.keys(row).sort();
  const fingerprint = keys.map((k) => `${k}=${String(row[k])}`).join("|");
  return `${table}:row:${fingerprint}`;
}

async function listJsonColumns(
  source: Client,
  table: string,
): Promise<Set<string>> {
  const cached = jsonColumnCache.get(table);
  if (cached) return cached;

  const result = await source.query<{
    column_name: string;
    data_type: string;
  }>(
    `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [table],
  );

  const jsonColumns = new Set(
    result.rows
      .filter((r) => r.data_type === "json" || r.data_type === "jsonb")
      .map((r) => r.column_name),
  );
  jsonColumnCache.set(table, jsonColumns);
  return jsonColumns;
}

function normalizeValueForInsert(
  value: unknown,
  isJsonColumn: boolean,
): unknown {
  if (!isJsonColumn) return value;
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
}

async function getFkConstraint(
  source: Client,
  table: string,
  constraint: string,
): Promise<{
  localColumns: string[];
  foreignTable: string;
  foreignColumns: string[];
} | null> {
  const cacheKey = `${table}:${constraint}`;
  if (fkConstraintCache.has(cacheKey)) return fkConstraintCache.get(cacheKey)!;

  const result = await source.query<{
    local_column: string;
    foreign_table: string;
    foreign_column: string;
    ordinal_position: number;
  }>(
    `
      SELECT
        kcu.column_name AS local_column,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.constraint_name = $2
      ORDER BY kcu.ordinal_position ASC
    `,
    [table, constraint],
  );

  if (result.rows.length === 0) {
    fkConstraintCache.set(cacheKey, null);
    return null;
  }

  const foreignTable = result.rows[0].foreign_table;
  const localColumns = result.rows.map((r) => r.local_column);
  const foreignColumns = result.rows.map((r) => r.foreign_column);
  const out = { localColumns, foreignTable, foreignColumns };
  fkConstraintCache.set(cacheKey, out);
  return out;
}

async function insertRowWithDependencies(params: {
  source: Client;
  target: Client;
  table: string;
  row: Record<string, unknown>;
  trail: Set<string>;
}): Promise<void> {
  const { source, target, table, row, trail } = params;
  const marker = rowMarker(table, row);
  if (trail.has(marker)) return;

  const jsonColumns = await listJsonColumns(source, table);
  const columns = Object.keys(row);
  const columnsSql = columns.map(quoteIdent).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const values = columns.map((c) =>
    normalizeValueForInsert(row[c], jsonColumns.has(c)),
  );

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await target.query(
        `INSERT INTO ${quoteIdent(table)} (${columnsSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values,
      );
      return;
    } catch (error: any) {
      if (error?.code !== "23503" || !error?.constraint) {
        throw error;
      }

      const fk = await getFkConstraint(source, table, error.constraint);
      if (!fk) throw error;

      const localValues = fk.localColumns.map((c) => row[c]);
      if (localValues.some((v) => v === null || v === undefined)) {
        throw error;
      }

      const where = fk.foreignColumns
        .map((col, idx) => `${quoteIdent(col)} = $${idx + 1}`)
        .join(" AND ");
      const depRows = await source.query(
        `SELECT * FROM ${quoteIdent(fk.foreignTable)} WHERE ${where}`,
        localValues,
      );
      if (depRows.rows.length === 0) {
        throw error;
      }

      trail.add(marker);
      try {
        for (const depRow of depRows.rows) {
          await insertRowWithDependencies({
            source,
            target,
            table: fk.foreignTable,
            row: depRow,
            trail,
          });
        }
      } finally {
        trail.delete(marker);
      }
    }
  }

  throw new Error(`Unable to resolve FK dependencies for ${table}`);
}

async function verifyCounts(
  source: Client,
  target: Client,
  tenantId: string,
  tables: string[],
): Promise<void> {
  for (const table of tables) {
    const [src, dst] = await Promise.all([
      source.query(
        `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "userId" = $1`,
        [tenantId],
      ),
      target.query(
        `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "userId" = $1`,
        [tenantId],
      ),
    ]);
    const srcCount = src.rows[0]?.c ?? 0;
    const dstCount = dst.rows[0]?.c ?? 0;
    if (srcCount !== dstCount) {
      throw new Error(
        `Count mismatch in ${table} for tenant ${tenantId}: source=${srcCount}, target=${dstCount}`,
      );
    }
  }
}

async function migrateOwner(
  owner: { id: string; email: string },
  apply: boolean,
) {
  const routing = await resolveTenantRoutingByUserId(owner.id);
  if (!routing) throw new Error(`Routing not found for owner ${owner.id}`);
  if (routing.routingMode === "TENANT_OVERRIDE") {
    return { ownerId: owner.id, status: "already-compliant" as const };
  }

  const sourceUrl = getUrlByEnvKey(routing.databaseEnvKey);
  const dedicatedEnvKey = tenantDatabaseEnvKey(owner.id);

  if (!apply) {
    return {
      ownerId: owner.id,
      status: "planned" as const,
      sourceEnvKey: routing.databaseEnvKey,
      targetEnvKey: dedicatedEnvKey,
    };
  }

  const neon = await createNeonTenantDatabase({
    tenantId: owner.id,
    email: owner.email,
  });
  const targetUrl = neon.databaseUrl;
  try {
    await verifyDatabaseConnection(targetUrl);
    await runSchemaPush(targetUrl);

    const source = new Client({ connectionString: sourceUrl });
    const target = new Client({ connectionString: targetUrl });
    await source.connect();
    await target.connect();
    try {
      await copyRowById(source, target, "User", owner.id);
      const agencyRes = await source.query<{ agencyId: string | null }>(
        'SELECT "agencyId" FROM "User" WHERE id = $1',
        [owner.id],
      );
      const agencyId = agencyRes.rows[0]?.agencyId;
      if (agencyId) {
        await copyRowById(source, target, "Agency", agencyId);
      }

      const tables = await listUserIdTables(source);
      for (const table of tables) {
        await copyTableRowsByTenant(source, target, table, owner.id);
      }
      await verifyCounts(source, target, owner.id, tables);
    } finally {
      await source.end();
      await target.end();
    }

    process.env[dedicatedEnvKey] = targetUrl;
    await persistTenantOverride({
      tenantId: owner.id,
      databaseEnvKey: dedicatedEnvKey,
      databaseUrl: targetUrl,
    });

    const verifyRouting = await resolveTenantRoutingByUserId(owner.id);
    if (
      !verifyRouting ||
      verifyRouting.routingMode !== "TENANT_OVERRIDE" ||
      verifyRouting.databaseEnvKey !== dedicatedEnvKey
    ) {
      throw new Error(`Cutover verification failed for ${owner.id}`);
    }
  } catch (error) {
    await deleteNeonProject(neon.projectId);
    throw error;
  }

  return {
    ownerId: owner.id,
    status: "migrated" as const,
    targetEnvKey: dedicatedEnvKey,
  };
}

async function main() {
  const args = parseArgs();
  dotenv.config({ path: args.envFile });
  await hydrateTenantOverridesFromVercelEnv();

  const where: Record<string, unknown> = {
    role: "BUSINESS_OWNER",
    deletedAt: null,
  };
  if (args.ownerId) where.id = args.ownerId;

  const owners = await getMetaDb().user.findMany({
    where,
    select: { id: true, email: true },
    take: args.limit,
    orderBy: { createdAt: "asc" },
  });

  const filteredOwners = owners.filter((o) => !args.skipOwnerIds.has(o.id));

  const results = [] as Array<Record<string, unknown>>;
  for (const owner of filteredOwners) {
    try {
      const result = await migrateOwner(owner, args.apply);
      results.push({ ...result, email: owner.email });
      console.log(`[tenant-migration] ${owner.email}: ${result.status}`);
    } catch (error: any) {
      results.push({
        ownerId: owner.id,
        email: owner.email,
        status: "failed",
        error: error.message,
      });
      console.error(
        `[tenant-migration] ${owner.email}: failed - ${error.message}`,
      );
      if (args.apply) {
        console.error("Stopping apply run on first failure for safety.");
        break;
      }
    }
  }

  console.log(
    JSON.stringify(
      { apply: args.apply, processed: results.length, results },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Owner migration run failed:", error);
  process.exit(1);
});
