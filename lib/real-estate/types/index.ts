/**
 * Real Estate Types - Re-exports from Prisma
 */
export {
  REPropertyType,
  REListingStatus,
  REFSBOSource,
  REFSBOStatus,
  REDNCSource,
  REPeriodType,
  REReportType,
  REDiagnosticStatus,
  RETransactionType,
  RERepresentingSide,
  RETransactionStage,
  REExpiredStatus,
  REAIEmployeeType
} from '@prisma/client';

// Subject property for CMA
export interface SubjectProperty {
  address: string;
  city: string;
  state: string;
  zip?: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  lotSize?: number;
  features?: string[];
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
}

// CMA Comparable
export interface CMAComparable {
  address: string;
  city: string;
  state: string;
  price: number;
  saleDate?: Date;
  daysOnMarket: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  status: 'sold' | 'active' | 'pending';
  pricePerSqft: number;
  adjustedPrice?: number;
  adjustments?: { type: string; amount: number; reason: string }[];
}

// Seller Net Sheet Input
export interface NetSheetInput {
  address: string;
  salePrice: number;
  mortgagePayoff?: number;
  commissionRate?: number;
  closingCosts?: number;
  titleInsurance?: number;
  transferTax?: number;
  repairs?: number;
  stagingCosts?: number;
  otherCosts?: number;
}
