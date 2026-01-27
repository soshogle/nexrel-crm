/**
 * Market Intelligence Module
 */

export {
  collectMarketStats,
  getMarketStats,
  getLatestMarketStats,
  type MarketDataInput,
  type MarketStats
} from './market-data-collector';

export {
  generateMarketReport,
  getUserReports,
  getReportById,
  deleteReport,
  markReportSent,
  type GenerateReportInput,
  type ReportContent
} from './report-generator';

export {
  createStaleDiagnostic,
  getUserDiagnostics,
  getDiagnosticById,
  updateDiagnosticStatus,
  getStaleListings,
  analyzeStaleListing,
  type DiagnosticInput,
  type DiagnosticAnalysis
} from './stale-listing-diagnostic';
