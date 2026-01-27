/**
 * Real Estate Types - Local definitions matching Prisma schema
 */

// FSBO Source enum - matches Prisma REFSBOSource
export type REFSBOSource = 
  | 'DUPROPRIO'
  | 'KIJIJI'
  | 'CRAIGSLIST'
  | 'CENTRIS'
  | 'REALTOR_CA'
  | 'REALTOR_COM'
  | 'ZILLOW'
  | 'FSBO_COM'
  | 'OTHER';

// FSBO Status enum - matches Prisma REFSBOStatus
export type REFSBOStatus = 
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CONVERTED'
  | 'EXPIRED'
  | 'ARCHIVED';

// Period Type enum - matches Prisma REPeriodType
export type REPeriodType = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

// Report Type enum - matches Prisma REReportType
export type REReportType = 
  | 'WEEKLY_MARKET_UPDATE'
  | 'MONTHLY_MARKET_REPORT'
  | 'QUARTERLY_ANALYSIS'
  | 'ANNUAL_REVIEW'
  | 'CUSTOM';

// Diagnostic Status enum - matches Prisma REDiagnosticStatus
export type REDiagnosticStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISMISSED';

// DNC Source enum - matches Prisma REDNCSource
export type REDNCSource = 
  | 'US_FTC'
  | 'CANADA_DNCL'
  | 'STATE_LIST'
  | 'INTERNAL'
  | 'OTHER';
