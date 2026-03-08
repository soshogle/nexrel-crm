#!/usr/bin/env tsx

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const ENV_FILE = process.argv[2] || ".vercel/.env.production.local";
const EMAIL = "orthodontist@nexrel.com";

function normalizeUrl(url?: string) {
  return (url || "").replace(/\\n/g, "").trim();
}

async function main() {
  dotenv.config({ path: ENV_FILE });

  const mainUrl = normalizeUrl(process.env.DATABASE_URL);
  const orthoUrl = normalizeUrl(process.env.DATABASE_URL_ORTHODONTIST);

  if (!mainUrl || !orthoUrl) {
    throw new Error("Missing DATABASE_URL or DATABASE_URL_ORTHODONTIST");
  }

  const mainDb = new PrismaClient({ datasources: { db: { url: mainUrl } } });
  const orthoDb = new PrismaClient({ datasources: { db: { url: orthoUrl } } });

  async function getUserByEmailRaw(db: PrismaClient, email: string) {
    const rows = (await db.$queryRawUnsafe(
      `SELECT id, email, industry FROM "User" WHERE lower(email)=lower($1) LIMIT 1`,
      email,
    )) as Array<{ id: string; email: string; industry: string | null }>;
    return rows[0] || null;
  }

  async function getUserTables(db: PrismaClient) {
    const rows = (await db.$queryRawUnsafe(`
      SELECT t.table_name
      FROM information_schema.tables t
      JOIN information_schema.columns c_user
        ON c_user.table_schema = t.table_schema
       AND c_user.table_name = t.table_name
       AND c_user.column_name = 'userId'
      JOIN information_schema.columns c_id
        ON c_id.table_schema = t.table_schema
       AND c_id.table_name = t.table_name
       AND c_id.column_name = 'id'
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE '_prisma%'
      ORDER BY t.table_name
    `)) as Array<{ table_name: string }>;

    return rows.map((r) => r.table_name);
  }

  async function intersectTables(a: string[], b: string[]) {
    const setB = new Set(b);
    return a.filter((t) => setB.has(t));
  }

  async function copyRowsByUserId(
    source: PrismaClient,
    target: PrismaClient,
    table: string,
    userId: string,
  ) {
    const rows = (await source.$queryRawUnsafe(
      `SELECT * FROM "${table}" WHERE "userId"=$1`,
      userId,
    )) as Array<Record<string, unknown>>;

    let upsertedRows = 0;
    for (const row of rows) {
      const keys = Object.keys(row).filter((k) => k !== "id");
      const updates = keys.map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ");

      const sql =
        updates.length > 0
          ? `WITH input AS (
               SELECT * FROM json_populate_record(NULL::"${table}", $1::json)
             )
             INSERT INTO "${table}" SELECT * FROM input
             ON CONFLICT ("id") DO UPDATE SET ${updates}`
          : `WITH input AS (
               SELECT * FROM json_populate_record(NULL::"${table}", $1::json)
             )
             INSERT INTO "${table}" SELECT * FROM input
             ON CONFLICT ("id") DO NOTHING`;

      await target.$executeRawUnsafe(sql, JSON.stringify(row));
      upsertedRows += 1;
    }

    return { sourceRows: rows.length, upsertedRows };
  }

  async function countByUser(db: PrismaClient, table: string, userId: string) {
    try {
      const rows = (await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM "${table}" WHERE "userId"=$1`,
        userId,
      )) as Array<{ c: number }>;
      return rows[0]?.c ?? 0;
    } catch {
      return null;
    }
  }

  try {
    const mainUser = await getUserByEmailRaw(mainDb, EMAIL);
    const orthoUser = await getUserByEmailRaw(orthoDb, EMAIL);

    if (!mainUser || !orthoUser) {
      throw new Error(
        "Orthodontist user not found in both MAIN and ORTHODONTIST databases",
      );
    }

    if (mainUser.id !== orthoUser.id) {
      throw new Error(
        "User ID mismatch between MAIN and ORTHODONTIST; manual intervention required",
      );
    }

    const userId = mainUser.id;

    const mainTables = await getUserTables(mainDb);
    const orthoTables = await getUserTables(orthoDb);
    const tables = await intersectTables(mainTables, orthoTables);

    const results: Record<
      string,
      | { sourceRows: number; upsertedRows: number }
      | { skipped: true; reason: string }
    > = {};

    for (const table of tables) {
      try {
        results[table] = await copyRowsByUserId(mainDb, orthoDb, table, userId);
      } catch (error: any) {
        results[table] = {
          skipped: true,
          reason: error?.message || "failed",
        };
      }
    }

    const keyTables = [
      "Lead",
      "Deal",
      "Pipeline",
      "Conversation",
      "CallLog",
      "VoiceAgent",
      "Website",
      "UserAIEmployee",
    ];

    const validation: Record<
      string,
      { main: number | null; orthodontist: number | null }
    > = {};
    for (const t of keyTables) {
      validation[t] = {
        main: await countByUser(mainDb, t, userId),
        orthodontist: await countByUser(orthoDb, t, userId),
      };
    }

    const report = {
      userId,
      email: EMAIL,
      copiedTables: Object.keys(results).length,
      results,
      validation,
      completedAt: new Date().toISOString(),
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mainDb.$disconnect();
    await orthoDb.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
