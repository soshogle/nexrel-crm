/**
 * Real Estate Module - Main Exports
 */

// Types
export * from './types';

// Scrapers
export * from './scrapers';

// CMA
export {
  generateCMA,
  getUserCMAs,
  getCMAById,
  deleteCMA,
  type SubjectProperty,
  type Comparable,
  type CMAResult
} from './cma';

// Seller Net Sheet
export {
  calculateSellerNetSheet,
  getUserNetSheets,
  getNetSheetById,
  deleteNetSheet,
  type NetSheetInput,
  type NetSheetResult
} from './seller-net-sheet';

// Market Intelligence
export {
  collectMarketStats,
  generateMarketReport,
  getMarketStats,
  getMarketReports,
  analyzeStaleListing,
  getStaleListings,
  type MarketStatsInput,
  type MarketReportInput
} from './market-intelligence';
