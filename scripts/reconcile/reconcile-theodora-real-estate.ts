#!/usr/bin/env tsx

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const ENV_FILE = process.argv[2] || ".vercel/.env.production.local";
const EMAIL = "theodora.stavropoulos@remax-quebec.com";

function normalizeUrl(url?: string) {
  return (url || "").replace(/\\n/g, "").trim();
}

async function main() {
  dotenv.config({ path: ENV_FILE });

  const mainUrl = normalizeUrl(process.env.DATABASE_URL);
  const reUrl = normalizeUrl(process.env.DATABASE_URL_REAL_ESTATE);

  if (!mainUrl || !reUrl) {
    throw new Error("Missing DATABASE_URL or DATABASE_URL_REAL_ESTATE");
  }

  const mainDb = new PrismaClient({ datasources: { db: { url: mainUrl } } });
  const reDb = new PrismaClient({ datasources: { db: { url: reUrl } } });

  async function getUserByEmailRaw(db: PrismaClient, email: string) {
    const rows = (await db.$queryRawUnsafe(
      `SELECT id, email, industry FROM "User" WHERE lower(email)=lower($1) LIMIT 1`,
      email,
    )) as Array<{ id: string; email: string; industry: string | null }>;
    return rows[0] || null;
  }

  async function getLatestWebsiteRaw(db: PrismaClient, userId: string) {
    const rows = (await db.$queryRawUnsafe(
      `SELECT id, name, status, "vercelDeploymentUrl", "updatedAt"
       FROM "Website"
       WHERE "userId"=$1
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      userId,
    )) as Array<{
      id: string;
      name: string;
      status: string;
      vercelDeploymentUrl: string | null;
      updatedAt: string;
    }>;
    return rows[0] || null;
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

    let upserted = 0;
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
      upserted += 1;
    }

    return { sourceRows: rows.length, upsertedRows: upserted };
  }

  try {
    const mainUser = await getUserByEmailRaw(mainDb, EMAIL);
    const reUser = await getUserByEmailRaw(reDb, EMAIL);

    if (!mainUser || !reUser) {
      throw new Error(
        "Theodora user not found in both MAIN and REAL_ESTATE databases",
      );
    }

    if (mainUser.id !== reUser.id) {
      throw new Error(
        "User ID mismatch between MAIN and REAL_ESTATE; manual intervention required",
      );
    }

    const userId = mainUser.id;
    const websiteMain = await getLatestWebsiteRaw(mainDb, userId);
    const websiteRe = await getLatestWebsiteRaw(reDb, userId);

    if (!websiteRe?.vercelDeploymentUrl) {
      throw new Error(
        "REAL_ESTATE website has no deployment URL; cannot safely sync",
      );
    }

    const copiedAgents = await copyRowsByUserId(
      mainDb,
      reDb,
      "REAIEmployeeAgent",
      userId,
    );
    const copiedExecutions = await copyRowsByUserId(
      mainDb,
      reDb,
      "REAIEmployeeExecution",
      userId,
    );
    const copiedTemplates = await copyRowsByUserId(
      mainDb,
      reDb,
      "REWorkflowTemplate",
      userId,
    );
    const copiedInstances = await copyRowsByUserId(
      mainDb,
      reDb,
      "REWorkflowInstance",
      userId,
    );

    if (websiteMain) {
      await mainDb.$executeRawUnsafe(
        `UPDATE "Website" SET "vercelDeploymentUrl"=$1 WHERE id=$2`,
        websiteRe.vercelDeploymentUrl,
        websiteMain.id,
      );
    }

    const report = {
      userId,
      copied: {
        reAIEmployeeAgent: copiedAgents,
        reAIEmployeeExecution: copiedExecutions,
        reWorkflowTemplate: copiedTemplates,
        reWorkflowInstance: copiedInstances,
      },
      websiteUrlSyncedTo: websiteRe.vercelDeploymentUrl,
      completedAt: new Date().toISOString(),
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mainDb.$disconnect();
    await reDb.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
