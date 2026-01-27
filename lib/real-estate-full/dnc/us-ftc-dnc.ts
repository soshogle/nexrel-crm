/**
 * US FTC Do Not Call Registry Verification
 * https://www.donotcall.gov/
 */

import { prisma } from '@/lib/db';

export interface FTCDNCResult {
  phone: string;
  isOnDNC: boolean;
  source: 'us_ftc_dnc' | 'local_list' | 'not_found';
  checkedAt: Date;
  registeredAt?: Date;
}

/**
 * Check if a US phone number is on the FTC Do Not Call Registry
 * Note: FTC API access requires registration as a telemarketer
 */
export async function checkUSFTCDNC(
  phone: string,
  userId: string
): Promise<FTCDNCResult> {
  const normalizedPhone = normalizeUSPhone(phone);
  
  // Check local DNC list first
  const localEntry = await prisma.rEDNCEntry.findFirst({
    where: {
      phoneNumber: normalizedPhone,
      OR: [
        { source: 'US_FTC' },
        { source: 'MANUAL_UPLOAD' },
        { source: 'USER_OPTOUT' }
      ]
    }
  });

  if (localEntry) {
    return {
      phone: normalizedPhone,
      isOnDNC: true,
      source: localEntry.source === 'US_FTC' ? 'us_ftc_dnc' : 'local_list',
      checkedAt: new Date(),
      registeredAt: localEntry.addedAt
    };
  }

  // If FTC API is configured, check there
  const externalResult = await checkExternalFTCDNC(normalizedPhone);
  
  if (externalResult?.isOnDNC) {
    // Cache locally
    await prisma.rEDNCEntry.create({
      data: {
        phoneNumber: normalizedPhone,
        source: 'US_FTC',
        country: 'US',
        reason: 'Auto-cached from FTC DNC check'
      }
    });

    return externalResult;
  }

  return {
    phone: normalizedPhone,
    isOnDNC: false,
    source: 'not_found',
    checkedAt: new Date()
  };
}

/**
 * Bulk check US numbers against FTC DNC
 */
export async function bulkCheckUSFTCDNC(
  phones: string[],
  userId: string
): Promise<Map<string, FTCDNCResult>> {
  const results = new Map<string, FTCDNCResult>();
  const normalizedPhones = phones.map(normalizeUSPhone);
  
  const localEntries = await prisma.rEDNCEntry.findMany({
    where: {
      phoneNumber: { in: normalizedPhones },
      OR: [
        { source: 'US_FTC' },
        { source: 'MANUAL_UPLOAD' },
        { source: 'USER_OPTOUT' }
      ]
    }
  });

  const foundPhones = new Set(localEntries.map(e => e.phoneNumber));

  for (const entry of localEntries) {
    results.set(entry.phoneNumber, {
      phone: entry.phoneNumber,
      isOnDNC: true,
      source: entry.source === 'US_FTC' ? 'us_ftc_dnc' : 'local_list',
      checkedAt: new Date(),
      registeredAt: entry.addedAt
    });
  }

  for (const phone of normalizedPhones) {
    if (!foundPhones.has(phone)) {
      results.set(phone, {
        phone,
        isOnDNC: false,
        source: 'not_found',
        checkedAt: new Date()
      });
    }
  }

  return results;
}

/**
 * External FTC DNC API check (placeholder)
 * Real implementation requires FTC telemarketer registration
 */
async function checkExternalFTCDNC(phone: string): Promise<FTCDNCResult | null> {
  // FTC DNC API requires:
  // 1. Registration as telemarketer at https://telemarketing.donotcall.gov/
  // 2. Annual subscription fee
  // 3. Area code downloads
  //
  // API endpoint: https://www.donotcall.gov/DNC/DNCWebservice.asmx
  
  return null;
}

/**
 * Normalize US phone number
 */
export function normalizeUSPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return phone;
}

/**
 * Check if phone is a US number (not Canadian)
 */
export function isUSPhone(phone: string): boolean {
  const normalized = normalizeUSPhone(phone);
  if (!normalized.startsWith('+1')) return false;
  
  // Major US area codes (excluding Canadian)
  const usAreaCodes = [
    '201', '202', '203', '205', '206', '207', '208', '209', '210',
    '212', '213', '214', '215', '216', '217', '218', '219', '224',
    '225', '228', '229', '231', '234', '239', '240', '248', '251',
    '252', '253', '254', '256', '260', '262', '267', '269', '270',
    '272', '276', '281', '301', '302', '303', '304', '305', '307',
    '308', '309', '310', '312', '313', '314', '315', '316', '317',
    '318', '319', '320', '321', '323', '325', '330', '331', '334',
    '336', '337', '339', '346', '347', '351', '352', '360', '361',
    '385', '386', '401', '402', '404', '405', '406', '407', '408',
    '409', '410', '412', '413', '414', '415', '417', '419', '423',
    '424', '425', '430', '432', '434', '435', '440', '442', '443',
    '469', '470', '475', '478', '479', '480', '484', '501', '502',
    '503', '504', '505', '507', '508', '509', '510', '512', '513',
    '515', '516', '517', '518', '520', '530', '531', '534', '539',
    '540', '541', '551', '559', '561', '562', '563', '567', '570',
    '571', '573', '574', '575', '580', '585', '586', '601', '602',
    '603', '605', '606', '607', '608', '609', '610', '612', '614',
    '615', '616', '617', '618', '619', '620', '623', '626', '628',
    '629', '630', '631', '636', '641', '646', '650', '651', '657',
    '660', '661', '662', '667', '669', '678', '681', '682', '689',
    '701', '702', '703', '704', '706', '707', '708', '712', '713',
    '714', '715', '716', '717', '718', '719', '720', '724', '725',
    '727', '731', '732', '734', '737', '740', '747', '754', '757',
    '760', '762', '763', '765', '769', '770', '772', '773', '774',
    '775', '779', '781', '785', '786', '801', '802', '803', '804',
    '805', '806', '808', '810', '812', '813', '814', '815', '816',
    '817', '818', '828', '830', '831', '832', '843', '845', '847',
    '848', '850', '854', '856', '857', '858', '859', '860', '862',
    '863', '864', '865', '870', '878', '901', '903', '904', '906',
    '907', '908', '909', '910', '912', '913', '914', '915', '916',
    '917', '918', '919', '920', '925', '928', '929', '931', '936',
    '937', '938', '940', '941', '947', '949', '951', '952', '954',
    '956', '959', '970', '971', '972', '973', '978', '979', '980',
    '984', '985', '989'
  ];
  
  const areaCode = normalized.substring(2, 5);
  return usAreaCodes.includes(areaCode);
}
