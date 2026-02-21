#!/usr/bin/env tsx
/**
 * Verify Theodora's Vercel deployment source (which repo/root it deploys from).
 * Ensures /market-appraisal and property evaluation work.
 *
 * Prerequisites: VERCEL_TOKEN in .env
 * Run: npx tsx scripts/verify-theodora-deployment-source.ts
 */

import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const VERCEL_API = "https://api.vercel.com/v9";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_vJ3wdbf3QXa3R4KzaZjDEkLP";
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

const prisma = new PrismaClient();

async function api(path: string): Promise<Response> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN not set in .env");
  }
  const sep = path.includes("?") ? "&" : "?";
  const url = `${VERCEL_API}${path}${sep}teamId=${TEAM_ID}`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function main() {
  console.log("🔍 Verifying Theodora's deployment source\n");

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
    console.error("❌ No website found for Theodora");
    process.exit(1);
  }

  const vercelUrl = (website as { vercelDeploymentUrl?: string | null }).vercelDeploymentUrl ?? undefined;
  const vercelProjectId = (website as { vercelProjectId?: string | null }).vercelProjectId ?? undefined;

  if (!vercelUrl && !vercelProjectId) {
    console.error("❌ Website has no vercelDeploymentUrl or vercelProjectId");
    process.exit(1);
  }

  const hostname = vercelUrl?.replace(/^https?:\/\//, "").split("/")[0] || "";
  const projectNameFromUrl = hostname.split(".vercel.app")[0];

  console.log("Website:", website.name);
  console.log("ID:", website.id);
  console.log("Vercel URL:", vercelUrl || "(not set)");
  console.log("Vercel Project ID:", vercelProjectId || "(not set)");
  console.log();

  // Try to find project: by ID, then by name from URL, then list and match
  let project: {
    id?: string;
    name?: string;
    link?: { type?: string; repo?: string; repoId?: string; org?: string };
    rootDirectory?: string | null;
    framework?: string;
  } | null = null;

  if (vercelProjectId) {
    const res = await api(`/projects/${vercelProjectId}`);
    if (res.ok) project = (await res.json()) as typeof project;
  }

  if (!project) {
    const namesToTry = [
      "theodora-stavropoulos-remax",
      projectNameFromUrl,
      "theodora-stavropoulos-remax-michael-mendezs-projects-150892f9",
    ].filter(Boolean) as string[];
    for (const name of [...new Set(namesToTry)]) {
      const res = await api(`/projects/${encodeURIComponent(name)}`);
      if (res.ok) {
        project = (await res.json()) as typeof project;
        break;
      }
    }
  }

  if (!project) {
    const listRes = await api("/projects");
    if (listRes.ok) {
      const data = (await listRes.json()) as { projects?: { id: string; name: string }[] };
      const match = data.projects?.find(
        (p) =>
          p.name?.toLowerCase().includes("theodora") ||
          p.name?.toLowerCase().includes("stavropoulos")
      );
      if (match) {
        const res = await api(`/projects/${match.id}`);
        if (res.ok) project = (await res.json()) as typeof project;
      }
    }
  }

  if (!project) {
    console.error("❌ Could not find Theodora's Vercel project");
    console.log("   Ensure VERCEL_TOKEN is set and has access to the project.");
    console.log("   Or run: npx tsx scripts/list-vercel-projects.ts to see project names.");
    process.exit(1);
  }

  const link = project.link;
  const rootDir = project.rootDirectory;

  console.log("--- Vercel project details ---");
  console.log("Project ID:", project.id);
  console.log("Project name:", project.name);
  console.log("Framework:", project.framework || "(auto)");
  console.log();
  console.log("--- Git / deployment source ---");
  if (!link) {
    console.log("⚠️  No Git link — project may deploy via CLI or deploy hooks (no repo)");
    console.log("   For /market-appraisal to work, deploy from nexrel-service-template.");
  } else {
    const repo = link.repo || "(unknown)";
    const type = link.type || "unknown";
    console.log("Type:", type);
    console.log("Repo:", repo);
    console.log("Root directory:", rootDir || "(repo root)");
    console.log();

    const isNexrelTemplate =
      repo?.toLowerCase().includes("nexrel-service-template") ||
      (rootDir && rootDir.toLowerCase().includes("nexrel-service-template"));
    const isTheodoraRepo = repo?.toLowerCase().includes("theodora-stavropoulos");

    if (isNexrelTemplate) {
      console.log("✅ Deploys from nexrel-service-template (includes /market-appraisal)");
    } else if (isTheodoraRepo) {
      console.log("⚠️  Deploys from Theodora-Stavropoulos-Remax (or similar fork)");
      console.log("   Ensure this repo has the latest from nexrel-service-template,");
      console.log("   including the /market-appraisal route and /api/property-evaluation proxy.");
      console.log("   Merge or sync from nexrel-service-template if /market-appraisal 404s.");
    } else {
      console.log("⚠️  Unknown repo:", repo);
      console.log("   For /market-appraisal: deploy from nexrel-service-template or a repo");
      console.log("   that has the MarketAppraisal page and property-evaluation API proxy.");
    }
  }

  console.log();
  console.log("--- Quick check: /market-appraisal ---");
  const base = vercelUrl?.replace(/\/$/, "") || `https://${project.name}.vercel.app`;
  const appraisalUrl = `${base}/market-appraisal`;
  console.log("URL:", appraisalUrl);
  try {
    const pageRes = await fetch(appraisalUrl, { redirect: "follow" });
    if (pageRes.ok) {
      const text = (await pageRes.text()).slice(0, 500);
      const hasMarketAppraisal =
        text.includes("market") ||
        text.includes("appraisal") ||
        text.includes("Property Evaluation") ||
        text.includes("Free Property Appraisal");
      console.log(
        hasMarketAppraisal ? "✅ Page loads (200)" : "⚠️  Page loads (200) but content may differ"
      );
    } else {
      console.log("❌ Page returns", pageRes.status, "- /market-appraisal may be missing");
    }
  } catch (e) {
    console.log("⚠️  Could not fetch page:", (e as Error).message);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
