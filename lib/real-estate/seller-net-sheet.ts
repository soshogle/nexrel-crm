/**
 * Seller Net Sheet Calculator
 * Calculates estimated proceeds from a home sale
 */

import { prisma } from '@/lib/db';
import type { NetSheetInput } from './types';

export interface NetSheetResult {
  id: string;
  address: string;
  salePrice: number;
  mortgagePayoff: number;
  commissionRate: number;
  commissionAmount: number;
  listingAgentComm: number;
  buyerAgentComm: number;
  closingCosts: number;
  titleInsurance: number;
  transferTax: number;
  repairs: number;
  stagingCosts: number;
  otherCosts: number;
  totalDeductions: number;
  estimatedNet: number;
  netPercentage: number;
}

/**
 * Calculate seller net sheet
 */
export async function calculateNetSheet(
  userId: string,
  input: NetSheetInput,
  propertyId?: string
): Promise<NetSheetResult> {
  const {
    address,
    salePrice,
    mortgagePayoff = 0,
    commissionRate = 5.0,
    closingCosts = salePrice * 0.01, // Default 1%
    titleInsurance = salePrice * 0.005, // Default 0.5%
    transferTax = salePrice * 0.01, // Default 1%
    repairs = 0,
    stagingCosts = 0,
    otherCosts = 0
  } = input;

  // Calculate commission
  const commissionAmount = salePrice * (commissionRate / 100);
  const listingAgentComm = commissionAmount / 2;
  const buyerAgentComm = commissionAmount / 2;

  // Total deductions
  const totalDeductions =
    mortgagePayoff +
    commissionAmount +
    closingCosts +
    titleInsurance +
    transferTax +
    repairs +
    stagingCosts +
    otherCosts;

  // Estimated net proceeds
  const estimatedNet = salePrice - totalDeductions;
  const netPercentage = (estimatedNet / salePrice) * 100;

  // Save to database
  const netSheet = await prisma.rESellerNetSheet.create({
    data: {
      userId,
      propertyId,
      address,
      salePrice,
      mortgagePayoff,
      commissionRate,
      commissionAmount,
      listingAgentComm,
      buyerAgentComm,
      closingCosts,
      titleInsurance,
      transferTax,
      repairs,
      stagingCosts,
      otherCosts,
      estimatedNet
    }
  });

  return {
    id: netSheet.id,
    address,
    salePrice,
    mortgagePayoff,
    commissionRate,
    commissionAmount,
    listingAgentComm,
    buyerAgentComm,
    closingCosts,
    titleInsurance,
    transferTax,
    repairs,
    stagingCosts,
    otherCosts,
    totalDeductions,
    estimatedNet,
    netPercentage: Math.round(netPercentage * 100) / 100
  };
}

/**
 * Get user's net sheets
 */
export async function getUserNetSheets(userId: string, limit = 10) {
  return prisma.rESellerNetSheet.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Get a single net sheet
 */
export async function getNetSheetById(id: string, userId: string) {
  return prisma.rESellerNetSheet.findFirst({
    where: { id, userId }
  });
}
