/**
 * Scraper Utilities
 */

/**
 * Get Apify API token from environment or secrets file
 */
export function getApifyToken(): string | null {
  if (process.env.APIFY_API_TOKEN) return process.env.APIFY_API_TOKEN;
  
  try {
    const fs = require('fs');
    const secrets = JSON.parse(fs.readFileSync('/home/ubuntu/.config/abacusai_auth_secrets.json', 'utf8'));
    return secrets?.apify?.secrets?.api_token?.value || null;
  } catch {
    return null;
  }
}

/**
 * Get Hunter.io API key
 */
export function getHunterApiKey(): string | null {
  if (process.env.HUNTER_API_KEY) return process.env.HUNTER_API_KEY;
  
  try {
    const fs = require('fs');
    const secrets = JSON.parse(fs.readFileSync('/home/ubuntu/.config/abacusai_auth_secrets.json', 'utf8'));
    return secrets?.['hunter.io']?.secrets?.api_key?.value || null;
  } catch {
    return null;
  }
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.length > 0 ? `+${digits}` : '';
}

/**
 * Normalize address for comparison
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/\b(apartment|apt)\b/g, 'apt')
    .replace(/\b(suite|ste)\b/g, 'ste')
    .trim();
}
