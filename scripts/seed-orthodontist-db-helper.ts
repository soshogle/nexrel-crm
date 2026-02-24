/**
 * Shared DB helper for orthodontist demo seed scripts.
 * When DATABASE_URL_ORTHODONTIST is set, seeds write to the orthodontist DB
 * (same DB the app reads from when user has industry ORTHODONTIST).
 * User lookup uses Meta DB (auth) or default DB.
 */
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

const USER_EMAIL = 'orthodontist@nexrel.com';

function getPrismaForUrl(url: string): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: { db: { url } },
  });
}

/** Default prisma (DATABASE_URL) - used when no industry DB */
const defaultPrisma = new PrismaClient();

/** Orthodontist DB - use for ALL CRM data when configured */
export function getOrthoPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL_ORTHODONTIST;
  if (url) {
    return getPrismaForUrl(url);
  }
  return defaultPrisma;
}

/** Meta DB - for user lookup (auth) */
function getMetaPrisma(): PrismaClient | null {
  const url = process.env.DATABASE_URL_META;
  if (url) return getPrismaForUrl(url);
  return null;
}

/** Find orthodontist user - tries Meta (auth) first, then default DB */
export async function findOrthodontistUser(): Promise<{ id: string; name: string | null }> {
  const meta = getMetaPrisma();
  if (meta) {
    try {
      const user = await meta.user.findUnique({
        where: { email: USER_EMAIL },
        select: { id: true, name: true },
      });
      if (user) {
        await meta.$disconnect();
        return user;
      }
    } catch (e) {
      await meta.$disconnect().catch(() => {});
    }
  }
  const user = await defaultPrisma.user.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true, name: true },
  });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);
  return user;
}

/** Ensure user exists in orthodontist DB (for FKs). Creates from meta/default if missing. No-op when ortho DB not configured. */
export async function ensureUserInOrthoDb(user: { id: string; name: string | null }): Promise<void> {
  if (!process.env.DATABASE_URL_ORTHODONTIST) return;
  const ortho = getOrthoPrisma();
  // Check existence via raw query (ortho DB may have older schema without deletedAt)
  try {
    const rows = await ortho.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id = ${user.id} LIMIT 1`;
    if (rows.length > 0) return;
  } catch {
    // Schema mismatch - try create; will fail if user exists
  }
  // User not in ortho DB - copy from meta or default
  const meta = getMetaPrisma();
  let source: { id: string; email: string | null; name: string | null } | null = null;
  if (meta) {
    try {
      source = await meta.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, name: true },
      });
      if (source) await meta.$disconnect();
    } catch {
      await meta.$disconnect().catch(() => {});
    }
  }
  if (!source) {
    source = await defaultPrisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true },
    });
  }
  if (!source) {
    throw new Error(`User ${user.id} not found in meta or default DB - cannot create in orthodontist DB`);
  }
  try {
    await ortho.$executeRaw`
      INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
      VALUES (${source.id}, ${source.email ?? USER_EMAIL}, ${source.name}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  } catch (e: unknown) {
    // P2010 raw query error or unique violation - user may already exist
    const err = e as { code?: string };
    if (err?.code === '23505') return; // unique_violation
    throw e;
  }
}

/** Prisma to use for orthodontist CRM data - routes to orthodontist DB when configured */
export const prisma = getOrthoPrisma();
