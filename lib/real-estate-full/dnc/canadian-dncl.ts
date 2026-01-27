/**
 * Canadian Do Not Call List (DNCL) Verification
 * CRTC National DNCL compliance check
 * https://www.lnnte-dncl.gc.ca/
 */

import { prisma } from '@/lib/db';

export interface DNCLCheckResult {
  phone: string;
  isOnDNCL: boolean;
  source: 'canadian_dncl' | 'local_list' | 'not_found';
  checkedAt: Date;
  registeredAt?: Date;
  expiresAt?: Date;
}

/**
 * Check if a phone number is on the Canadian DNCL
 * Note: Full CRTC API integration requires registration and subscription
 * This implementation checks local cache first, then external if configured
 */
export async function checkCanadianDNCL(
  phone: string,
  userId: string
): Promise<DNCLCheckResult> {
  const normalizedPhone = normalizeCanadianPhone(phone);
  
  // Check local DNC list first
  const localEntry = await prisma.rEDNCEntry.findFirst({
    where: {
      phoneNumber: normalizedPhone,
      OR: [
        { source: 'CANADIAN_DNCL' }, // National list cache
        { source: 'MANUAL_UPLOAD' },
        { source: 'USER_OPTOUT' }
      ]
    }
  });

  if (localEntry) {
    return {
      phone: normalizedPhone,
      isOnDNCL: true,
      source: localEntry.source === 'CANADIAN_DNCL' ? 'canadian_dncl' : 'local_list',
      checkedAt: new Date(),
      registeredAt: localEntry.addedAt,
      expiresAt: localEntry.expiresAt || undefined
    };
  }

  // If CRTC API is configured, check there
  // Note: Real implementation would require CRTC subscription
  const externalResult = await checkExternalDNCL(normalizedPhone);
  
  if (externalResult?.isOnDNCL) {
    // Cache the result locally
    await prisma.rEDNCEntry.create({
      data: {
        phoneNumber: normalizedPhone,
        source: 'CANADIAN_DNCL',
        country: 'CA',
        reason: 'Auto-cached from DNCL check',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 day cache
      }
    });

    return externalResult;
  }

  return {
    phone: normalizedPhone,
    isOnDNCL: false,
    source: 'not_found',
    checkedAt: new Date()
  };
}

/**
 * Bulk check multiple numbers against Canadian DNCL
 */
export async function bulkCheckCanadianDNCL(
  phones: string[],
  userId: string
): Promise<Map<string, DNCLCheckResult>> {
  const results = new Map<string, DNCLCheckResult>();
  
  const normalizedPhones = phones.map(normalizeCanadianPhone);
  
  // Check local database in bulk
  const localEntries = await prisma.rEDNCEntry.findMany({
    where: {
      phoneNumber: { in: normalizedPhones },
      OR: [
        { source: 'CANADIAN_DNCL' },
        { source: 'MANUAL_UPLOAD' },
        { source: 'USER_OPTOUT' }
      ]
    }
  });

  const foundPhones = new Set(localEntries.map(e => e.phoneNumber));

  for (const entry of localEntries) {
    results.set(entry.phoneNumber, {
      phone: entry.phoneNumber,
      isOnDNCL: true,
      source: entry.source === 'CANADIAN_DNCL' ? 'canadian_dncl' : 'local_list',
      checkedAt: new Date(),
      registeredAt: entry.addedAt
    });
  }

  // Mark remaining as not found
  for (const phone of normalizedPhones) {
    if (!foundPhones.has(phone)) {
      results.set(phone, {
        phone,
        isOnDNCL: false,
        source: 'not_found',
        checkedAt: new Date()
      });
    }
  }

  return results;
}

/**
 * Check external DNCL API (placeholder for CRTC integration)
 */
async function checkExternalDNCL(phone: string): Promise<DNCLCheckResult | null> {
  // Real implementation would call CRTC's DNCL API
  // Requires subscription to https://www.lnnte-dncl.gc.ca/
  // 
  // Example API call structure:
  // const response = await fetch('https://api.dncl.gc.ca/v1/check', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${DNCL_API_KEY}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({ phone })
  // });
  
  return null; // External check not configured
}

/**
 * Normalize Canadian phone number to E.164 format
 */
export function normalizeCanadianPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Canadian numbers: 10 digits (NPA-NXX-XXXX)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Return as-is if format unclear
  return phone;
}

/**
 * Check if phone is a Canadian number
 */
export function isCanadianPhone(phone: string): boolean {
  const normalized = normalizeCanadianPhone(phone);
  if (!normalized.startsWith('+1')) return false;
  
  // Canadian area codes (partial list of major ones)
  const canadianAreaCodes = [
    '204', '226', '236', '249', '250', '289', '306', '343', '365',
    '403', '416', '418', '431', '437', '438', '450', '506', '514',
    '519', '548', '579', '581', '587', '604', '613', '639', '647',
    '705', '709', '778', '780', '782', '807', '819', '825', '867',
    '873', '902', '905'
  ];
  
  const areaCode = normalized.substring(2, 5);
  return canadianAreaCodes.includes(areaCode);
}
