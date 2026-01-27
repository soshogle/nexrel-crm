/**
 * Real Estate Scrapers - Exports
 */

// Utils
export { getApifyToken, getHunterApiKey, normalizePhone, normalizeAddress } from './utils';

// Job Manager
export {
  createScrapingJob,
  updateScrapingJob,
  getScrapingJobs,
  deleteScrapingJob,
  getJobsDueForRun,
  runScrapingJob
} from './scraping-job-manager';

// DuProprio (Canadian FSBO)
export { 
  scrapeDuProprio, 
  checkDuProprioJobStatus,
  saveDuProprioListings,
  type DuProprioListing,
  type ScrapeDuProprioConfig
} from './duproprio';

// US FSBO Sites
export {
  scrapeUSFSBO,
  checkUSFSBOJobStatus,
  type USFSBOListing,
  type ScrapeUSFSBOConfig
} from './us-fsbo';

// Other scrapers
export { scrapeCENTRIS, checkCENTRISJobStatus } from './centris';
export { scrapeCRAIGSLIST, checkCRAIGSLISTJobStatus } from './craigslist';
export { scrapeZILLOW, checkZILLOWJobStatus } from './zillow';
export { scrapeREALTOR_CA, checkREALTOR_CAJobStatus } from './realtor-ca';
export { scrapeREALTOR_COM, checkREALTOR_COMJobStatus } from './realtor-com';
