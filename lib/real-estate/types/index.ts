/**
 * Real Estate Type Definitions
 * These match the Prisma schema exactly - using string literals
 */

// FSBO Source - matches Prisma enum REFSBOSource
export type REFSBOSource = 
  | 'DUPROPRIO'
  | 'PURPLEBRICKS'
  | 'FSBO_COM'
  | 'CRAIGSLIST'
  | 'FACEBOOK_MARKETPLACE'
  | 'KIJIJI'
  | 'ZILLOW_FSBO'
  | 'MANUAL_IMPORT'
  | 'OTHER';

export const RE_FSBO_SOURCES: REFSBOSource[] = [
  'DUPROPRIO', 'PURPLEBRICKS', 'FSBO_COM', 'CRAIGSLIST', 
  'FACEBOOK_MARKETPLACE', 'KIJIJI', 'ZILLOW_FSBO', 'MANUAL_IMPORT', 'OTHER'
];

// FSBO Status - matches Prisma enum REFSBOStatus
export type REFSBOStatus = 
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP'
  | 'NOT_INTERESTED'
  | 'CONVERTED'
  | 'DO_NOT_CONTACT'
  | 'INVALID';

export const RE_FSBO_STATUSES: REFSBOStatus[] = [
  'NEW', 'CONTACTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'CONVERTED', 'DO_NOT_CONTACT', 'INVALID'
];

// Property Types - matches Prisma enum REPropertyType
export type REPropertyType = 
  | 'SINGLE_FAMILY'
  | 'CONDO'
  | 'TOWNHOUSE'
  | 'MULTI_FAMILY'
  | 'LAND'
  | 'COMMERCIAL'
  | 'OTHER';

export const RE_PROPERTY_TYPES: REPropertyType[] = [
  'SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'OTHER'
];

// Listing Status - matches Prisma enum REListingStatus
export type REListingStatus = 
  | 'ACTIVE'
  | 'PENDING'
  | 'SOLD'
  | 'EXPIRED'
  | 'WITHDRAWN'
  | 'COMING_SOON';

export const RE_LISTING_STATUSES: REListingStatus[] = [
  'ACTIVE', 'PENDING', 'SOLD', 'EXPIRED', 'WITHDRAWN', 'COMING_SOON'
];

// DNC Source - matches Prisma enum REDNCSource
export type REDNCSource = 
  | 'CANADIAN_DNCL'
  | 'US_FTC'
  | 'INTERNAL'
  | 'USER_REQUEST';

export const RE_DNC_SOURCES: REDNCSource[] = [
  'CANADIAN_DNCL', 'US_FTC', 'INTERNAL', 'USER_REQUEST'
];

// Period Type - matches Prisma enum REPeriodType
export type REPeriodType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export const RE_PERIOD_TYPES: REPeriodType[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'];

// Report Type - matches Prisma enum REReportType
export type REReportType = 'MARKET_SNAPSHOT' | 'PRICE_TRENDS' | 'INVENTORY' | 'DAYS_ON_MARKET' | 'COMPREHENSIVE';
export const RE_REPORT_TYPES: REReportType[] = ['MARKET_SNAPSHOT', 'PRICE_TRENDS', 'INVENTORY', 'DAYS_ON_MARKET', 'COMPREHENSIVE'];

// Diagnostic Status - matches Prisma enum REDiagnosticStatus
export type REDiagnosticStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export const RE_DIAGNOSTIC_STATUSES: REDiagnosticStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'];

// Transaction Types - matches Prisma enums
export type RETransactionType = 'PURCHASE' | 'SALE' | 'LEASE' | 'REFERRAL';
export type RERepresentingSide = 'BUYER' | 'SELLER' | 'DUAL' | 'REFERRAL_ONLY';
export type RETransactionStage = 
  | 'LEAD' | 'SHOWING' | 'OFFER' | 'UNDER_CONTRACT' 
  | 'INSPECTION' | 'APPRAISAL' | 'CLOSING' | 'CLOSED' | 'CANCELLED';

// Expired Status - matches Prisma enum REExpiredStatus
export type REExpiredStatus = 'NEW' | 'CONTACTED' | 'FOLLOW_UP' | 'RELISTED' | 'NOT_INTERESTED' | 'DO_NOT_CONTACT';

// AI Employee Types - matches Prisma enum REAIEmployeeType
export type REAIEmployeeType = 
  | 'RE_SPEED_TO_LEAD'
  | 'RE_FSBO_OUTREACH'
  | 'RE_EXPIRED_OUTREACH'
  | 'RE_COLD_REACTIVATION'
  | 'RE_DOCUMENT_CHASER'
  | 'RE_SHOWING_CONFIRM'
  | 'RE_SPHERE_NURTURE'
  | 'RE_MARKET_UPDATE'
  | 'RE_STALE_DIAGNOSTIC'
  | 'RE_CMA_GENERATOR'
  | 'RE_LISTING_COORDINATOR'
  | 'RE_TRANSACTION_MANAGER';

export const RE_AI_EMPLOYEE_TYPES: REAIEmployeeType[] = [
  'RE_SPEED_TO_LEAD', 'RE_FSBO_OUTREACH', 'RE_EXPIRED_OUTREACH', 'RE_COLD_REACTIVATION',
  'RE_DOCUMENT_CHASER', 'RE_SHOWING_CONFIRM', 'RE_SPHERE_NURTURE', 'RE_MARKET_UPDATE',
  'RE_STALE_DIAGNOSTIC', 'RE_CMA_GENERATOR', 'RE_LISTING_COORDINATOR', 'RE_TRANSACTION_MANAGER'
];

// Scraping Job Status (internal, not a Prisma enum but used in code)
export type ScrapingJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
