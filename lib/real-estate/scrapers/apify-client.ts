/**
 * Apify Client for FSBO/Expired Listing Scraping
 * Connects to Apify actors for real estate lead generation
 */

import { getApifyToken } from './utils';

const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Popular Apify actors for real estate scraping
export const APIFY_ACTORS = {
  // Zillow scrapers
  ZILLOW_SCRAPER: 'maxcopell/zillow-scraper',
  ZILLOW_SEARCH: 'petr_cermak/zillow-search-scraper',
  
  // Realtor.com scrapers
  REALTOR_SCRAPER: 'epctex/realtor-scraper',
  
  // Generic web scraper (for FSBO.com, etc.)
  WEB_SCRAPER: 'apify/web-scraper',
  CHEERIO_SCRAPER: 'apify/cheerio-scraper',
  
  // Google Maps (for property research)
  GOOGLE_MAPS: 'nwua/google-maps-scraper'
};

export interface ApifyRunInput {
  actorId: string;
  input: Record<string, any>;
  waitForFinish?: number; // seconds to wait
}

export interface ApifyRunResult {
  success: boolean;
  runId?: string;
  datasetId?: string;
  items?: any[];
  error?: string;
}

/**
 * Get Apify API token from secrets
 */
function getToken(): string {
  // First check env var, then try secrets file
  if (process.env.APIFY_API_TOKEN) {
    return process.env.APIFY_API_TOKEN;
  }
  return getApifyToken();
}

/**
 * Run an Apify actor and wait for results
 */
export async function runApifyActor(config: ApifyRunInput): Promise<ApifyRunResult> {
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      error: 'Soshogle AI Lead Finder not configured. Add APIFY_API_TOKEN to environment.'
    };
  }

  try {
    // Start the actor run
    const runResponse = await fetch(
      `${APIFY_BASE_URL}/acts/${config.actorId}/runs?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.input)
      }
    );

    if (!runResponse.ok) {
      const error = await runResponse.text();
      return { success: false, error: `Failed to start actor: ${error}` };
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;

    console.log(`[Apify] Started run ${runId} for actor ${config.actorId}`);

    // Wait for completion if specified
    if (config.waitForFinish && config.waitForFinish > 0) {
      const waitMs = config.waitForFinish * 1000;
      const startTime = Date.now();
      let status = 'RUNNING';

      while (status === 'RUNNING' && (Date.now() - startTime) < waitMs) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        
        const statusResponse = await fetch(
          `${APIFY_BASE_URL}/acts/${config.actorId}/runs/${runId}?token=${token}`
        );
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.data.status;
        }
      }

      if (status === 'SUCCEEDED') {
        // Fetch results
        const items = await getDatasetItems(datasetId);
        return { success: true, runId, datasetId, items };
      } else if (status === 'RUNNING') {
        return {
          success: true,
          runId,
          datasetId,
          items: [],
          error: 'Run still in progress. Check back later.'
        };
      } else {
        return { success: false, runId, error: `Run ended with status: ${status}` };
      }
    }

    return { success: true, runId, datasetId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get items from an Apify dataset
 */
export async function getDatasetItems(datasetId: string, limit = 1000): Promise<any[]> {
  const token = getToken();
  
  if (!token) return [];

  try {
    const response = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=${limit}`
    );

    if (!response.ok) return [];
    
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * Check run status
 */
export async function getRunStatus(actorId: string, runId: string): Promise<{
  status: string;
  datasetId?: string;
}> {
  const token = getToken();
  
  if (!token) return { status: 'ERROR' };

  try {
    const response = await fetch(
      `${APIFY_BASE_URL}/acts/${actorId}/runs/${runId}?token=${token}`
    );

    if (!response.ok) return { status: 'ERROR' };
    
    const data = await response.json();
    return {
      status: data.data.status,
      datasetId: data.data.defaultDatasetId
    };
  } catch {
    return { status: 'ERROR' };
  }
}

/**
 * Validate Apify connection
 */
export async function validateApifyConnection(): Promise<{
  valid: boolean;
  user?: string;
  error?: string;
}> {
  const token = getToken();
  
  if (!token) {
    return { valid: false, error: 'Soshogle AI Lead Finder not configured' };
  }

  try {
    const response = await fetch(`${APIFY_BASE_URL}/users/me?token=${token}`);
    
    if (!response.ok) {
      return { valid: false, error: 'Invalid Soshogle AI Lead Finder API token' };
    }
    
    const data = await response.json();
    return { valid: true, user: data.data.username };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}
