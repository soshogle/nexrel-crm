/**
 * Real Estate Module - Main Exports
 * 
 * This module provides real estate functionality:
 * - CMA (Comparative Market Analysis) generation
 * - Seller Net Sheet calculations
 * - FSBO listing management and scraping
 * - Market intelligence and reports
 * - AI employee task execution
 * - MLS integration (requires credentials)
 */

// Types
export * from './types';

// CMA Generator
export { generateCMA, getUserCMAs, getCMAById } from './cma';

// Seller Net Sheet
export { calculateNetSheet, getUserNetSheets, getNetSheetById } from './seller-net-sheet';

// Scrapers
export {
  createScrapingJob,
  getScrapingJobs,
  updateJobStatus,
  saveFSBOListing,
  getFSBOListings,
  updateFSBOStatus,
  getStaleListings,
  runScrapingJob,
  getApifyToken,
  normalizePhone,
  normalizeAddress,
  scrapeFSBOListings,
  scrapeExpiredListings,
  validateApifyConnection
} from './scrapers';

// Market Intelligence
export {
  collectMarketStats,
  getMarketStats,
  getLatestMarketStats,
  generateMarketReport,
  getUserReports,
  getReportById,
  deleteReport,
  markReportSent,
  createStaleDiagnostic,
  analyzeStaleListing,
  getUserDiagnostics,
  updateDiagnosticStatus
} from './market-intelligence';

// AI Employees
export {
  RE_EMPLOYEE_CONFIGS,
  getREEmployeeConfig,
  getAllREEmployeeTypes,
  isREEmployeeType,
  executeAIEmployee,
  getExecutionHistory,
  getExecutionsByType
} from './ai-employees';

// MLS
export { getComparables, searchMLS, getMLSListing } from './mls';
