/**
 * Run Centris sync locally for debugging.
 * Uses same logic as cron: CENTRIS_REALTOR_DATABASE_URLS or Website fallback.
 *
 * Run: npx tsx scripts/run-sync-centris-debug.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { runCentralCentrisSync } from "../lib/centris-sync";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  let databaseUrls: string[] = [];

  const envUrls = process.env.CENTRIS_REALTOR_DATABASE_URLS;
  if (envUrls) {
    try {
      const parsed = JSON.parse(envUrls) as string[];
      if (Array.isArray(parsed)) {
        databaseUrls = parsed.filter((u) => typeof u === "string" && u.startsWith("postgresql://"));
      }
    } catch {}
  }

  if (databaseUrls.length === 0) {
    const websites = await prisma.website.findMany({
      where: {
        templateType: "SERVICE",
        status: "READY",
        neonDatabaseUrl: { not: null },
      },
      select: { neonDatabaseUrl: true },
    });
    databaseUrls = websites
      .map((w) => w.neonDatabaseUrl)
      .filter((u): u is string => !!u && u.startsWith("postgresql://"));
  }

  if (databaseUrls.length === 0) {
    console.error("No broker databases configured.");
    process.exit(1);
  }

  console.log("Running sync to", databaseUrls.length, "database(s)...");
  const result = await runCentralCentrisSync(databaseUrls, 25);
  console.log("Fetched:", result.fetched);
  console.log("Databases:", JSON.stringify(result.databases, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
