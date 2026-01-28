/**
 * Real Estate Scrapers - Main Export
 */

// Apify Client
export {
  runApifyActor,
  getDatasetItems,
  getRunStatus,
  validateApifyConnection,
  APIFY_ACTORS
} from './apify-client';

// FSBO Scraper
export {
  scrapeFSBOListings,
  type FSBOScrapingConfig,
  type FSBOScrapingResult
} from './fsbo-scraper';

// Expired Listing Scraper
export {
  scrapeExpiredListings,
  type ExpiredListingInput,
  type ExpiredScrapingConfig
} from './expired-scraper';

// Scraper Service (DB operations)
export {
  createScrapingJob,
  getScrapingJobs,
  updateJobStatus,
  saveFSBOListing,
  getFSBOListings,
  updateFSBOStatus,
  getStaleListings,
  runScrapingJob,
  type ScrapingJobConfig,
  type FSBOListingInput
} from './scraper-service';

// Utilities
export {
  getApifyToken,
  normalizePhone,
  normalizeAddress,
  parsePrice,
  calculateDaysOnMarket,
  isValidEmail,
  getStateAbbrev,
  STATE_ABBREVS
} from './utils';
