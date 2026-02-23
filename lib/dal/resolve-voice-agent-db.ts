/**
 * Resolve VoiceAgent by Twilio phone number across databases.
 *
 * Used by Twilio/ElevenLabs webhooks where no user session is available.
 * VoiceAgents may live in the default DB or in an industry DB.
 *
 * Returns the VoiceAgent plus the db client that contains it.
 * CallLog must be in the same DB as VoiceAgent (FK constraint).
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getIndustryDb } from '@/lib/db/industry-db';
import type { IndustryDbKey } from '@/lib/db/industry-db';

const INDUSTRY_KEYS: IndustryDbKey[] = [
  'REAL_ESTATE',
  'TECHNOLOGY',
  'ACCOUNTING',
  'RESTAURANT',
  'SPORTS_CLUB',
  'CONSTRUCTION',
  'LAW',
  'MEDICAL',
  'DENTIST',
  'MEDICAL_SPA',
  'OPTOMETRIST',
  'HEALTH_CLINIC',
  'HOSPITAL',
  'ORTHODONTIST',
  'RETAIL',
];

export interface ResolvedVoiceAgent {
  voiceAgent: { id: string; userId: string; [key: string]: unknown };
  /** DB that contains this VoiceAgent - use for CallLog (same DB for FK) */
  db: PrismaClient;
}

/**
 * Find VoiceAgent by twilioPhoneNumber across default + industry DBs.
 * Returns VoiceAgent and the db that contains it (for CallLog operations).
 */
export async function resolveVoiceAgentByPhone(
  twilioPhoneNumber: string
): Promise<ResolvedVoiceAgent | null> {
  // 1. Try default DB
  const defaultAgent = await prisma.voiceAgent.findFirst({
    where: { twilioPhoneNumber },
    include: { user: true },
  });
  if (defaultAgent) {
    return { voiceAgent: defaultAgent, db: prisma };
  }

  // 2. Try each industry DB
  const triedUrls = new Set<string>();
  if (process.env.DATABASE_URL) triedUrls.add(process.env.DATABASE_URL);

  for (const key of INDUSTRY_KEYS) {
    const url = process.env[`DATABASE_URL_${key}`];
    if (!url || triedUrls.has(url)) continue;
    triedUrls.add(url);

    try {
      const db = getIndustryDb(key);
      const agent = await db.voiceAgent.findFirst({
        where: { twilioPhoneNumber },
        include: { user: true },
      });
      if (agent) {
        return { voiceAgent: agent, db };
      }
    } catch {
      /* skip unreachable DBs */
    }
  }

  return null;
}

/**
 * Find CallLog by elevenLabsConversationId across default + industry DBs.
 */
export async function resolveCallLogByConversationId(
  elevenLabsConversationId: string
): Promise<{ callLog: { id: string; userId: string; voiceAgentId: string | null; [key: string]: unknown }; db: PrismaClient } | null> {
  const defaultLog = await prisma.callLog.findFirst({
    where: { elevenLabsConversationId },
  });
  if (defaultLog) return { callLog: defaultLog, db: prisma };

  const triedUrls = new Set<string>();
  if (process.env.DATABASE_URL) triedUrls.add(process.env.DATABASE_URL);

  for (const key of INDUSTRY_KEYS) {
    const url = process.env[`DATABASE_URL_${key}`];
    if (!url || triedUrls.has(url)) continue;
    triedUrls.add(url);
    try {
      const db = getIndustryDb(key);
      const log = await db.callLog.findFirst({
        where: { elevenLabsConversationId },
      });
      if (log) return { callLog: log, db };
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Find CallLog by twilioCallSid across default + industry DBs.
 * Returns CallLog and the db that contains it.
 */
export async function resolveCallLogBySid(
  twilioCallSid: string
): Promise<{ callLog: { id: string; userId: string; voiceAgentId: string | null; [key: string]: unknown }; db: PrismaClient } | null> {
  // 1. Try default DB
  const defaultLog = await prisma.callLog.findFirst({
    where: { twilioCallSid },
  });
  if (defaultLog) {
    return { callLog: defaultLog, db: prisma };
  }

  // 2. Try each industry DB
  const triedUrls = new Set<string>();
  if (process.env.DATABASE_URL) triedUrls.add(process.env.DATABASE_URL);

  for (const key of INDUSTRY_KEYS) {
    const url = process.env[`DATABASE_URL_${key}`];
    if (!url || triedUrls.has(url)) continue;
    triedUrls.add(url);

    try {
      const db = getIndustryDb(key);
      const log = await db.callLog.findFirst({
        where: { twilioCallSid },
      });
      if (log) {
        return { callLog: log, db };
      }
    } catch {
      /* skip unreachable DBs */
    }
  }

  return null;
}
