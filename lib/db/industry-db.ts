/**
 * Industry DB Client Factory - Phase 2
 * Returns Prisma client for the given industry's database.
 * Phase 2: All industry URLs default to DATABASE_URL (single DB).
 * Phase 4: Set DATABASE_URL_REAL_ESTATE, etc. to route to separate DBs.
 */

import { PrismaClient } from '@prisma/client';

export type IndustryDbKey =
  | 'ACCOUNTING'
  | 'RESTAURANT'
  | 'SPORTS_CLUB'
  | 'CONSTRUCTION'
  | 'LAW'
  | 'MEDICAL'
  | 'DENTIST'
  | 'MEDICAL_SPA'
  | 'OPTOMETRIST'
  | 'HEALTH_CLINIC'
  | 'REAL_ESTATE'
  | 'HOSPITAL'
  | 'TECHNOLOGY'
  | 'ORTHODONTIST';

const INDUSTRY_ENV_MAP: Record<IndustryDbKey, string> = {
  ACCOUNTING: 'DATABASE_URL_ACCOUNTING',
  RESTAURANT: 'DATABASE_URL_RESTAURANT',
  SPORTS_CLUB: 'DATABASE_URL_SPORTS_CLUB',
  CONSTRUCTION: 'DATABASE_URL_CONSTRUCTION',
  LAW: 'DATABASE_URL_LAW',
  MEDICAL: 'DATABASE_URL_MEDICAL',
  DENTIST: 'DATABASE_URL_DENTIST',
  MEDICAL_SPA: 'DATABASE_URL_MEDICAL_SPA',
  OPTOMETRIST: 'DATABASE_URL_OPTOMETRIST',
  HEALTH_CLINIC: 'DATABASE_URL_HEALTH_CLINIC',
  REAL_ESTATE: 'DATABASE_URL_REAL_ESTATE',
  HOSPITAL: 'DATABASE_URL_HOSPITAL',
  TECHNOLOGY: 'DATABASE_URL_TECHNOLOGY',
  ORTHODONTIST: 'DATABASE_URL_ORTHODONTIST',
};

const industryClients = new Map<string, PrismaClient>();

function getIndustryDbUrl(industry: IndustryDbKey | string): string {
  const key = industry as IndustryDbKey;
  const envVar = INDUSTRY_ENV_MAP[key];
  if (envVar && process.env[envVar]) {
    return process.env[envVar]!;
  }
  return process.env.DATABASE_URL!;
}

/**
 * Get Prisma client for the given industry.
 * Phase 2: Falls back to main DATABASE_URL when industry-specific URL not set.
 */
export function getIndustryDb(industry: IndustryDbKey | string | null): PrismaClient {
  const key = industry || 'default';
  let client = industryClients.get(key);
  if (!client) {
    const url = industry ? getIndustryDbUrl(industry) : process.env.DATABASE_URL!;
    client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: {
        db: { url },
      },
    });
    industryClients.set(key, client);
  }
  return client;
}
