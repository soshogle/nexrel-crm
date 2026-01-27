/**
 * Seller Net Sheet Calculator
 */

import { prisma } from '@/lib/db';

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

export interface NetSheetResult {
  salePrice: number;
  totalDeductions: number;
  estimatedNet: number;
  breakdown: {
    mortgagePayoff: number;
    commission: number;
    closingCosts: number;
    titleInsurance: number;
    transferTax: number;
    repairs: number;
    stagingCosts: number;
    otherCosts: number;
  };
}

export async function calculateSellerNetSheet(
  userId: string,
  input: NetSheetInput
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const {
      address,
      salePrice,
      mortgagePayoff = 0,
      commissionRate = 5.0,
      closingCosts = 0,
      titleInsurance = 0,
      transferTax = 0,
      repairs = 0,
      stagingCosts = 0,
      otherCosts = 0
    } = input;

    const commissionAmount = salePrice * (commissionRate / 100);
    const listingAgentComm = commissionAmount / 2;
    const buyerAgentComm = commissionAmount / 2;

    const totalDeductions = 
      mortgagePayoff + 
      commissionAmount + 
      closingCosts + 
      titleInsurance + 
      transferTax + 
      repairs + 
      stagingCosts + 
      otherCosts;

    const estimatedNet = salePrice - totalDeductions;

    // Save to database
    const netSheet = await prisma.rESellerNetSheet.create({
      data: {
        userId,
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

    return { success: true, result: netSheet };
  } catch (error: any) {
    console.error('Net sheet calculation error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserNetSheets(userId: string, limit = 50) {
  try {
    return await prisma.rESellerNetSheet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching net sheets:', error);
    return [];
  }
}

export async function getNetSheetById(id: string, userId: string) {
  try {
    return await prisma.rESellerNetSheet.findFirst({
      where: { id, userId }
    });
  } catch (error) {
    console.error('Error fetching net sheet:', error);
    return null;
  }
}

export async function deleteNetSheet(id: string, userId: string) {
  try {
    await prisma.rESellerNetSheet.deleteMany({
      where: { id, userId }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
