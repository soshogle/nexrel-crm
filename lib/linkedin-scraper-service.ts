/**
 * LinkedIn B2B Lead Scraper Service
 * Uses Apify for LinkedIn scraping with weekly limits
 * Auto-enriches new leads with Hunter.io in background when email/company missing
 */

import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  profileUrl: string;
  company?: string;
  email?: string;
  phone?: string;
  about?: string;
}

interface ScrapeResult {
  success: boolean;
  leadsScraped: number;
  leadsCreated: number;
  errors: string[];
  profiles: LinkedInProfile[];
}

export class LinkedInScraperService {
  private apifyApiKey: string;
  private readonly WEEKLY_LIMIT = 50;
  private readonly APIFY_ACTOR_ID = 'harvestapi~linkedin-profile-search';

  constructor() {
    // Load API key from auth secrets
    this.apifyApiKey = this.loadApifyKey();
  }

  private loadApifyKey(): string {
    // Prefer environment variables (works on Vercel, local, etc.)
    if (process.env.APIFY_API_KEY) return process.env.APIFY_API_KEY;
    if (process.env.APIFY_API_TOKEN) return process.env.APIFY_API_TOKEN;

    // Fallback: secrets file (legacy Ubuntu/server setup)
    try {
      const secretsPath = path.join('/home/ubuntu/.config', 'abacusai_auth_secrets.json');
      if (fs.existsSync(secretsPath)) {
        const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        return secrets.apify?.secrets?.api_token?.value || '';
      }
    } catch (error) {
      console.error('❌ Failed to load Apify key:', error);
    }
    return '';
  }

  /**
   * Check if user has reached weekly scraping limit
   */
  async checkWeeklyLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const scrapedCount = await prisma.lead.count({
      where: {
        userId,
        source: 'Soshogle Lead Finder',
        createdAt: {
          gte: oneWeekAgo,
        },
      },
    });

    return {
      allowed: scrapedCount < this.WEEKLY_LIMIT,
      used: scrapedCount,
      limit: this.WEEKLY_LIMIT,
    };
  }

  /**
   * Scrape LinkedIn profiles based on search query
   * @param profileMode - 'Short' (basic only), 'Full' (company, experience), or 'Full + email search' (includes email lookup)
   */
  async scrapeLinkedInProfiles(
    userId: string,
    searchQuery: string,
    maxResults: number = 20,
    profileMode: 'Short' | 'Full' | 'Full + email search' = 'Full'
  ): Promise<ScrapeResult> {
    const result: ScrapeResult = {
      success: false,
      leadsScraped: 0,
      leadsCreated: 0,
      errors: [],
      profiles: [],
    };

    try {
      // Check weekly limit
      const limitCheck = await this.checkWeeklyLimit(userId);
      if (!limitCheck.allowed) {
        result.errors.push(
          `Weekly limit reached: ${limitCheck.used}/${limitCheck.limit} leads scraped this week`
        );
        return result;
      }

      const remainingAllowed = Math.min(maxResults, this.WEEKLY_LIMIT - limitCheck.used);

      if (!this.apifyApiKey) {
        result.errors.push('Soshogle AI Lead Finder is not configured');
        return result;
      }

      console.log(`🔍 Starting LinkedIn scrape for query: "${searchQuery}" (max ${remainingAllowed} results)`);

      // Call Apify LinkedIn scraper
      const profiles = await this.callApifyActor(searchQuery, remainingAllowed, profileMode);
      result.profiles = profiles;
      result.leadsScraped = profiles.length;

      // Create leads in database
      let createdCount = 0;
      const createdLeadIds: string[] = [];
      for (const profile of profiles) {
        try {
          const lead = await prisma.lead.create({
            data: {
              userId,
              businessName: profile.company || 'Unknown Company',
              contactPerson: profile.name,
              email: profile.email || null,
              phone: profile.phone || null,
              website: profile.profileUrl,
              source: 'Soshogle Lead Finder',
              status: 'NEW',
              enrichedData: {
                linkedInProfile: profile.profileUrl,
                headline: profile.headline,
                location: profile.location,
                about: profile.about,
                scrapedAt: new Date().toISOString(),
                scrapedNotes: `${profile.headline || ''}\n\nLocation: ${profile.location || 'N/A'}\n\nAbout: ${profile.about || 'N/A'}`,
              },
            },
          });
          createdCount++;
          createdLeadIds.push(lead.id);
        } catch (createError: any) {
          console.error(`❌ Failed to create lead for ${profile.name}:`, createError.message);
          result.errors.push(`Failed to create lead: ${profile.name}`);
        }
      }

      result.leadsCreated = createdCount;
      result.success = createdCount > 0;

      console.log(`✅ LinkedIn scrape complete: ${createdCount}/${profiles.length} leads created`);

      // Auto-enrich leads in background with Hunter.io when email or company info is missing
      if (createdLeadIds.length > 0) {
        this.enrichLeadsInBackground(createdLeadIds).catch((err) =>
          console.error('Background enrichment error:', err)
        );
      }

      return result;
    } catch (error: any) {
      console.error('❌ LinkedIn scraping error:', error);
      result.errors.push(error.message || 'Unknown error during scraping');
      return result;
    }
  }

  /**
   * Enrich newly scraped leads in background with Hunter.io (find emails, company domain)
   * Only enriches leads that could benefit: have company + contact name but missing email
   */
  private async enrichLeadsInBackground(leadIds: string[]): Promise<void> {
    try {
      const { dataEnrichmentService } = await import('@/lib/data-enrichment-service');
      const leads = await prisma.lead.findMany({
        where: {
          id: { in: leadIds },
          OR: [{ email: null }, { email: '' }],
          businessName: { not: 'Unknown Company' },
          contactPerson: { not: null },
        },
      });
      console.log(`🔍 Background enriching ${leads.length} leads with Hunter.io...`);
      for (const lead of leads) {
        try {
          let domain: string | undefined;
          if (lead.website && !lead.website.includes('linkedin.com')) {
            try {
              domain = new URL(lead.website).hostname;
            } catch {
              domain = undefined;
            }
          }
          await dataEnrichmentService.enrichLead(lead.id, {
            email: lead.email || undefined,
            domain,
            firstName: lead.contactPerson?.split(' ')[0],
            lastName: lead.contactPerson?.split(' ').slice(1).join(' '),
            businessName: lead.businessName || undefined,
          });
          await new Promise((r) => setTimeout(r, 1500)); // Rate limit
        } catch (e) {
          console.warn(`Background enrich failed for lead ${lead.id}:`, (e as Error).message);
        }
      }
    } catch (error) {
      console.error('Background enrichment failed:', error);
    }
  }

  /**
   * Call Apify actor for LinkedIn scraping
   * profileMode: Short = basic only, Full = company/experience, Full + email search = also finds emails
   */
  private async callApifyActor(
    searchQuery: string,
    maxResults: number,
    profileMode: 'Short' | 'Full' | 'Full + email search' = 'Full'
  ): Promise<LinkedInProfile[]> {
    try {
      // Start Apify actor run (harvestapi/linkedin-profile-search)
      // Full mode gets company name, work experience. Full + email search also attempts to find emails.
      const runResponse = await fetch(`https://api.apify.com/v2/acts/${this.APIFY_ACTOR_ID}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apifyApiKey}`,
        },
        body: JSON.stringify({
          searchQuery,
          profileScraperMode: profileMode,
          takePages: Math.ceil(maxResults / 25), // ~25 profiles per page
          maxItems: maxResults,
        }),
      });

      if (!runResponse.ok) {
        const errText = await runResponse.text();
        throw new Error(`Soshogle AI Lead Finder failed`);
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;

      console.log(`🔄 Apify run started: ${runId}`);

      // Wait for run to complete (with timeout)
      let status = 'RUNNING';
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max (10 second intervals)

      while (status === 'RUNNING' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;

        const statusResponse = await fetch(`https://api.apify.com/v2/acts/${this.APIFY_ACTOR_ID}/runs/${runId}`, {
          headers: {
            Authorization: `Bearer ${this.apifyApiKey}`,
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.data.status;
          console.log(`⏳ Apify run status: ${status} (attempt ${attempts}/${maxAttempts})`);
        }
      }

      if (status !== 'SUCCEEDED') {
        throw new Error(`Soshogle AI Lead Finder did not complete successfully`);
      }

      // Get results from dataset
      const datasetId = runData.data.defaultDatasetId;
      const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
        headers: {
          Authorization: `Bearer ${this.apifyApiKey}`,
        },
      });

      if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch Soshogle Lead Finder results`);
      }

      const profiles: any[] = await datasetResponse.json();

      // Transform HarvestAPI output to our format
      // Full mode returns currentPosition[], experience[] with companyName; Short mode has minimal data
      return profiles.map((p) => {
        const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown';
        const location = typeof p.location === 'object' ? p.location?.linkedinText || p.location?.text || p.location?.parsed?.text : (p.location || '');
        // Company: currentPosition (current job) first, then experience, then top-level company
        const company =
          p.currentPosition?.[0]?.companyName ||
          (Array.isArray(p.experience) && p.experience[0]?.companyName) ||
          p.company ||
          '';
        // Email: from Full + email search mode (HarvestAPI finds via external lookup, not from LinkedIn)
        const email = p.email || p.personalEmails?.[0] || p.workEmails?.[0] || '';
        // Phone: LinkedIn doesn't expose phones; some actors may find via enrichment
        const phone = p.phone || p.mobileNumber || p.phoneNumbers?.[0] || '';
        return {
          name,
          headline: p.headline || '',
          location,
          profileUrl: p.linkedinUrl || p.profileUrl || p.url || (p.publicIdentifier ? `https://www.linkedin.com/in/${p.publicIdentifier}` : ''),
          company,
          email,
          phone,
          about: p.about || p.summary || '',
        };
      });
    } catch (error: any) {
      console.error('❌ Apify API call failed:', error);
      throw new Error(`Soshogle AI Lead Finder failed`);
    }
  }
}

export const linkedInScraperService = new LinkedInScraperService();
