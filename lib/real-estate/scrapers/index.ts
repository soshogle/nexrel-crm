/**
 * Real Estate Scrapers - Main Export
 */

// Shared utilities
export { getApifyToken, getHunterApiKey } from './utils';

// DuProprio scraper (Canada)
export { 
  scrapeDuProprio, 
  checkDuProprioJobStatus, 
  type DuProprioListing, 
  type ScrapingConfig 
} from './duproprio';

// US FSBO scraper
export { 
  scrapeUSFSBO, 
  type USFSBOListing, 
  type USScrapingConfig 
} from './us-fsbo';

// Job manager
export {
  createScrapingJob,
  runScrapingJob,
  getScrapingJobs,
  updateScrapingJob,
  deleteScrapingJob,
  getJobsDueForRun,
  type ScrapingJobConfig
} from './scraping-job-manager';

// Stub scrapers for future implementation
export {
  scrapeCentris,
  checkCentrisJobStatus,
  scrapeRealtorCA,
  checkRealtorCAJobStatus,
  scrapeRealtorCom,
  checkRealtorComJobStatus,
  scrapeZillow,
  checkZillowJobStatus,
  scrapeCraigslist,
  checkCraigslistJobStatus
} from './stub-scrapers';
