/**
 * Stale Listing Diagnostic
 * AI-powered analysis of why listings haven't sold after 21+ days
 */

import { prisma } from '@/lib/db';
import OpenAI from 'openai';

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) openai = new OpenAI();
  return openai;
}

export interface ListingData {
  mlsNumber: string;
  address: string;
  city: string;
  state: string;
  price: number;
  daysOnMarket: number;
  originalPrice?: number;
  priceReductions?: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt?: number;
  propertyType: string;
  lotSize?: string;
  description?: string;
  photos?: string[];
  features?: string[];
  agentNotes?: string;
}

export interface StaleDiagnostic {
  id: string;
  listingId: string;
  analyzedAt: Date;
  daysOnMarket: number;
  
  // Diagnostic Results
  overallScore: number;  // 1-10 rating
  primaryIssues: {
    category: 'pricing' | 'marketing' | 'condition' | 'timing' | 'location';
    severity: 'high' | 'medium' | 'low';
    description: string;
  }[];
  
  // Recommendations
  pricingAnalysis: {
    currentPrice: number;
    suggestedPrice: number;
    priceReductionPercent: number;
    reasoning: string;
  };
  
  marketingIssues: string[];
  conditionConcerns: string[];
  competitiveAnalysis: string;
  
  // Action Plan
  actionPlan: {
    priority: 'immediate' | 'this_week' | 'ongoing';
    action: string;
    expectedImpact: string;
  }[];
  
  // Communication Templates
  sellerEmailDraft: string;
  sellerCallScript: string;
  socialMediaPost?: string;
}

/**
 * Analyze a stale listing and generate diagnostic report
 */
export async function analyzeStaleListing(
  listing: ListingData,
  userId: string,
  marketContext?: {
    avgDaysOnMarket: number;
    medianPrice: number;
    pricePerSqft: number;
  }
): Promise<StaleDiagnostic> {
  // Get market context if not provided
  const context = marketContext || await getMarketContext(listing.city, listing.state);
  
  // AI Analysis
  const analysis = await generateAIDiagnostic(listing, context);
  
  // Save diagnostic
  const diagnostic = await prisma.rEStaleDiagnostic.create({
    data: {
      userId,
      address: listing.address,
      listPrice: listing.price,
      daysOnMarket: listing.daysOnMarket,
      analysisJson: {
        overallScore: analysis.overallScore,
        pricingAnalysis: analysis.pricingAnalysis,
        marketingIssues: analysis.marketingIssues,
        conditionConcerns: analysis.conditionConcerns,
        competitiveAnalysis: analysis.competitiveAnalysis
      },
      topReasons: analysis.primaryIssues,
      actionPlan: analysis.actionPlan,
      sellerEmailDraft: analysis.sellerEmailDraft,
      callScript: analysis.sellerCallScript,
      status: 'PENDING'
    }
  });

  return {
    id: diagnostic.id,
    listingId: listing.mlsNumber,
    analyzedAt: diagnostic.createdAt,
    daysOnMarket: listing.daysOnMarket,
    ...analysis
  };
}

async function getMarketContext(
  city: string,
  state: string
): Promise<{ avgDaysOnMarket: number; medianPrice: number; pricePerSqft: number }> {
  // Try to get from cached market stats
  const stats = await prisma.rEMarketStats.findFirst({
    where: {
      region: { contains: city, mode: 'insensitive' },
      state
    },
    orderBy: { createdAt: 'desc' }
  });

  if (stats) {
    return {
      avgDaysOnMarket: stats.domAvg || stats.domMedian || 30,
      medianPrice: stats.medianSalePrice || 500000,
      pricePerSqft: stats.medianSalePrice && stats.activeInventory ? 250 : 250
    };
  }

  // Default values
  return {
    avgDaysOnMarket: 30,
    medianPrice: 500000,
    pricePerSqft: 250
  };
}

async function generateAIDiagnostic(
  listing: ListingData,
  context: { avgDaysOnMarket: number; medianPrice: number; pricePerSqft: number }
): Promise<Omit<StaleDiagnostic, 'id' | 'listingId' | 'analyzedAt' | 'daysOnMarket'>> {
  const pricePerSqft = listing.squareFeet > 0 ? listing.price / listing.squareFeet : 0;
  const priceDiff = ((listing.price - context.medianPrice) / context.medianPrice) * 100;
  const domDiff = ((listing.daysOnMarket - context.avgDaysOnMarket) / context.avgDaysOnMarket) * 100;

  const prompt = `You are a real estate listing consultant analyzing why a listing hasn't sold.

LISTING DATA:
- Address: ${listing.address}, ${listing.city}, ${listing.state}
- Price: $${listing.price.toLocaleString()} ($${pricePerSqft.toFixed(0)}/sqft)
- Days on Market: ${listing.daysOnMarket}
- Original Price: $${(listing.originalPrice || listing.price).toLocaleString()}
- Price Reductions: ${listing.priceReductions || 0}
- Property: ${listing.bedrooms} bed, ${listing.bathrooms} bath, ${listing.squareFeet.toLocaleString()} sqft
- Year Built: ${listing.yearBuilt || 'Unknown'}
- Type: ${listing.propertyType}
- Description: ${listing.description || 'No description'}
- Number of Photos: ${listing.photos?.length || 0}

MARKET CONTEXT:
- Area Median Price: $${context.medianPrice.toLocaleString()}
- Area Avg $/sqft: $${context.pricePerSqft.toFixed(0)}
- Area Avg Days on Market: ${context.avgDaysOnMarket}
- This listing is ${priceDiff > 0 ? priceDiff.toFixed(1) + '% ABOVE' : Math.abs(priceDiff).toFixed(1) + '% below'} median
- DOM is ${domDiff.toFixed(0)}% ${domDiff > 0 ? 'longer' : 'shorter'} than average

Analyze this listing and provide a diagnostic in JSON format:
{
  "overallScore": 1-10 (10 = excellent listing, likely to sell soon),
  "primaryIssues": [
    {"category": "pricing|marketing|condition|timing|location", "severity": "high|medium|low", "description": "..."}
  ],
  "pricingAnalysis": {
    "currentPrice": ${listing.price},
    "suggestedPrice": suggested_price_number,
    "priceReductionPercent": reduction_percentage,
    "reasoning": "explanation"
  },
  "marketingIssues": ["list of marketing problems"],
  "conditionConcerns": ["inferred condition issues"],
  "competitiveAnalysis": "how this compares to competing listings",
  "actionPlan": [
    {"priority": "immediate|this_week|ongoing", "action": "...", "expectedImpact": "..."}
  ],
  "sellerEmailDraft": "Professional email to seller about market update and recommendations (2-3 paragraphs)",
  "sellerCallScript": "Phone script for discussing the situation with the seller"
}

Be honest but tactful. Focus on actionable recommendations.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const content = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      overallScore: content.overallScore || 5,
      primaryIssues: content.primaryIssues || [],
      pricingAnalysis: content.pricingAnalysis || {
        currentPrice: listing.price,
        suggestedPrice: listing.price * 0.95,
        priceReductionPercent: 5,
        reasoning: 'Consider a modest price reduction to attract more buyers.'
      },
      marketingIssues: content.marketingIssues || [],
      conditionConcerns: content.conditionConcerns || [],
      competitiveAnalysis: content.competitiveAnalysis || 'Analysis pending.',
      actionPlan: content.actionPlan || [
        { priority: 'immediate', action: 'Review pricing strategy', expectedImpact: 'Increased showing activity' }
      ],
      sellerEmailDraft: content.sellerEmailDraft || generateDefaultEmail(listing),
      sellerCallScript: content.sellerCallScript || generateDefaultScript(listing)
    };
  } catch (error) {
    // Fallback
    return generateFallbackDiagnostic(listing, context);
  }
}

function generateDefaultEmail(listing: ListingData): string {
  return `Dear Seller,

I wanted to provide you with an update on ${listing.address}. After ${listing.daysOnMarket} days on the market, I've been analyzing current market conditions and buyer feedback to identify opportunities to improve our positioning.

Based on my analysis, I have some recommendations I'd like to discuss with you that could help us attract more qualified buyers and move toward a successful sale.

Would you be available for a call this week to review our strategy?

Best regards`;
}

function generateDefaultScript(listing: ListingData): string {
  return `Hi [Seller Name], this is [Agent] calling about ${listing.address}.

I wanted to check in with you and share some market insights. We've been on the market for ${listing.daysOnMarket} days now, and I've been looking at what's happening with similar properties.

[Discuss market conditions]

Based on my analysis, I have a few recommendations I'd like to share with you. Do you have a few minutes to discuss?

[Present recommendations from action plan]

What are your thoughts on these suggestions?`;
}

function generateFallbackDiagnostic(
  listing: ListingData,
  context: { avgDaysOnMarket: number; medianPrice: number; pricePerSqft: number }
): Omit<StaleDiagnostic, 'id' | 'listingId' | 'analyzedAt' | 'daysOnMarket'> {
  const isOverpriced = listing.price > context.medianPrice * 1.1;
  const priceReduction = isOverpriced ? Math.round((1 - context.medianPrice / listing.price) * 100) : 5;

  return {
    overallScore: isOverpriced ? 4 : 6,
    primaryIssues: [
      isOverpriced ? {
        category: 'pricing',
        severity: 'high' as const,
        description: `Property is priced ${priceReduction}% above market median`
      } : {
        category: 'marketing',
        severity: 'medium' as const,
        description: 'Consider refreshing marketing materials'
      }
    ],
    pricingAnalysis: {
      currentPrice: listing.price,
      suggestedPrice: Math.round(listing.price * (1 - priceReduction / 100)),
      priceReductionPercent: priceReduction,
      reasoning: isOverpriced 
        ? 'Price is above market comparables. A reduction would increase buyer interest.'
        : 'A modest price adjustment may help generate renewed interest.'
    },
    marketingIssues: listing.photos && listing.photos.length < 20 
      ? ['Consider adding more professional photos'] 
      : [],
    conditionConcerns: [],
    competitiveAnalysis: `Property has been on market ${listing.daysOnMarket - context.avgDaysOnMarket} days longer than area average.`,
    actionPlan: [
      { priority: 'immediate', action: 'Review and adjust pricing', expectedImpact: 'Increased buyer interest' },
      { priority: 'this_week', action: 'Refresh marketing materials', expectedImpact: 'Better online engagement' },
      { priority: 'ongoing', action: 'Weekly status calls with seller', expectedImpact: 'Aligned expectations' }
    ],
    sellerEmailDraft: generateDefaultEmail(listing),
    sellerCallScript: generateDefaultScript(listing)
  };
}

/**
 * Get listings that are stale (21+ days on market)
 */
export async function getStaleListings(
  userId: string,
  minDays: number = 21
): Promise<any[]> {
  // This would query MLS data or stored listings
  // For now, return from FSBO listings that are stale
  return prisma.rEFSBOListing.findMany({
    where: {
      assignedUserId: userId,
      daysOnMarket: { gte: minDays }
    },
    orderBy: { daysOnMarket: 'desc' }
  });
}
