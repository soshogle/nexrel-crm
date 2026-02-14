/**
 * Twilio Credentials Service
 * Resolves credentials from TwilioAccount table (env-based or DB-stored)
 * Supports primary + backup accounts with failover
 */

import crypto from 'crypto';
import { prisma } from './db';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

function decryptStoredToken(encrypted: string): string {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 2) return encrypted; // Not encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32)),
      iv
    );
    return decipher.update(parts[1], 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return encrypted;
  }
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  twilioAccountId?: string;
}

/**
 * Get credentials for a TwilioAccount by ID
 */
export async function getCredentialsForAccount(
  twilioAccountId: string
): Promise<TwilioCredentials | null> {
  const account = await prisma.twilioAccount.findUnique({
    where: { id: twilioAccountId, isActive: true },
  });

  if (!account) return null;
  return resolveCredentials(account);
}

/**
 * Get credentials for a TwilioAccount by envKey (e.g. 'PRIMARY', 'BACKUP')
 */
export async function getCredentialsByEnvKey(
  envKey: string
): Promise<TwilioCredentials | null> {
  const account = await prisma.twilioAccount.findFirst({
    where: { envKey, isActive: true },
  });

  if (!account) return null;
  return resolveCredentials(account);
}

/**
 * Get primary account credentials (for backwards compat and default operations)
 */
export async function getPrimaryCredentials(): Promise<TwilioCredentials | null> {
  // 1. Try TwilioAccount with envKey=PRIMARY
  const primary = await getCredentialsByEnvKey('PRIMARY');
  if (primary) return primary;

  // 2. Try TwilioAccount with isPrimary=true
  const account = await prisma.twilioAccount.findFirst({
    where: { isPrimary: true, isActive: true },
  });
  if (account) return resolveCredentials(account);

  // 3. Fallback to legacy env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    return { accountSid: sid, authToken: token };
  }

  return null;
}

/**
 * Get backup account credentials (for fallback when primary has no numbers or is down)
 */
export async function getBackupCredentials(): Promise<TwilioCredentials | null> {
  return getCredentialsByEnvKey('BACKUP');
}

/**
 * Get all active Twilio accounts ordered by primary first
 */
export async function getAllActiveAccounts(): Promise<
  Array<{ id: string; name: string; accountSid: string; isPrimary: boolean }>
> {
  const accounts = await prisma.twilioAccount.findMany({
    where: { isActive: true },
    orderBy: { isPrimary: 'desc' },
    select: { id: true, name: true, accountSid: true, isPrimary: true },
  });
  return accounts;
}

function resolveCredentials(account: {
  id: string;
  accountSid: string;
  authToken: string | null;
  envKey: string | null;
}): TwilioCredentials | null {
  if (account.envKey) {
    const sid = process.env[`TWILIO_${account.envKey}_ACCOUNT_SID`];
    const token = process.env[`TWILIO_${account.envKey}_AUTH_TOKEN`];
    if (sid && token) {
      return {
        accountSid: sid,
        authToken: token,
        twilioAccountId: account.id,
      };
    }
    console.warn(
      `TwilioAccount ${account.id} has envKey=${account.envKey} but TWILIO_${account.envKey}_ACCOUNT_SID/AUTH_TOKEN not set`
    );
    return null;
  }

  if (account.authToken) {
    const token =
      account.authToken.includes(':') && account.authToken.length > 50
        ? decryptStoredToken(account.authToken)
        : account.authToken;
    return {
      accountSid: account.accountSid,
      authToken: token,
      twilioAccountId: account.id,
    };
  }

  return null;
}
