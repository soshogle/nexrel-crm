#!/usr/bin/env tsx
/**
 * Set DATABASE_URL on Theodora's Vercel project.
 * Uses neonDatabaseUrl from her Website record, or THEODORA_DATABASE_URL env.
 *
 * Prerequisites:
 *   - VERCEL_TOKEN in .env (from https://vercel.com/account/tokens)
 *   - Website.neonDatabaseUrl set in CRM, OR THEODORA_DATABASE_URL="postgresql://..."
 *
 * Run: npx tsx scripts/set-theodora-vercel-database.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/set-theodora-vercel-database.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

const VERCEL_API = "https://api.vercel.com/v9";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_vJ3wdbf3QXa3R4KzaZjDEkLP";
const THEODORA_PROJECT = "theodora-stavropoulos-remax";
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function api(method: string, path: string, body?: object): Promise<Response> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not set in .env");
  const sep = path.includes("?") ? "&" : "?";
  const url = `${VERCEL_API}${path}${sep}teamId=${TEAM_ID}`;
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function listEnvVars(projectId: string): Promise<{ key: string; id: string }[]> {
  const res = await api("GET", `/projects/${projectId}/env`);
  if (!res.ok) throw new Error(`List env failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const envs = data.envs || data;
  return (Array.isArray(envs) ? envs : []).map((e: { key: string; id: string }) => ({
    key: e.key,
    id: e.id,
  }));
}

async function deleteEnvVar(projectId: string, envId: string): Promise<void> {
  const res = await api("DELETE", `/projects/${projectId}/env/${envId}`);
  if (!res.ok) throw new Error(`Delete env failed: ${res.status} ${await res.text()}`);
}

async function createEnvVar(
  projectId: string,
  key: string,
  value: string,
  target: string[] = ["production", "preview"]
): Promise<void> {
  const res = await api("POST", `/projects/${projectId}/env`, {
    key,
    value,
    type: "encrypted",
    target,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create env ${key} failed: ${res.status} ${text}`);
  }
}

async function findProject(name: string): Promise<string | null> {
  const res = await api("GET", `/projects/${encodeURIComponent(name)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Get project failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.id || data.project?.id || null;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  if (dryRun) console.log("🔍 DRY RUN – no changes will be made\n");

  let databaseUrl = process.env.THEODORA_DATABASE_URL;
  if (!databaseUrl) {
    const theodora = await prisma.user.findUnique({
      where: { email: THEODORA_EMAIL },
      include: { websites: true },
    });
    const website = theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
    databaseUrl = website?.neonDatabaseUrl ?? undefined;
  }

  if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
    console.error("❌ No Theodora database URL found.");
    console.log("   Option 1: Set THEODORA_DATABASE_URL=\"postgresql://...\" in .env");
    console.log("   Option 2: Run set-theodora-neon-database-url.ts first to set neonDatabaseUrl on her Website");
    process.exit(1);
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("❌ VERCEL_TOKEN not set in .env");
    process.exit(1);
  }

  const projectId = await findProject(THEODORA_PROJECT);
  if (!projectId) {
    console.error("❌ Project", THEODORA_PROJECT, "not found on Vercel.");
    process.exit(1);
  }

  const existing = await listEnvVars(projectId);
  const toDelete = existing.filter((e) => e.key === "DATABASE_URL");
  for (const e of toDelete) {
    if (!dryRun) {
      await deleteEnvVar(projectId, e.id);
      console.log("   Deleted existing DATABASE_URL");
    } else {
      console.log("   [dry] Would delete existing DATABASE_URL");
    }
  }

  if (!dryRun) {
    await createEnvVar(projectId, "DATABASE_URL", databaseUrl);
    console.log("   Set DATABASE_URL");
  } else {
    console.log("   [dry] Would set DATABASE_URL");
  }

  console.log("\n✅ Done.");
  if (!dryRun) {
    console.log("   Trigger a redeploy in Vercel for changes to take effect.");
    console.log("   https://vercel.com/soshogle/theodora-stavropoulos-remax");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
