/**
 * Data Enrichment Pipeline
 * 
 * Enriches lead data using Hunter.io and Clearbit APIs
 * Implements caching to minimize API calls and costs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CACHE_EXPIRY_DAYS = 90; // Cache enrichment data for 90 days

export interface EnrichmentResult {
  success: boolean;
  data?: {
    email?: string;
    emailVerified?: boolean;
    companyInfo?: any;
    decisionMakers?: any[];
    industry?: string;
    employeeCount?: number;
    funding?: string;
    techStack?: string[];
  };
  source: 'cache' | 'api';
  cached: boolean;
  error?: string;
}

/**
 * Enrich a single lead
 */
export async function enrichLead(
  leadId: string,
  options: {
    skipCache?: boolean;
    findEmail?: boolean;
    findCompanyInfo?: boolean;
  } = {}
): Promise<EnrichmentResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });
  
  if (!lead) {
    return {
      success: false,
      error: 'Lead not found',
      source: 'api',
      cached: false
    };
  }
  
  // Check cache first (unless skipCache is true)
  if (!options.skipCache) {
    const cached = await getCachedEnrichment(
      lead.businessName,
      lead.website || ''
    );
    
    if (cached) {
      // Update lead with cached data
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          enrichedData: cached.enrichedData,
          lastEnrichedAt: new Date()
        }
      });
      
      return {
        success: true,
        data: cached.enrichedData as any,
        source: 'cache',
        cached: true
      };
    }
  }
  
  // Enrich from APIs
  const enrichedData: any = {};
  
  try {
    // Find email using Hunter.io (if requested and email is missing)
    if (options.findEmail !== false && !lead.email && lead.website) {
      const emailData = await findEmailWithHunter(lead.website, lead.contactPerson || '');
      if (emailData) {
        enrichedData.email = emailData.email;
        enrichedData.emailVerified = emailData.verified;
        enrichedData.emailScore = emailData.score;
      }
    }
    
    // Get company info using Clearbit (if requested)
    if (options.findCompanyInfo !== false && lead.website) {
      const companyData = await getCompanyInfoClearbit(lead.website);
      if (companyData) {
        enrichedData.companyInfo = companyData;
        enrichedData.industry = companyData.industry;
        enrichedData.employeeCount = companyData.metrics?.employees;
        enrichedData.funding = companyData.metrics?.raised;
        enrichedData.techStack = companyData.tech;
      }
    }
    
    // Cache the enrichment data
    await cacheEnrichmentData(
      lead.businessName,
      lead.website || '',
      enrichedData
    );
    
    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichedData,
        lastEnrichedAt: new Date(),
        email: enrichedData.email || lead.email
      }
    });
    
    return {
      success: true,
      data: enrichedData,
      source: 'api',
      cached: false
    };
  } catch (error) {
    console.error('Error enriching lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'api',
      cached: false
    };
  }
}

/**
 * Find email using Hunter.io API
 */
async function findEmailWithHunter(
  domain: string,
  fullName: string
): Promise<{ email: string; verified: boolean; score: number } | null> {
  try {
    // Extract domain from URL if full URL is provided
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    
    // Check if Hunter.io API key is configured
    const apiKey = process.env.HUNTER_IO_API_KEY;
    if (!apiKey) {
      console.warn('Hunter.io API key not configured');
      return null;
    }
    
    // If fullName is provided, search for specific person
    if (fullName) {
      const [firstName, lastName] = fullName.split(' ');
      const response = await fetch(
        `https://api.hunter.io/v2/email-finder?domain=${cleanDomain}&first_name=${firstName}&last_name=${lastName || ''}&api_key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Hunter.io API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.data?.email) {
        return {
          email: data.data.email,
          verified: data.data.verification?.status === 'valid',
          score: data.data.score || 0
        };
      }
    }
    
    // Otherwise, get domain info
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${cleanDomain}&api_key=${apiKey}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Hunter.io API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const email = data.data?.emails?.[0];
    
    if (email) {
      return {
        email: email.value,
        verified: email.verification?.status === 'valid',
        score: email.confidence || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error finding email with Hunter.io:', error);
    return null;
  }
}

/**
 * Get company info using Clearbit API
 */
async function getCompanyInfoClearbit(domain: string): Promise<any | null> {
  try {
    // Extract domain from URL
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    
    // Check if Clearbit API key is configured
    const apiKey = process.env.CLEARBIT_API_KEY;
    if (!apiKey) {
      console.warn('Clearbit API key not configured');
      return null;
    }
    
    const response = await fetch(
      `https://company.clearbit.com/v2/companies/find?domain=${cleanDomain}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        // Company not found in Clearbit
        return null;
      }
      throw new Error(`Clearbit API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting company info from Clearbit:', error);
    return null;
  }
}

/**
 * Get cached enrichment data
 */
async function getCachedEnrichment(
  companyName: string,
  domain: string
): Promise<{ enrichedData: any } | null> {
  try {
    const expiresAfter = new Date();
    expiresAfter.setDate(expiresAfter.getDate() - CACHE_EXPIRY_DAYS);
    
    const cached = await prisma.enrichmentCache.findFirst({
      where: {
        OR: domain ? [
          { companyName },
          { domain }
        ] : [
          { companyName }
        ],
        lastUpdated: {
          gte: expiresAfter
        }
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });
    
    return cached;
  } catch (error) {
    console.error('Error getting cached enrichment:', error);
    return null;
  }
}

/**
 * Cache enrichment data
 */
async function cacheEnrichmentData(
  companyName: string,
  domain: string,
  enrichedData: any
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRY_DAYS);
    
    // Upsert cache entry
    await prisma.enrichmentCache.upsert({
      where: {
        companyId: `${companyName}_${domain}`.toLowerCase().replace(/\s+/g, '_')
      },
      update: {
        enrichedData,
        lastUpdated: new Date(),
        expiresAt
      },
      create: {
        companyId: `${companyName}_${domain}`.toLowerCase().replace(/\s+/g, '_'),
        companyName,
        domain,
        enrichedData,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Error caching enrichment data:', error);
  }
}

/**
 * Batch enrich multiple leads
 */
export async function batchEnrichLeads(
  leadIds: string[],
  options: {
    skipCache?: boolean;
    findEmail?: boolean;
    findCompanyInfo?: boolean;
  } = {}
): Promise<{
  processed: number;
  enriched: number;
  errors: number;
  results: EnrichmentResult[];
}> {
  const results: EnrichmentResult[] = [];
  let processed = 0;
  let enriched = 0;
  let errors = 0;
  
  // Process in batches of 10 to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < leadIds.length; i += batchSize) {
    const batch = leadIds.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (leadId) => {
        const result = await enrichLead(leadId, options);
        processed++;
        if (result.success) enriched++;
        else errors++;
        return result;
      })
    );
    
    results.push(...batchResults);
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < leadIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return { processed, enriched, errors, results };
}

/**
 * Get enrichment stats
 */
export async function getEnrichmentStats(userId: string) {
  const total = await prisma.lead.count({
    where: { userId }
  });
  
  // Get all leads and manually count enriched ones
  const allLeads = await prisma.lead.findMany({
    where: { userId },
    select: { enrichedData: true }
  });
  
  const enriched = allLeads.filter(l => l.enrichedData !== null).length;
  
  const cacheHits = await prisma.enrichmentCache.count();
  
  return {
    total,
    enriched,
    percentageEnriched: total > 0 ? (enriched / total) * 100 : 0,
    cacheHits
  };
}
