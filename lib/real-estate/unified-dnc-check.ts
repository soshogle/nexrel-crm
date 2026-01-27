/**
 * Unified DNC Check - Checks both Canadian DNCL and US FTC DNC
 * Automatically detects country based on phone number
 */

import { checkCanadianDNCL, isCanadianPhone, type DNCLCheckResult } from './canadian-dncl';
import { checkUSFTCDNC, isUSPhone, type FTCDNCResult } from './us-ftc-dnc';
import { prisma } from '@/lib/db';

export interface UnifiedDNCResult {
  phone: string;
  normalizedPhone: string;
  country: 'CA' | 'US' | 'UNKNOWN';
  isOnDNC: boolean;
  source: string;
  checkedAt: Date;
  canCall: boolean;
  reason?: string;
}

/**
 * Check a phone number against all applicable DNC lists
 */
export async function checkDNC(
  phone: string,
  userId: string
): Promise<UnifiedDNCResult> {
  // Detect country
  if (isCanadianPhone(phone)) {
    const result = await checkCanadianDNCL(phone, userId);
    return {
      phone,
      normalizedPhone: result.phone,
      country: 'CA',
      isOnDNC: result.isOnDNCL,
      source: result.source,
      checkedAt: result.checkedAt,
      canCall: !result.isOnDNCL,
      reason: result.isOnDNCL ? 'Number on Canadian DNCL' : undefined
    };
  }

  if (isUSPhone(phone)) {
    const result = await checkUSFTCDNC(phone, userId);
    return {
      phone,
      normalizedPhone: result.phone,
      country: 'US',
      isOnDNC: result.isOnDNC,
      source: result.source,
      checkedAt: result.checkedAt,
      canCall: !result.isOnDNC,
      reason: result.isOnDNC ? 'Number on US FTC DNC Registry' : undefined
    };
  }

  // Check local list for unknown countries
  const localEntry = await prisma.rEDNCEntry.findFirst({
    where: { phoneNumber: phone }
  });

  return {
    phone,
    normalizedPhone: phone,
    country: 'UNKNOWN',
    isOnDNC: !!localEntry,
    source: localEntry ? 'local_list' : 'not_checked',
    checkedAt: new Date(),
    canCall: !localEntry,
    reason: localEntry ? 'Number on local DNC list' : 'Country not recognized - proceed with caution'
  };
}

/**
 * Bulk check multiple numbers
 */
export async function bulkCheckDNC(
  phones: string[],
  userId: string
): Promise<Map<string, UnifiedDNCResult>> {
  const results = new Map<string, UnifiedDNCResult>();

  // Parallel checks
  const checkPromises = phones.map(async (phone) => {
    const result = await checkDNC(phone, userId);
    results.set(phone, result);
  });

  await Promise.all(checkPromises);
  return results;
}

/**
 * Filter a list of leads, removing those on DNC
 */
export async function filterDNCLeads(
  leads: Array<{ id: string; phone: string; [key: string]: any }>,
  userId: string
): Promise<{
  callable: typeof leads;
  blocked: Array<typeof leads[0] & { dncReason: string }>;
}> {
  const callable: typeof leads = [];
  const blocked: Array<typeof leads[0] & { dncReason: string }> = [];

  for (const lead of leads) {
    if (!lead.phone) {
      blocked.push({ ...lead, dncReason: 'No phone number' });
      continue;
    }

    const dncResult = await checkDNC(lead.phone, userId);
    
    if (dncResult.canCall) {
      callable.push(lead);
    } else {
      blocked.push({ ...lead, dncReason: dncResult.reason || 'On DNC list' });
    }
  }

  return { callable, blocked };
}

/**
 * Add number to user's local DNC list
 */
export async function addToDNC(
  phone: string,
  userId: string,
  options?: {
    reason?: string;
    expiresAt?: Date;
  }
): Promise<{ success: boolean; entry?: any }> {
  try {
    const entry = await prisma.rEDNCEntry.create({
      data: {
        phoneNumber: phone,
        source: 'MANUAL_UPLOAD',
        country: isCanadianPhone(phone) ? 'CA' : 'US',
        reason: options?.reason,
        expiresAt: options?.expiresAt
      }
    });
    return { success: true, entry };
  } catch (error) {
    return { success: false };
  }
}

/**
 * Remove number from user's local DNC list
 */
export async function removeFromDNC(
  phone: string,
  userId: string
): Promise<{ success: boolean }> {
  try {
    await prisma.rEDNCEntry.deleteMany({
      where: {
        phoneNumber: phone,
        source: 'MANUAL_UPLOAD'
      }
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
