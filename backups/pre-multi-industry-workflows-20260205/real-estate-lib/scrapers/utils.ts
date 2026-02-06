/**
 * Utility functions for real estate scrapers
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Get Apify API token from secrets file or environment
 */
export function getApifyToken(): string {
  // First check environment variable
  if (process.env.APIFY_API_TOKEN) {
    return process.env.APIFY_API_TOKEN;
  }

  // Try to read from secrets file
  try {
    const secretsPath = '/home/ubuntu/.config/abacusai_auth_secrets.json';
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
      return secrets?.apify?.secrets?.api_token?.value || '';
    }
  } catch (error) {
    console.error('[Apify] Error reading secrets file:', error);
  }

  return '';
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^0-9+]/g, '');
  
  // If no country code, assume US/Canada (+1)
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Normalize address for comparison/deduplication
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|place|pl)\b/g, (match) => {
      const abbrevs: Record<string, string> = {
        'street': 'st', 'avenue': 'ave', 'road': 'rd', 'drive': 'dr',
        'lane': 'ln', 'boulevard': 'blvd', 'court': 'ct', 'place': 'pl'
      };
      return abbrevs[match] || match;
    })
    .trim();
}

/**
 * Parse price from string
 */
export function parsePrice(priceStr: string | number | undefined): number | undefined {
  if (!priceStr) return undefined;
  if (typeof priceStr === 'number') return priceStr;
  
  // Handle various formats: $500,000 | 500000 | $500K | $1.2M
  let cleaned = priceStr.replace(/[$,\s]/g, '');
  
  // Handle K (thousands) and M (millions)
  if (cleaned.toLowerCase().endsWith('k')) {
    cleaned = cleaned.slice(0, -1);
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num * 1000;
  }
  if (cleaned.toLowerCase().endsWith('m')) {
    cleaned = cleaned.slice(0, -1);
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num * 1000000;
  }
  
  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

/**
 * Calculate days on market from listing date
 */
export function calculateDaysOnMarket(listingDate: Date | string): number {
  const listed = typeof listingDate === 'string' ? new Date(listingDate) : listingDate;
  const now = new Date();
  const diffMs = now.getTime() - listed.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * State/Province abbreviation mappings
 */
export const STATE_ABBREVS: Record<string, string> = {
  // US States
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY',
  // Canadian Provinces
  'ontario': 'ON', 'quebec': 'QC', 'british columbia': 'BC', 'alberta': 'AB',
  'manitoba': 'MB', 'saskatchewan': 'SK', 'nova scotia': 'NS', 'new brunswick': 'NB',
  'newfoundland': 'NL', 'prince edward island': 'PE'
};

/**
 * Get state/province abbreviation
 */
export function getStateAbbrev(state: string): string {
  if (!state) return '';
  const lower = state.toLowerCase().trim();
  return STATE_ABBREVS[lower] || state.toUpperCase();
}
