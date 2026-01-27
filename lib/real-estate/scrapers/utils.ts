/**
 * Scraper Utilities
 */

export function getApifyToken(): string {
  return process.env.APIFY_API_TOKEN || '';
}

export function getHunterApiKey(): string {
  return process.env.HUNTER_API_KEY || '';
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

export function normalizeAddress(address: string): string {
  if (!address) return '';
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}
