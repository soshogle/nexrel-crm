/**
 * LinkedIn B2B Lead Scraper Service
 * Uses Apify for LinkedIn scraping with weekly limits
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
        source: 'LinkedIn Scraper',
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
   */
  async scrapeLinkedInProfiles(
    userId: string,
    searchQuery: string,
    maxResults: number = 20
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
        result.errors.push('Apify API key not configured');
        return result;
      }

      console.log(`🔍 Starting LinkedIn scrape for query: "${searchQuery}" (max ${remainingAllowed} results)`);

      // Call Apify LinkedIn scraper
      const profiles = await this.callApifyActor(searchQuery, remainingAllowed);
      result.profiles = profiles;
      result.leadsScraped = profiles.length;

      // Create leads in database
      let createdCount = 0;
      for (const profile of profiles) {
        try {
          await prisma.lead.create({
            data: {
              userId,
              businessName: profile.company || 'Unknown Company',
              contactPerson: profile.name,
              email: profile.email || null,
              phone: profile.phone || null,
              website: profile.profileUrl,
              source: 'LinkedIn Scraper',
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
        } catch (createError: any) {
          console.error(`❌ Failed to create lead for ${profile.name}:`, createError.message);
          result.errors.push(`Failed to create lead: ${profile.name}`);
        }
      }

      result.leadsCreated = createdCount;
      result.success = createdCount > 0;

      console.log(`✅ LinkedIn scrape complete: ${createdCount}/${profiles.length} leads created`);

      return result;
    } catch (error: any) {
      console.error('❌ LinkedIn scraping error:', error);
      result.errors.push(error.message || 'Unknown error during scraping');
      return result;
    }
  }

  /**
   * Call Apify actor for LinkedIn scraping
   */
  private async callApifyActor(searchQuery: string, maxResults: number): Promise<LinkedInProfile[]> {
    try {
      // Start Apify actor run (harvestapi/linkedin-profile-search)
      const runResponse = await fetch(`https://api.apify.com/v2/acts/${this.APIFY_ACTOR_ID}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apifyApiKey}`,
        },
        body: JSON.stringify({
          searchQuery,
          profileScraperMode: 'Short', // Fast: basic profile data only. Use 'Full' for detailed profiles.
          takePages: Math.ceil(maxResults / 25), // ~25 profiles per page
          maxItems: maxResults,
        }),
      });

      if (!runResponse.ok) {
        const errText = await runResponse.text();
        throw new Error(`Apify API error: ${runResponse.status} ${runResponse.statusText}${errText ? ` - ${errText.slice(0, 200)}` : ''}`);
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
        throw new Error(`Apify run did not complete successfully: ${status}`);
      }

      // Get results from dataset
      const datasetId = runData.data.defaultDatasetId;
      const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
        headers: {
          Authorization: `Bearer ${this.apifyApiKey}`,
        },
      });

      if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch Apify dataset: ${datasetResponse.statusText}`);
      }

      const profiles: any[] = await datasetResponse.json();

      // Transform HarvestAPI output to our format
      return profiles.map((p) => {
        const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown';
        const location = typeof p.location === 'object' ? p.location?.linkedinText || p.location?.text || '' : (p.location || '');
        const company = p.currentPosition?.[0]?.companyName || p.experience?.[0]?.companyName || p.company || '';
        return {
          name,
          headline: p.headline || '',
          location,
          profileUrl: p.linkedinUrl || p.profileUrl || p.url || (p.publicIdentifier ? `https://www.linkedin.com/in/${p.publicIdentifier}` : ''),
          company,
          email: p.email || '',
          phone: p.phone || p.mobileNumber || '',
          about: p.about || p.summary || '',
        };
      });
    } catch (error: any) {
      console.error('❌ Apify API call failed:', error);
      throw new Error(`Apify scraping failed: ${error.message}`);
    }
  }
}

export const linkedInScraperService = new LinkedInScraperService();
