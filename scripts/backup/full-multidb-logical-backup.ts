#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const ENV_FILE = process.argv[2] || ".vercel/.env.production.local";

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeUrl(url: string): string {
  return url.replace(/\\n/g, "").trim();
}

async function backupDb(dbKey: string, dbUrl: string, rootDir: string) {
  const outDir = path.join(rootDir, dbKey);
  ensureDir(outDir);

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: ["error"],
  });

  try {
    const tables = (await prisma.$queryRawUnsafe(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`,
    )) as Array<{ table_name: string }>;

    fs.writeFileSync(
      path.join(outDir, "tables.json"),
      JSON.stringify(
        tables.map((t) => t.table_name),
        null,
        2,
      ),
      "utf8",
    );

    const counts: Array<{ table: string; rows: number }> = [];

    for (const { table_name } of tables) {
      const table = table_name;
      try {
        const rows = (await prisma.$queryRawUnsafe(
          `SELECT * FROM "${table}"`,
        )) as unknown[];
        fs.writeFileSync(
          path.join(outDir, `${table}.json`),
          JSON.stringify(rows, null, 2),
          "utf8",
        );
        counts.push({ table, rows: rows.length });
      } catch (error: any) {
        fs.writeFileSync(
          path.join(outDir, `${table}.error.txt`),
          String(error?.message || error),
          "utf8",
        );
      }
    }

    fs.writeFileSync(
      path.join(outDir, "row-counts.json"),
      JSON.stringify(counts, null, 2),
      "utf8",
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  dotenv.config({ path: ENV_FILE });

  const dbVars = Object.keys(process.env)
    .filter((k) => k === "DATABASE_URL" || k.startsWith("DATABASE_URL_"))
    .sort();

  if (dbVars.length === 0) {
    throw new Error(`No DATABASE_URL variables found in ${ENV_FILE}`);
  }

  const backupRoot = path.join(
    process.cwd(),
    "backups",
    `full-multidb-logical-${ts()}`,
  );
  ensureDir(backupRoot);

  const manifest: Array<{ key: string; status: string; note?: string }> = [];

  for (const key of dbVars) {
    const raw = process.env[key] || "";
    const url = normalizeUrl(raw);
    if (!url) {
      manifest.push({ key, status: "skipped", note: "empty" });
      continue;
    }
    try {
      await backupDb(key, url, backupRoot);
      manifest.push({ key, status: "ok" });
      console.log(`✅ Backed up ${key}`);
    } catch (error: any) {
      manifest.push({ key, status: "failed", note: error?.message || "error" });
      console.error(`❌ Failed ${key}:`, error?.message || error);
    }
  }

  fs.writeFileSync(
    path.join(backupRoot, "manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        envFile: ENV_FILE,
        databases: manifest,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\n📦 Full logical backup complete: ${backupRoot}`);
}

main().catch((error) => {
  console.error("Backup failed:", error);
  process.exit(1);
});
