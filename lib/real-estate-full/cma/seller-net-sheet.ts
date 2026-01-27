/**
 * Seller Net Sheet Calculator
 * Calculates estimated proceeds for sellers
 */

import { prisma } from '@/lib/db';

export interface SellerNetSheetInput {
  // Property
  address: string;
  city: string;
  state: string;
  salePrice: number;
  
  // Mortgage
  mortgageBalance?: number;
  secondMortgage?: number;
  heloc?: number;
  
  // Commission
  listingAgentCommission?: number;  // Percentage (e.g., 2.5)
  buyerAgentCommission?: number;    // Percentage (e.g., 2.5)
  
  // Fees
  titleInsurance?: number;
  escrowFees?: number;
  attorneyFees?: number;
  transferTax?: number;  // Percentage or flat
  transferTaxIsPercent?: boolean;
  recordingFees?: number;
  hoaFees?: number;
  prorations?: number;  // Property tax prorations, HOA, etc.
  
  // Repairs/Credits
  repairCredits?: number;
  sellerConcessions?: number;
  homeWarranty?: number;
  
  // Other
  otherFees?: number;
  otherCredits?: number;
}

export interface SellerNetSheet {
  id: string;
  generatedAt: Date;
  
  // Input Summary
  salePrice: number;
  address: string;
  
  // Deductions Breakdown
  deductions: {
    category: string;
    items: {
      name: string;
      amount: number;
      isEstimate: boolean;
    }[];
    subtotal: number;
  }[];
  
  totalDeductions: number;
  
  // Results
  estimatedProceeds: number;
  proceedsRange: {
    low: number;
    high: number;
  };
  
  // Summary
  summaryItems: {
    label: string;
    amount: number;
    type: 'gross' | 'deduction' | 'net';
  }[];
  
  // Disclaimers
  disclaimers: string[];
}

// Default closing costs by state (approximate percentages of sale price)
const STATE_CLOSING_COSTS: Record<string, {
  transferTax: number;
  titleInsurancePercent: number;
  escrowPercent: number;
}> = {
  'CA': { transferTax: 0.11, titleInsurancePercent: 0.3, escrowPercent: 0.2 },
  'TX': { transferTax: 0, titleInsurancePercent: 0.4, escrowPercent: 0.2 },
  'FL': { transferTax: 0.7, titleInsurancePercent: 0.35, escrowPercent: 0.2 },
  'NY': { transferTax: 0.4, titleInsurancePercent: 0.4, escrowPercent: 0.25 },
  'IL': { transferTax: 0.1, titleInsurancePercent: 0.35, escrowPercent: 0.2 },
  'PA': { transferTax: 2.0, titleInsurancePercent: 0.35, escrowPercent: 0.2 },
  'AZ': { transferTax: 0, titleInsurancePercent: 0.3, escrowPercent: 0.2 },
  'NC': { transferTax: 0.2, titleInsurancePercent: 0.3, escrowPercent: 0.2 },
  'GA': { transferTax: 0.1, titleInsurancePercent: 0.35, escrowPercent: 0.2 },
  'WA': { transferTax: 1.28, titleInsurancePercent: 0.3, escrowPercent: 0.2 },
  // Canadian provinces
  'ON': { transferTax: 1.5, titleInsurancePercent: 0.1, escrowPercent: 0.15 },
  'BC': { transferTax: 1.0, titleInsurancePercent: 0.1, escrowPercent: 0.15 },
  'AB': { transferTax: 0, titleInsurancePercent: 0.1, escrowPercent: 0.15 },
  'QC': { transferTax: 1.25, titleInsurancePercent: 0.1, escrowPercent: 0.15 }
};

/**
 * Calculate seller net sheet
 */
export async function calculateSellerNetSheet(
  input: SellerNetSheetInput,
  userId: string
): Promise<SellerNetSheet> {
  const stateDefaults = STATE_CLOSING_COSTS[input.state] || {
    transferTax: 0.5,
    titleInsurancePercent: 0.35,
    escrowPercent: 0.2
  };

  const deductions: SellerNetSheet['deductions'] = [];

  // 1. Commissions
  const listingCommission = input.listingAgentCommission !== undefined
    ? input.salePrice * (input.listingAgentCommission / 100)
    : input.salePrice * 0.025;
  const buyerCommission = input.buyerAgentCommission !== undefined
    ? input.salePrice * (input.buyerAgentCommission / 100)
    : input.salePrice * 0.025;

  deductions.push({
    category: 'Real Estate Commissions',
    items: [
      { name: 'Listing Agent Commission', amount: listingCommission, isEstimate: input.listingAgentCommission === undefined },
      { name: 'Buyer Agent Commission', amount: buyerCommission, isEstimate: input.buyerAgentCommission === undefined }
    ],
    subtotal: listingCommission + buyerCommission
  });

  // 2. Mortgage Payoffs
  const mortgageItems: { name: string; amount: number; isEstimate: boolean }[] = [];
  if (input.mortgageBalance) {
    mortgageItems.push({ name: 'First Mortgage Payoff', amount: input.mortgageBalance, isEstimate: false });
  }
  if (input.secondMortgage) {
    mortgageItems.push({ name: 'Second Mortgage Payoff', amount: input.secondMortgage, isEstimate: false });
  }
  if (input.heloc) {
    mortgageItems.push({ name: 'HELOC Payoff', amount: input.heloc, isEstimate: false });
  }
  if (mortgageItems.length > 0) {
    deductions.push({
      category: 'Mortgage Payoffs',
      items: mortgageItems,
      subtotal: mortgageItems.reduce((sum, item) => sum + item.amount, 0)
    });
  }

  // 3. Closing Costs
  const titleInsurance = input.titleInsurance ?? Math.round(input.salePrice * (stateDefaults.titleInsurancePercent / 100));
  const escrowFees = input.escrowFees ?? Math.round(input.salePrice * (stateDefaults.escrowPercent / 100));
  const transferTax = input.transferTax !== undefined
    ? (input.transferTaxIsPercent ? input.salePrice * (input.transferTax / 100) : input.transferTax)
    : Math.round(input.salePrice * (stateDefaults.transferTax / 100));
  const recordingFees = input.recordingFees ?? 150;
  const attorneyFees = input.attorneyFees ?? 0;

  const closingItems = [
    { name: 'Title Insurance', amount: titleInsurance, isEstimate: input.titleInsurance === undefined },
    { name: 'Escrow/Settlement Fees', amount: escrowFees, isEstimate: input.escrowFees === undefined },
    { name: 'Transfer Tax', amount: transferTax, isEstimate: input.transferTax === undefined },
    { name: 'Recording Fees', amount: recordingFees, isEstimate: input.recordingFees === undefined }
  ];

  if (attorneyFees > 0) {
    closingItems.push({ name: 'Attorney Fees', amount: attorneyFees, isEstimate: false });
  }

  deductions.push({
    category: 'Closing Costs',
    items: closingItems,
    subtotal: closingItems.reduce((sum, item) => sum + item.amount, 0)
  });

  // 4. HOA & Prorations
  const prorationItems: { name: string; amount: number; isEstimate: boolean }[] = [];
  if (input.hoaFees) {
    prorationItems.push({ name: 'HOA Fees', amount: input.hoaFees, isEstimate: false });
  }
  if (input.prorations) {
    prorationItems.push({ name: 'Tax/HOA Prorations', amount: input.prorations, isEstimate: false });
  }
  if (prorationItems.length > 0) {
    deductions.push({
      category: 'Prorations & HOA',
      items: prorationItems,
      subtotal: prorationItems.reduce((sum, item) => sum + item.amount, 0)
    });
  }

  // 5. Seller Credits & Repairs
  const creditItems: { name: string; amount: number; isEstimate: boolean }[] = [];
  if (input.repairCredits) {
    creditItems.push({ name: 'Repair Credits', amount: input.repairCredits, isEstimate: false });
  }
  if (input.sellerConcessions) {
    creditItems.push({ name: 'Seller Concessions', amount: input.sellerConcessions, isEstimate: false });
  }
  if (input.homeWarranty) {
    creditItems.push({ name: 'Home Warranty', amount: input.homeWarranty, isEstimate: false });
  }
  if (creditItems.length > 0) {
    deductions.push({
      category: 'Seller Credits & Repairs',
      items: creditItems,
      subtotal: creditItems.reduce((sum, item) => sum + item.amount, 0)
    });
  }

  // 6. Other
  if (input.otherFees) {
    deductions.push({
      category: 'Other Fees',
      items: [{ name: 'Other Fees', amount: input.otherFees, isEstimate: false }],
      subtotal: input.otherFees
    });
  }

  // Calculate totals
  const totalDeductions = deductions.reduce((sum, d) => sum + d.subtotal, 0);
  const estimatedProceeds = input.salePrice - totalDeductions + (input.otherCredits || 0);

  // Range (accounting for estimate variance)
  const estimateVariance = deductions
    .flatMap(d => d.items)
    .filter(i => i.isEstimate)
    .reduce((sum, i) => sum + i.amount * 0.2, 0);  // 20% variance on estimates

  const proceedsRange = {
    low: Math.round(estimatedProceeds - estimateVariance),
    high: Math.round(estimatedProceeds + estimateVariance)
  };

  // Summary items
  const summaryItems: SellerNetSheet['summaryItems'] = [
    { label: 'Sale Price', amount: input.salePrice, type: 'gross' },
    ...deductions.map(d => ({ label: d.category, amount: -d.subtotal, type: 'deduction' as const })),
    { label: 'Estimated Net Proceeds', amount: estimatedProceeds, type: 'net' }
  ];

  // Save to database
  const sheet = await prisma.rESellerNetSheet.create({
    data: {
      userId,
      address: input.address,
      salePrice: input.salePrice,
      mortgagePayoff: input.mortgageBalance,
      commissionAmount: listingCommission + buyerCommission,
      listingAgentComm: listingCommission,
      buyerAgentComm: buyerCommission,
      closingCosts: deductions.find(d => d.category === 'Closing Costs')?.subtotal,
      titleInsurance: titleInsurance,
      transferTax: transferTax,
      repairs: input.repairCredits,
      otherCosts: input.otherFees,
      estimatedNet: Math.round(estimatedProceeds)
    }
  });

  return {
    id: sheet.id,
    generatedAt: sheet.createdAt,
    salePrice: input.salePrice,
    address: input.address,
    deductions,
    totalDeductions,
    estimatedProceeds: Math.round(estimatedProceeds),
    proceedsRange,
    summaryItems,
    disclaimers: [
      'This is an estimate only. Actual costs may vary.',
      'Mortgage payoff amounts should be verified with your lender.',
      'Title and escrow fees are estimates based on typical costs in your area.',
      'Consult with your real estate professional for a more accurate estimate.'
    ]
  };
}

/**
 * Get user's net sheet history
 */
export async function getUserNetSheets(userId: string, limit: number = 10): Promise<any[]> {
  return prisma.rESellerNetSheet.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}
