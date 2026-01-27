/**
 * Shared utilities for real estate scrapers
 */

export async function getApifyToken(): Promise<string> {
  return process.env.APIFY_API_TOKEN || '';
}

export async function getHunterApiKey(): Promise<string> {
  return process.env.HUNTER_API_KEY || '';
}
