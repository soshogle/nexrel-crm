#!/usr/bin/env tsx
/**
 * Fix Theodora's Voice AI by setting Vercel env vars via API.
 *
 * 1. CRM (nexrel-crm): Fix DATABASE_URL if corrupted
 * 2. Theodora (theodora-stavropoulos-remax): Set NEXREL_CRM_URL, NEXREL_WEBSITE_ID, WEBSITE_VOICE_CONFIG_SECRET
 * 3. Trigger redeploy for both projects
 *
 * Prerequisites:
 *   - VERCEL_TOKEN in .env (from https://vercel.com/account/tokens)
 *   - DATABASE_URL, WEBSITE_VOICE_CONFIG_SECRET in .env
 *
 * Run: npx tsx scripts/fix-theodora-voice-ai-vercel.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/fix-theodora-voice-ai-vercel.ts
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const VERCEL_API = "https://api.vercel.com/v9";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_vJ3wdbf3QXa3R4KzaZjDEkLP";
const CRM_PROJECT = "nexrel-crm";
const THEODORA_PROJECT = "theodora-stavropoulos-remax";
const THEODORA_WEBSITE_ID = "cmlpuuy8a0001pu4gz4y97hrm";
const CRM_URL = "https://www.nexrel.soshogle.com";

async function api(
  method: string,
  path: string,
  body?: object
): Promise<Response> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN not set in .env");
  }
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
  if (!res.ok) {
    throw new Error(`List env failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const envs = data.envs || data;
  return (Array.isArray(envs) ? envs : []).map((e: any) => ({
    key: e.key,
    id: e.id,
  }));
}

async function deleteEnvVar(projectId: string, envId: string): Promise<void> {
  const res = await api("DELETE", `/projects/${projectId}/env/${envId}`);
  if (!res.ok) {
    throw new Error(`Delete env failed: ${res.status} ${await res.text()}`);
  }
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

async function setEnvVar(
  projectId: string,
  key: string,
  value: string,
  dryRun: boolean
): Promise<void> {
  const existing = await listEnvVars(projectId);
  const toDelete = existing.filter((e) => e.key === key);
  for (const e of toDelete) {
    if (!dryRun) {
      await deleteEnvVar(projectId, e.id);
      console.log(`   Deleted existing ${key}`);
    } else {
      console.log(`   [dry] Would delete existing ${key} (${e.id})`);
    }
  }
  if (!dryRun) {
    await createEnvVar(projectId, key, value);
    console.log(`   Set ${key}`);
  } else {
    console.log(`   [dry] Would set ${key}`);
  }
}

async function triggerDeploy(projectId: string, projectName: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`   [dry] Would trigger deploy for ${projectName}`);
    return;
  }
  const res = await fetch(
    `https://api.vercel.com/v13/deployments?projectId=${projectId}&teamId=${TEAM_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: projectName, target: "production" }),
    }
  );
  if (!res.ok) {
    console.warn(`   ⚠ Deploy trigger failed: ${res.status} ${await res.text()}`);
    return;
  }
  const data = await res.json();
  console.log(`   ✅ Deploy triggered: ${data.url || data.uid || "OK"}`);
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

  const token = process.env.VERCEL_TOKEN;
  const dbUrl = process.env.DATABASE_URL;
  const voiceSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

  if (!token) {
    console.error("❌ VERCEL_TOKEN not set in .env");
    process.exit(1);
  }
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set in .env");
    process.exit(1);
  }
  if (!voiceSecret) {
    console.error("❌ WEBSITE_VOICE_CONFIG_SECRET not set in .env");
    process.exit(1);
  }

  // Ensure DATABASE_URL has no psql prefix (common corruption)
  const cleanDbUrl = dbUrl.replace(/^psql\s+['"]?|['"]?\s*$/, "").trim();
  if (cleanDbUrl !== dbUrl) {
    console.log("⚠ DATABASE_URL had psql prefix – using cleaned value");
  }

  console.log("1️⃣ CRM (nexrel-crm) – Fix DATABASE_URL\n");

  const crmId = await findProject(CRM_PROJECT);
  if (!crmId) {
    console.error("❌ Project nexrel-crm not found. Check VERCEL_TOKEN and team.");
    process.exit(1);
  }
  console.log(`   Project ID: ${crmId}`);

  await setEnvVar(crmId, "DATABASE_URL", cleanDbUrl, dryRun);

  console.log("\n2️⃣ Theodora (theodora-stavropoulos-remax) – Voice AI env vars\n");

  const theodoraId = await findProject(THEODORA_PROJECT);
  if (!theodoraId) {
    console.error("❌ Project theodora-stavropoulos-remax not found.");
    console.log("   Ensure the Vercel project exists and is named exactly: theodora-stavropoulos-remax");
    process.exit(1);
  }
  console.log(`   Project ID: ${theodoraId}`);

  await setEnvVar(theodoraId, "NEXREL_CRM_URL", CRM_URL, dryRun);
  await setEnvVar(theodoraId, "NEXREL_WEBSITE_ID", THEODORA_WEBSITE_ID, dryRun);
  await setEnvVar(theodoraId, "WEBSITE_VOICE_CONFIG_SECRET", voiceSecret, dryRun);

  console.log("\n3️⃣ Trigger redeploy\n");

  await triggerDeploy(crmId, CRM_PROJECT, dryRun);
  await triggerDeploy(theodoraId, THEODORA_PROJECT, dryRun);

  console.log("\n✅ Done.");
  if (dryRun) {
    console.log("\nRun without DRY_RUN=1 to apply changes.");
  } else {
    console.log("\nDeployments may take a few minutes. Check:");
    console.log("   https://vercel.com/soshogle/nexrel-crm");
    console.log("   https://vercel.com/soshogle/theodora-stavropoulos-remax");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
