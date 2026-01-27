/**
 * CMA (Comparative Market Analysis) Module
 */

import { prisma } from '@/lib/db';

export interface SubjectProperty {
  address: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
}

export interface Comparable {
  address: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  salePrice: number;
  saleDate?: Date;
  daysOnMarket?: number;
  distanceMiles?: number;
}

export interface CMAResult {
  suggestedPriceMin: number;
  suggestedPriceMax: number;
  suggestedPrice: number;
  pricePerSqft: number;
  comparables: Comparable[];
  adjustments: Record<string, number>;
}

export async function generateCMA(
  userId: string,
  subject: SubjectProperty,
  comparables: Comparable[]
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    if (comparables.length === 0) {
      return { success: false, error: 'No comparables provided' };
    }

    // Calculate price estimates
    const prices = comparables.map(c => c.salePrice);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Calculate price per sqft
    const pricePerSqftValues = comparables
      .filter(c => c.sqft && c.sqft > 0)
      .map(c => c.salePrice / (c.sqft || 1));
    const avgPricePerSqft = pricePerSqftValues.length > 0
      ? pricePerSqftValues.reduce((a, b) => a + b, 0) / pricePerSqftValues.length
      : 0;

    // Estimate subject value
    const suggestedPrice = subject.sqft && avgPricePerSqft > 0
      ? subject.sqft * avgPricePerSqft
      : avgPrice;

    // Create report
    const report = await prisma.rECMAReport.create({
      data: {
        userId,
        address: subject.address,
        beds: subject.beds,
        baths: subject.baths,
        sqft: subject.sqft,
        yearBuilt: subject.yearBuilt,
        comparables: comparables,
        adjustments: {},
        suggestedPriceMin: minPrice * 0.95,
        suggestedPriceMax: maxPrice * 1.05,
        suggestedPrice,
        pricePerSqft: avgPricePerSqft
      }
    });

    return { success: true, report };
  } catch (error: any) {
    console.error('CMA generation error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserCMAs(userId: string, limit = 50) {
  try {
    return await prisma.rECMAReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('Error fetching CMAs:', error);
    return [];
  }
}

export async function getCMAById(id: string, userId: string) {
  try {
    return await prisma.rECMAReport.findFirst({
      where: { id, userId }
    });
  } catch (error) {
    console.error('Error fetching CMA:', error);
    return null;
  }
}

export async function deleteCMA(id: string, userId: string) {
  try {
    await prisma.rECMAReport.deleteMany({
      where: { id, userId }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
