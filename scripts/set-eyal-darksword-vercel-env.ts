#!/usr/bin/env tsx
/**
 * Set Voice AI env vars on Eyal's darksword-armory Vercel project via API.
 *
 * Prerequisites:
 *   - VERCEL_TOKEN in .env (from https://vercel.com/account/tokens)
 *   - WEBSITE_VOICE_CONFIG_SECRET in .env (same as CRM)
 *
 * Run: npx tsx scripts/set-eyal-darksword-vercel-env.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/set-eyal-darksword-vercel-env.ts
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const VERCEL_API = "https://api.vercel.com/v9";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_vJ3wdbf3QXa3R4KzaZjDEkLP";
const EYAL_WEBSITE_ID = "cmlkk9awe0002puiqm64iqw7t";
const CRM_URL = "https://www.nexrel.soshogle.com";

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
  return (Array.isArray(envs) ? envs : []).map((e: any) => ({ key: e.key, id: e.id }));
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
  if (!res.ok) throw new Error(`Create env ${key} failed: ${res.status} ${await res.text()}`);
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
      console.log(`   [dry] Would delete existing ${key}`);
    }
  }
  if (!dryRun) {
    await createEnvVar(projectId, key, value);
    console.log(`   Set ${key}`);
  } else {
    console.log(`   [dry] Would set ${key}`);
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

  const token = process.env.VERCEL_TOKEN;
  const voiceSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

  if (!token) {
    console.error("❌ VERCEL_TOKEN not set in .env");
    process.exit(1);
  }
  if (!voiceSecret) {
    console.error("❌ WEBSITE_VOICE_CONFIG_SECRET not set in .env");
    process.exit(1);
  }

  console.log("🔧 Setting Voice AI env vars on Eyal's darksword-armory\n");

  let projectId = await findProject("darksword-armory");
  if (!projectId) projectId = await findProject("darksword-armory-website");
  if (!projectId) {
    console.error("❌ Vercel project 'darksword-armory' or 'darksword-armory-website' not found.");
    console.error("   Check VERCEL_TOKEN and team. Try VERCEL_TEAM_ID= for personal account.");
    process.exit(1);
  }
  console.log(`   Project ID: ${projectId}\n`);

  await setEnvVar(projectId, "NEXREL_CRM_URL", CRM_URL, dryRun);
  await setEnvVar(projectId, "NEXREL_WEBSITE_ID", EYAL_WEBSITE_ID, dryRun);
  await setEnvVar(projectId, "WEBSITE_VOICE_CONFIG_SECRET", voiceSecret, dryRun);

  console.log("\n✅ Done.");
  if (dryRun) {
    console.log("\nRun without DRY_RUN=1 to apply changes.");
  } else {
    console.log("\nRedeploy darksword-armory for changes to take effect.");
    console.log("   https://vercel.com/soshogle/darksword-armory");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
