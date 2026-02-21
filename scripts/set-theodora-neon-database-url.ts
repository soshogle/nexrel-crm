/**
 * Set neonDatabaseUrl on Theodora's Website record so the Centris sync fallback finds her.
 * The cron uses Websites with templateType=SERVICE, status=READY, and neonDatabaseUrl set.
 *
 * Run from nexrel-crm root:
 *   THEODORA_DATABASE_URL="postgresql://..." npx tsx scripts/set-theodora-neon-database-url.ts
 *
 * Or with template .env:
 *   npx tsx scripts/set-theodora-neon-database-url.ts
 *   (reads from nexrel-service-template/.env for Theodora's DB; CRM .env used for Prisma)
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// CRM .env for Prisma (do NOT load template .env - it would overwrite DATABASE_URL)
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

/** Theodora's broker Neon DB (ep-delicate-bar). Override with THEODORA_DATABASE_URL env. */
const THEODORA_BROKER_DB_URL =
  "postgresql://neondb_owner:npg_VZvTl5BQ9keR@ep-delicate-bar-aiwr4hlz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

function getTheodoraDatabaseUrl(): string | undefined {
  if (process.env.THEODORA_DATABASE_URL) {
    return process.env.THEODORA_DATABASE_URL;
  }
  const templateEnvPath = path.join(process.cwd(), "nexrel-service-template", ".env");
  if (fs.existsSync(templateEnvPath)) {
    const content = fs.readFileSync(templateEnvPath, "utf-8");
    const m = content.match(/^\s*DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return THEODORA_BROKER_DB_URL;
}

const prisma = new PrismaClient();

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function main() {
  const databaseUrl = getTheodoraDatabaseUrl();

  if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
    console.error("❌ DATABASE_URL or THEODORA_DATABASE_URL required (PostgreSQL connection string)");
    console.log("   Set in .env or: THEODORA_DATABASE_URL=\"postgresql://...\" npx tsx scripts/set-theodora-neon-database-url.ts");
    process.exit(1);
  }

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  if (!theodora) {
    console.error("❌ User not found:", THEODORA_EMAIL);
    process.exit(1);
  }

  const website =
    theodora.websites.find((w) => w.voiceAIEnabled && w.elevenLabsAgentId) ||
    theodora.websites[0];

  if (!website) {
    console.error("❌ No Website found for Theodora. Run create-theodora-website.ts first.");
    process.exit(1);
  }

  await prisma.website.update({
    where: { id: website.id },
    data: {
      neonDatabaseUrl: databaseUrl,
      templateType: "SERVICE",
      status: "READY",
    },
  });

  console.log("✅ Updated Website:", website.name);
  console.log("   ID:", website.id);
  console.log("   neonDatabaseUrl: set");
  console.log("\n   Centris sync will now find her automatically (no CENTRIS_REALTOR_DATABASE_URLS needed).");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
