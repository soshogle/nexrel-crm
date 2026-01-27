/**
 * Data Enrichment Service
 * Enriches lead data using Hunter.io and Clearbit APIs
 * Includes intelligent caching to minimize API costs
 */

import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface EnrichmentResult {
  success: boolean;
  source?: 'cache' | 'hunter' | 'clearbit' | 'combined';
  data?: {
    email?: string;
    phone?: string;
    company?: {
      name?: string;
      domain?: string;
      industry?: string;
      description?: string;
      employees?: number;
      revenue?: string;
      location?: string;
      logo?: string;
    };
    person?: {
      name?: string;
      title?: string;
      linkedin?: string;
      twitter?: string;
    };
    confidence?: number;
  };
  error?: string;
  cached?: boolean;
}

export class DataEnrichmentService {
  private hunterApiKey: string;
  private clearbitApiKey: string;
  private cacheEnabled: boolean = true;
  private cacheTTL: number = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.hunterApiKey = this.loadApiKey('hunter.io', 'api_key');
    this.clearbitApiKey = this.loadApiKey('clearbit', 'api_key');
  }

  private loadApiKey(service: string, secretName: string): string {
    try {
      const secretsPath = path.join('/home/ubuntu/.config', 'abacusai_auth_secrets.json');
      if (fs.existsSync(secretsPath)) {
        const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        return secrets[service]?.secrets?.[secretName]?.value || '';
      }
    } catch (error) {
      console.error(`❌ Failed to load ${service} API key:`, error);
    }
    return '';
  }

  /**
   * Check cache for existing enrichment data
   */
  private async checkCache(email?: string, domain?: string): Promise<EnrichmentResult | null> {
    if (!this.cacheEnabled) return null;

    try {
      const cacheKey = email || domain;
      if (!cacheKey) return null;

      // Check database for cached enrichment
      const cached = await prisma.leadEnrichmentCache.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            domain ? { domain } : {},
          ],
          expiresAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (cached && cached.enrichedData) {
        console.log(`✅ Cache hit for ${cacheKey}`);
        return {
          success: true,
          source: 'cache',
          data: cached.enrichedData as any,
          cached: true,
        };
      }
    } catch (error) {
      console.error('❌ Cache check error:', error);
    }

    return null;
  }

  /**
   * Save enrichment data to cache
   */
  private async saveToCache(
    email: string | null,
    domain: string | null,
    data: any
  ): Promise<void> {
    if (!this.cacheEnabled || (!email && !domain)) return;

    try {
      const expiresAt = new Date(Date.now() + this.cacheTTL);

      await prisma.leadEnrichmentCache.create({
        data: {
          email,
          domain,
          enrichedData: data,
          expiresAt,
        },
      });

      console.log(`✅ Cached enrichment data for ${email || domain}`);
    } catch (error) {
      console.error('❌ Cache save error:', error);
    }
  }

  /**
   * Find email using Hunter.io
   */
  private async findEmailWithHunter(
    domain: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ email?: string; confidence?: number }> {
    if (!this.hunterApiKey) {
      console.warn('⚠️ Hunter.io API key not configured');
      return {};
    }

    try {
      const params = new URLSearchParams({
        domain,
        api_key: this.hunterApiKey,
      });

      if (firstName) params.append('first_name', firstName);
      if (lastName) params.append('last_name', lastName);

      const response = await fetch(
        `https://api.hunter.io/v2/email-finder?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Hunter.io API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.data?.email) {
        return {
          email: result.data.email,
          confidence: result.data.score,
        };
      }
    } catch (error: any) {
      console.error('❌ Hunter.io email finder error:', error);
    }

    return {};
  }

  /**
   * Verify email using Hunter.io
   */
  private async verifyEmailWithHunter(email: string): Promise<boolean> {
    if (!this.hunterApiKey) return false;

    try {
      const params = new URLSearchParams({
        email,
        api_key: this.hunterApiKey,
      });

      const response = await fetch(
        `https://api.hunter.io/v2/email-verifier?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Hunter.io verification error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data?.status === 'valid';
    } catch (error: any) {
      console.error('❌ Hunter.io verification error:', error);
      return false;
    }
  }

  /**
   * Enrich company data using Clearbit
   */
  private async enrichCompanyWithClearbit(domain: string): Promise<any> {
    if (!this.clearbitApiKey) {
      console.warn('⚠️ Clearbit API key not configured');
      return {};
    }

    try {
      const response = await fetch(
        `https://company.clearbit.com/v2/companies/find?domain=${domain}`,
        {
          headers: {
            Authorization: `Bearer ${this.clearbitApiKey}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No Clearbit data found for domain: ${domain}`);
          return {};
        }
        throw new Error(`Clearbit API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        company: {
          name: data.name,
          domain: data.domain,
          industry: data.category?.industry,
          description: data.description,
          employees: data.metrics?.employees,
          revenue: data.metrics?.estimatedAnnualRevenue,
          location: data.location,
          logo: data.logo,
        },
      };
    } catch (error: any) {
      console.error('❌ Clearbit company enrichment error:', error);
      return {};
    }
  }

  /**
   * Enrich person data using Clearbit
   */
  private async enrichPersonWithClearbit(email: string): Promise<any> {
    if (!this.clearbitApiKey) return {};

    try {
      const response = await fetch(
        `https://person.clearbit.com/v2/people/find?email=${email}`,
        {
          headers: {
            Authorization: `Bearer ${this.clearbitApiKey}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No Clearbit person data found for: ${email}`);
          return {};
        }
        throw new Error(`Clearbit person API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        person: {
          name: data.name?.fullName,
          title: data.employment?.title,
          linkedin: data.linkedin?.handle,
          twitter: data.twitter?.handle,
        },
        company: data.employment?.domain
          ? await this.enrichCompanyWithClearbit(data.employment.domain)
          : {},
      };
    } catch (error: any) {
      console.error('❌ Clearbit person enrichment error:', error);
      return {};
    }
  }

  /**
   * Main enrichment method - orchestrates all enrichment sources
   */
  async enrichLead(
    leadId: string,
    options?: {
      skipCache?: boolean;
      email?: string;
      domain?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<EnrichmentResult> {
    try {
      const { email, domain, firstName, lastName, skipCache = false } = options || {};

      // Check cache first (unless skipped)
      if (!skipCache) {
        const cached = await this.checkCache(email, domain);
        if (cached) return cached;
      }

      console.log(`🔍 Starting enrichment for lead ${leadId}`);

      let enrichedData: any = {};
      let sources: string[] = [];

      // Enrich with Hunter.io
      if (domain && !email && firstName && lastName) {
        console.log(`🔍 Finding email with Hunter.io...`);
        const hunterResult = await this.findEmailWithHunter(domain, firstName, lastName);
        if (hunterResult.email) {
          enrichedData.email = hunterResult.email;
          enrichedData.confidence = hunterResult.confidence;
          sources.push('hunter');
        }
      }

      // Verify email with Hunter.io
      if (email || enrichedData.email) {
        const emailToVerify = email || enrichedData.email;
        console.log(`🔍 Verifying email with Hunter.io...`);
        const isValid = await this.verifyEmailWithHunter(emailToVerify);
        enrichedData.emailValid = isValid;
      }

      // Enrich with Clearbit
      if (email || enrichedData.email) {
        console.log(`🔍 Enriching person data with Clearbit...`);
        const clearbitPerson = await this.enrichPersonWithClearbit(
          email || enrichedData.email
        );
        enrichedData = { ...enrichedData, ...clearbitPerson };
        if (clearbitPerson.person || clearbitPerson.company) {
          sources.push('clearbit');
        }
      } else if (domain) {
        console.log(`🔍 Enriching company data with Clearbit...`);
        const clearbitCompany = await this.enrichCompanyWithClearbit(domain);
        enrichedData = { ...enrichedData, ...clearbitCompany };
        if (clearbitCompany.company) {
          sources.push('clearbit');
        }
      }

      // Save to cache
      await this.saveToCache(email || enrichedData.email || null, domain || null, enrichedData);

      // Update lead in database
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          enrichedData: enrichedData,
          email: enrichedData.email || email,
          lastEnrichedAt: new Date(),
        },
      });

      console.log(`✅ Enrichment complete for lead ${leadId} using: ${sources.join(', ')}`);

      return {
        success: true,
        source: sources.length > 1 ? 'combined' : (sources[0] as any),
        data: enrichedData,
        cached: false,
      };
    } catch (error: any) {
      console.error('❌ Enrichment error:', error);
      return {
        success: false,
        error: error.message || 'Enrichment failed',
      };
    }
  }

  /**
   * Bulk enrichment for multiple leads
   */
  async enrichLeadsBulk(leadIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
        });

        if (!lead) {
          failed++;
          continue;
        }

        const result = await this.enrichLead(leadId, {
          email: lead.email || undefined,
          domain: lead.website ? new URL(lead.website).hostname : undefined,
          firstName: lead.contactPerson?.split(' ')[0],
          lastName: lead.contactPerson?.split(' ').slice(1).join(' '),
        });

        if (result.success) {
          success++;
        } else {
          failed++;
        }

        // Add delay to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to enrich lead ${leadId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }
}

export const dataEnrichmentService = new DataEnrichmentService();
