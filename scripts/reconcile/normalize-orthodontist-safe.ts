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

  const orthoUrl = normalizeUrl(process.env.DATABASE_URL_ORTHODONTIST);
  if (!orthoUrl) throw new Error("Missing DATABASE_URL_ORTHODONTIST");

  const db = new PrismaClient({ datasources: { db: { url: orthoUrl } } });

  try {
    const userRows = (await db.$queryRawUnsafe(
      `SELECT id, email FROM "User" WHERE lower(email)=lower($1) LIMIT 1`,
      EMAIL,
    )) as Array<{ id: string; email: string }>;
    const user = userRows[0];
    if (!user)
      throw new Error("Orthodontist user not found in ORTHODONTIST DB");

    const userId = user.id;

    const pipelines = (await db.$queryRawUnsafe(
      `SELECT p.id, p.name, p."isDefault", p."createdAt",
              (SELECT COUNT(*)::int FROM "Deal" d WHERE d."pipelineId"=p.id) AS deal_count
       FROM "Pipeline" p
       WHERE p."userId"=$1
       ORDER BY p."createdAt" DESC`,
      userId,
    )) as Array<{
      id: string;
      name: string;
      isDefault: boolean;
      createdAt: string;
      deal_count: number;
    }>;

    const pipelineGroups = new Map<string, typeof pipelines>();
    for (const p of pipelines) {
      const key = (p.name || "").toLowerCase().trim();
      if (!pipelineGroups.has(key)) pipelineGroups.set(key, [] as any);
      pipelineGroups.get(key)!.push(p);
    }

    const pipelineActions: Array<Record<string, unknown>> = [];

    for (const [key, group] of pipelineGroups.entries()) {
      if (group.length < 2) continue;

      group.sort((a, b) => {
        if (b.deal_count !== a.deal_count) return b.deal_count - a.deal_count;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      const keep = group[0];
      const archive = group.slice(1);

      await db.$executeRawUnsafe(
        `UPDATE "Pipeline" SET "isDefault"=false WHERE id<>$1 AND "userId"=$2 AND lower(name)=lower($3)`,
        keep.id,
        userId,
        keep.name,
      );
      await db.$executeRawUnsafe(
        `UPDATE "Pipeline" SET "isDefault"=true WHERE id=$1`,
        keep.id,
      );

      pipelineActions.push({
        key,
        keptPipelineId: keep.id,
        archivedDefaultOnIds: archive.map((x) => x.id),
      });
    }

    const agents = (await db.$queryRawUnsafe(
      `SELECT a.id, a.name, a.status, a."twilioPhoneNumber", a."elevenLabsAgentId", a."createdAt",
              (SELECT COUNT(*)::int FROM "CallLog" c WHERE c."voiceAgentId"=a.id) AS call_count
       FROM "VoiceAgent" a
       WHERE a."userId"=$1
       ORDER BY a."createdAt" DESC`,
      userId,
    )) as Array<{
      id: string;
      name: string;
      status: string;
      twilioPhoneNumber: string | null;
      elevenLabsAgentId: string | null;
      createdAt: string;
      call_count: number;
    }>;

    const agentGroups = new Map<string, typeof agents>();
    for (const a of agents) {
      const key =
        (a.elevenLabsAgentId || "").trim() ||
        (a.twilioPhoneNumber || "").trim() ||
        (a.name || "").toLowerCase().trim();
      if (!key) continue;
      if (!agentGroups.has(key)) agentGroups.set(key, [] as any);
      agentGroups.get(key)!.push(a);
    }

    const agentActions: Array<Record<string, unknown>> = [];

    for (const [key, group] of agentGroups.entries()) {
      if (group.length < 2) continue;

      group.sort((a, b) => {
        if (b.call_count !== a.call_count) return b.call_count - a.call_count;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      const keep = group[0];
      const deactivate = group.slice(1);

      await db.$executeRawUnsafe(
        `UPDATE "VoiceAgent" SET status='INACTIVE' WHERE id<>$1 AND "userId"=$2 AND coalesce("elevenLabsAgentId", '')=coalesce($3,'') AND coalesce("twilioPhoneNumber", '')=coalesce($4,'') AND lower(name)=lower($5)`,
        keep.id,
        userId,
        keep.elevenLabsAgentId,
        keep.twilioPhoneNumber,
        keep.name,
      );

      await db.$executeRawUnsafe(
        `UPDATE "VoiceAgent" SET status='ACTIVE' WHERE id=$1`,
        keep.id,
      );

      agentActions.push({
        key,
        keptVoiceAgentId: keep.id,
        deactivatedIds: deactivate.map((x) => x.id),
      });
    }

    const report = {
      userId,
      email: EMAIL,
      pipelineActions,
      agentActions,
      completedAt: new Date().toISOString(),
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
