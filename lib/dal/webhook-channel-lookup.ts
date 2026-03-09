import type { ChannelType, Prisma } from "@prisma/client";
import { getIndustryDb, type IndustryDbKey } from "@/lib/db/industry-db";

const INDUSTRY_KEYS: IndustryDbKey[] = [
  "ACCOUNTING",
  "RESTAURANT",
  "SPORTS_CLUB",
  "CONSTRUCTION",
  "LAW",
  "MEDICAL",
  "DENTIST",
  "MEDICAL_SPA",
  "OPTOMETRIST",
  "HEALTH_CLINIC",
  "REAL_ESTATE",
  "HOSPITAL",
  "TECHNOLOGY",
  "ORTHODONTIST",
  "RETAIL",
];

const INDUSTRY_ENV_MAP: Record<IndustryDbKey, string> = {
  ACCOUNTING: "DATABASE_URL_ACCOUNTING",
  RESTAURANT: "DATABASE_URL_RESTAURANT",
  SPORTS_CLUB: "DATABASE_URL_SPORTS_CLUB",
  CONSTRUCTION: "DATABASE_URL_CONSTRUCTION",
  LAW: "DATABASE_URL_LAW",
  MEDICAL: "DATABASE_URL_MEDICAL",
  DENTIST: "DATABASE_URL_DENTIST",
  MEDICAL_SPA: "DATABASE_URL_MEDICAL_SPA",
  OPTOMETRIST: "DATABASE_URL_OPTOMETRIST",
  HEALTH_CLINIC: "DATABASE_URL_HEALTH_CLINIC",
  REAL_ESTATE: "DATABASE_URL_REAL_ESTATE",
  HOSPITAL: "DATABASE_URL_HOSPITAL",
  TECHNOLOGY: "DATABASE_URL_TECHNOLOGY",
  ORTHODONTIST: "DATABASE_URL_ORTHODONTIST",
  RETAIL: "DATABASE_URL_RETAIL",
};

type DbCandidate = { key: IndustryDbKey | null; url: string };

function normalized(url?: string): string {
  return (url || "").replace(/\n/g, "").trim();
}

function getDbCandidates(): DbCandidate[] {
  const candidates: DbCandidate[] = [];
  const seen = new Set<string>();

  const defaultUrl = normalized(process.env.DATABASE_URL);
  if (defaultUrl) {
    candidates.push({ key: null, url: defaultUrl });
    seen.add(defaultUrl);
  }

  for (const key of INDUSTRY_KEYS) {
    const envKey = INDUSTRY_ENV_MAP[key];
    const url = normalized(process.env[envKey]);
    if (!url || seen.has(url)) continue;
    candidates.push({ key, url });
    seen.add(url);
  }

  return candidates;
}

async function findChannelConnection(
  where: Prisma.ChannelConnectionWhereInput,
) {
  const candidates = getDbCandidates();
  for (const candidate of candidates) {
    const db = getIndustryDb(candidate.key);
    const connection = await db.channelConnection.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });
    if (connection) return connection;
  }
  return null;
}

export async function findConnectedChannelByProviderAccount(params: {
  channelType: ChannelType;
  providerAccountId: string;
  providerType?: string;
}) {
  return findChannelConnection({
    channelType: params.channelType,
    providerAccountId: params.providerAccountId,
    providerType: params.providerType,
    status: "CONNECTED",
  });
}

export async function findConnectedChannelByIdentifier(params: {
  channelType: ChannelType;
  channelIdentifier: string;
}) {
  return findChannelConnection({
    channelType: params.channelType,
    channelIdentifier: params.channelIdentifier,
    status: "CONNECTED",
  });
}
