/**
 * Lead Researcher AI Employee
 * Researches companies and enriches lead data using web search, AI, Hunter.io, Clearbit, and Apify
 */

import { prisma } from '../db';
import { aiOrchestrator } from '../ai-employee-orchestrator';
import { AIEmployeeType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// API key helpers - check env first, then secrets file
async function getHunterApiKey(): Promise<string | null> {
  if (process.env.HUNTER_API_KEY) return process.env.HUNTER_API_KEY;
  try {
    const secretsPath = path.join('/home/ubuntu/.config', 'abacusai_auth_secrets.json');
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      return secrets['hunter.io']?.secrets?.api_key?.value || null;
    }
  } catch { }
  return null;
}

async function getClearbitApiKey(): Promise<string | null> {
  if (process.env.CLEARBIT_API_KEY) return process.env.CLEARBIT_API_KEY;
  try {
    const secretsPath = path.join('/home/ubuntu/.config', 'abacusai_auth_secrets.json');
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      return secrets['clearbit']?.secrets?.api_key?.value || null;
    }
  } catch { }
  return null;
}

async function getApolloApiKey(): Promise<string | null> {
  if (process.env.APOLLO_API_KEY) return process.env.APOLLO_API_KEY;
  try {
    const secretsPath = path.join('/home/ubuntu/.config', 'abacusai_auth_secrets.json');
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      return secrets['apollo']?.secrets?.api_key?.value || secrets['apollo.io']?.secrets?.api_key?.value || null;
    }
  } catch { }
  return null;
}

async function getBuiltWithApiKey(): Promise<string | null> {
  if (process.env.BUILTWITH_API_KEY) return process.env.BUILTWITH_API_KEY;
  try {
    const secretsPath = path.join('/home/ubuntu/.config', 'abacusai_auth_secrets.json');
    if (fs.existsSync(secretsPath)) {
      const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      return secrets['builtwith']?.secrets?.api_key?.value || null;
    }
  } catch { }
  return null;
}

interface HunterPerson {
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  linkedin: string | null;
  email: string;
  confidence: number;
}

interface LeadResearchInput {
  userId: string;
  leadId?: string;
  businessName: string;
  website?: string;
  industry?: string;
}

interface LeadResearchOutput {
  leadId?: string;
  enrichedData: {
    companyInfo?: {
      name: string;
      website?: string;
      description?: string;
      industry?: string;
      foundedYear?: string;
      headquarters?: string;
    };
    businessMetrics?: {
      estimatedRevenue?: string;
      employeeCount?: string;
      companySize?: string;
    };
    techStack?: string[];
    funding?: { amount?: string; stage?: string; investors?: string[] };
    keyPeople?: Array<{
      name: string;
      title: string;
      email?: string;
      phone?: string;
      linkedIn?: string;
      emailAlternatives?: string[];
      confidence?: number;
      source?: string;
    }>;
    intentSignals?: {
      hiring?: boolean;
      jobPostings?: string[];
      careersPage?: string;
    };
    recentNews?: Array<{
      title: string;
      date?: string;
      source?: string;
      url?: string;
    }>;
    contactInfo?: {
      email?: string;
      phone?: string;
      socialMedia?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
      };
    };
    recommendedApproach?: string;
    leadScore?: number;
  };
}

export class LeadResearcher {
  constructor() {
    // API key will be checked at call time via process.env.OPENAI_API_KEY
  }

  /**
   * Start lead research asynchronously - returns job ID immediately.
   * Research runs in background (takes 3-4 min). Use this for API to avoid timeout.
   */
  async startResearchAsync(input: LeadResearchInput): Promise<{ jobId: string }> {
    const { userId, leadId, businessName, website, industry } = input;
    console.log('[LeadResearcher] Starting async research for:', businessName, 'userId:', userId);

    const job = await aiOrchestrator.createJob({
      userId,
      employeeType: AIEmployeeType.LEAD_RESEARCHER,
      jobType: 'lead_enrichment',
      input: { leadId, businessName, website, industry },
      estimatedTime: 180
    });

    await aiOrchestrator.startJob(job.id);

    // Run research in background - don't await
    this.research(job.id, input).catch((err: any) => {
      console.error('[LeadResearcher] Background research failed:', err);
      aiOrchestrator.failJob(job.id, err?.message || 'Research failed').catch(() => {});
    });

    return { jobId: job.id };
  }

  /**
   * Execute lead research job (internal - uses existing job ID)
   */
  private async research(jobId: string, input: LeadResearchInput): Promise<LeadResearchOutput> {
    const { userId, leadId, businessName, website, industry } = input;
    console.log('[LeadResearcher] Running research for:', businessName);

    try {
      // Step 1: Research company information (25%)
      await aiOrchestrator.updateProgress(jobId, 25, 'Researching company information...');
      const companyInfo = await this.researchCompanyInfo(businessName, website, industry);

      // Step 1b: Enrich with Clearbit (tech stack, funding, phone, social) (30%)
      const domain = companyInfo.website ? this.extractDomain(companyInfo.website) : (website ? this.extractDomain(website) : '');
      let clearbitData: { techStack?: string[]; funding?: any; phone?: string; socialProfiles?: any } = {};
      if (domain) {
        await aiOrchestrator.updateProgress(jobId, 30, 'Fetching company data from Clearbit...');
        clearbitData = await this.fetchClearbitCompany(domain);
        // BuiltWith fallback when Clearbit has no tech stack
        if ((!clearbitData.techStack || clearbitData.techStack.length === 0)) {
          const builtWithTech = await this.fetchBuiltWithTech(domain);
          if (builtWithTech?.length) clearbitData.techStack = builtWithTech;
        }
      }

      // Step 2: Find key decision makers (50%)
      await aiOrchestrator.updateProgress(jobId, 50, 'Finding key decision makers...');
      let keyPeople = await this.findKeyPeople(businessName, companyInfo.website);
      // Enrich key people with Apollo (LinkedIn, phone, alternative emails) when available
      if (domain && keyPeople.length > 0) {
        keyPeople = await this.enrichKeyPeopleWithApollo(keyPeople, domain);
      }

      // Step 3: Gather recent news - real search via Apify (75%)
      await aiOrchestrator.updateProgress(jobId, 75, 'Gathering recent company news...');
      const recentNews = await this.findRecentNews(businessName);

      // Step 3b: Intent/buying signals - hiring, job postings (77%)
      await aiOrchestrator.updateProgress(jobId, 77, 'Checking intent signals...');
      const intentSignals = await this.findIntentSignals(businessName, domain);

      // Step 4: Analyze and generate recommendations (90%)
      await aiOrchestrator.updateProgress(jobId, 90, 'Analyzing data and generating insights...');
      const analysis = await this.analyzeAndRecommend({
        businessName,
        companyInfo,
        keyPeople,
        recentNews,
        clearbitData,
        intentSignals
      });

      // Prepare enriched data (merge Clearbit tech, funding, phone)
      const contactInfo = {
        ...analysis.contactInfo,
        phone: analysis.contactInfo?.phone || clearbitData.phone,
        socialMedia: {
          ...analysis.contactInfo?.socialMedia,
          ...(clearbitData.socialProfiles || {})
        }
      };
      const enrichedData = {
        companyInfo: companyInfo,
        businessMetrics: analysis.businessMetrics,
        techStack: clearbitData.techStack,
        funding: clearbitData.funding,
        keyPeople: keyPeople,
        recentNews: recentNews,
        intentSignals,
        contactInfo,
        recommendedApproach: analysis.recommendedApproach,
        leadScore: analysis.leadScore
      };

      // Update lead in database ONLY if leadId was provided
      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            enrichedData: enrichedData,
            lastEnrichedAt: new Date(),
            leadScore: analysis.leadScore,
            nextAction: analysis.nextAction,
            validationScore: analysis.validationScore
          }
        });
      }

      await aiOrchestrator.updateProgress(jobId, 100, 'Research completed successfully');

      const output: LeadResearchOutput = {
        leadId,
        enrichedData
      };

      await aiOrchestrator.completeJob(jobId, output);

      return output;

    } catch (error: any) {
      await aiOrchestrator.failJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * Execute lead research job (blocking - for backward compatibility)
   * Prefer startResearchAsync for API to avoid timeout.
   */
  async researchBlocking(input: LeadResearchInput): Promise<LeadResearchOutput> {
    const job = await aiOrchestrator.createJob({
      userId: input.userId,
      employeeType: AIEmployeeType.LEAD_RESEARCHER,
      jobType: 'lead_enrichment',
      input: { leadId: input.leadId, businessName: input.businessName, website: input.website, industry: input.industry },
      estimatedTime: 180
    });
    await aiOrchestrator.startJob(job.id);
    return this.research(job.id, input);
  }

  private extractDomain(website: string): string {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return website.replace('www.', '').split('/')[0];
    }
  }

  /**
   * Fetch tech stack from BuiltWith (fallback when Clearbit has none)
   */
  private async fetchBuiltWithTech(domain: string): Promise<string[]> {
    const apiKey = await getBuiltWithApiKey();
    if (!apiKey) return [];
    try {
      const url = `https://api.builtwith.com/free1/api.json?KEY=${encodeURIComponent(apiKey)}&LOOKUP=${encodeURIComponent(domain)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const techs: string[] = [];
      const groups = data.groups || data.Groups || [];
      for (const g of groups) {
        const gName = g.name || g.Name;
        if (gName) techs.push(gName);
        const cats = g.categories || g.Categories || [];
        for (const c of cats) {
          const cName = c.name || c.Name;
          if (cName) techs.push(cName);
        }
      }
      return techs.slice(0, 20);
    } catch (e: any) {
      console.log('[LeadResearcher] BuiltWith error:', e?.message);
      return [];
    }
  }

  /**
   * Enrich key people with Apollo (LinkedIn, phone, alternative emails)
   */
  private async enrichKeyPeopleWithApollo(
    keyPeople: Array<{ name: string; title: string; email?: string; phone?: string; linkedIn?: string; emailAlternatives?: string[]; confidence?: number; source?: string }>,
    domain: string
  ): Promise<typeof keyPeople> {
    const apiKey = await getApolloApiKey();
    if (!apiKey) return keyPeople;
    try {
      const res = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          q_organization_domains: [domain],
          per_page: 25,
        }),
      });
      if (!res.ok) return keyPeople;
      const data = await res.json();
      const apolloPeople = (data.people || []) as Array<{
        name?: string;
        title?: string;
        email?: string;
        phone_numbers?: Array<{ raw_number?: string; sanitized_number?: string }>;
        linkedin_url?: string;
        linkedin?: string;
      }>;
      const enriched = keyPeople.map((p) => {
        const match = apolloPeople.find((a) => {
          const aName = (a.name || '').toLowerCase();
          const pName = p.name.toLowerCase();
          return aName.includes(pName.split(' ')[0]) || pName.includes((a.name || '').split(' ')[0]);
        });
        if (!match) return p;
        const out = { ...p };
        const linkedin = match.linkedin_url || match.linkedin;
        if (linkedin && !out.linkedIn) {
          out.linkedIn = linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`;
        }
        const phone = match.phone_numbers?.[0]?.sanitized_number || match.phone_numbers?.[0]?.raw_number;
        if (phone && !out.phone) out.phone = phone;
        if (match.email && !out.email) out.email = match.email;
        return out;
      });
      return enriched;
    } catch (e: any) {
      console.log('[LeadResearcher] Apollo enrichment error:', e?.message);
      return keyPeople;
    }
  }

  /**
   * Find intent/buying signals - hiring, job postings, careers page
   */
  private async findIntentSignals(businessName: string, domain?: string): Promise<{
    hiring?: boolean;
    jobPostings?: string[];
    careersPage?: string;
  }> {
    const apifyKey = process.env.APIFY_API_KEY || '';
    if (!apifyKey) return {};
    try {
      const query = `${businessName} careers jobs hiring ${domain || ''}`.trim();
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: query,
            maxPagesPerQuery: 1,
            resultsPerPage: 8,
          }),
        }
      );
      if (!res.ok) return {};
      const results = (await res.json()) as Array<{ title?: string; url?: string; description?: string }>;
      const jobPostings: string[] = [];
      let careersPage: string | undefined;
      const careersKeywords = ['careers', 'jobs', 'hiring', 'join us', 'work with us', 'employment'];
      for (const r of results || []) {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const url = r.url || '';
        const text = `${title} ${desc}`;
        if (careersKeywords.some((k) => text.includes(k))) {
          if (url && (url.includes('/careers') || url.includes('/jobs') || url.includes('/hiring'))) {
            careersPage = careersPage || url;
          }
          if (title && !jobPostings.includes(r.title!)) jobPostings.push(r.title!);
        }
      }
      return {
        hiring: jobPostings.length > 0 || !!careersPage,
        jobPostings: jobPostings.slice(0, 5),
        careersPage,
      };
    } catch (e: any) {
      console.log('[LeadResearcher] Intent signals error:', e?.message);
      return {};
    }
  }

  /**
   * Fetch company data from Clearbit (tech stack, funding, phone, social)
   */
  private async fetchClearbitCompany(domain: string): Promise<{
    techStack?: string[];
    funding?: { amount?: string; stage?: string; investors?: string[] };
    phone?: string;
    socialProfiles?: { linkedin?: string; twitter?: string; facebook?: string };
  }> {
    const apiKey = await getClearbitApiKey();
    if (!apiKey) {
      console.log('[LeadResearcher] Clearbit API key not configured');
      return {};
    }
    try {
      const res = await fetch(
        `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!res.ok) return {};
      const data = await res.json();
      const result: any = {};
      if (data.tech && Array.isArray(data.tech)) {
        result.techStack = data.tech.slice(0, 15);
      }
      const phone = data.phone || (data.phoneNumbers && Array.isArray(data.phoneNumbers) ? data.phoneNumbers[0] : null);
      if (phone) result.phone = phone;
      if (data.metrics?.raised) {
        result.funding = { amount: String(data.metrics.raised), stage: data.metrics?.stage };
      }
      const sp: any = {};
      if (data.twitter?.handle) sp.twitter = data.twitter.handle.startsWith('http') ? data.twitter.handle : `https://twitter.com/${data.twitter.handle}`;
      if (data.linkedin?.handle) sp.linkedin = data.linkedin.handle.startsWith('http') ? data.linkedin.handle : `https://linkedin.com/company/${data.linkedin.handle}`;
      if (data.facebook?.handle) sp.facebook = data.facebook.handle.startsWith('http') ? data.facebook.handle : `https://facebook.com/${data.facebook.handle}`;
      if (Object.keys(sp).length > 0) result.socialProfiles = sp;
      if (Object.keys(result).length > 0) {
        console.log('[LeadResearcher] Clearbit data:', Object.keys(result).join(', '));
      }
      return result;
    } catch (e: any) {
      console.log('[LeadResearcher] Clearbit error:', e?.message);
      return {};
    }
  }

  /**
   * Research company information
   */
  private async researchCompanyInfo(
    businessName: string, 
    website?: string,
    industry?: string
  ) {
    try {
      const searchQuery = website 
        ? `${businessName} ${website} company information`
        : `${businessName} company information ${industry || ''}`;

      // Use LLM to research company
      const prompt = `Research the following company and provide detailed information:

Company Name: ${businessName}
${website ? `Website: ${website}` : ''}
${industry ? `Industry: ${industry}` : ''}

Please provide:
1. Company description (2-3 sentences)
2. Industry/sector
3. Founding year (if available)
4. Headquarters location
5. Company website (if not provided)

Provide the response in JSON format:
{
  "name": "...",
  "website": "...",
  "description": "...",
  "industry": "...",
  "foundedYear": "...",
  "headquarters": "..."
}`;

      const response = await this.callLLM(prompt);
      const companyInfo = this.parseJSONResponse(response);

      return companyInfo;
    } catch (error: any) {
      console.error('[LeadResearcher] Error researching company info:', error.message);
      return {
        name: businessName,
        website: website,
        description: `Research failed: ${error.message}`,
        industry: industry || 'Unknown',
        foundedYear: 'Unknown',
        headquarters: 'Unknown',
        _error: error.message
      };
    }
  }

  /**
   * Find key decision makers using Hunter.io API for real verified data
   */
  private async findKeyPeople(businessName: string, website?: string) {
    try {
      // Extract domain from website
      let domain = '';
      if (website) {
        try {
          const url = website.startsWith('http') ? website : `https://${website}`;
          domain = new URL(url).hostname.replace('www.', '');
        } catch {
          domain = website.replace('www.', '').split('/')[0];
        }
      } else {
        // Try to infer domain from business name
        domain = businessName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      }

      console.log('[LeadResearcher] Searching Hunter.io for domain:', domain);

      // Try Hunter.io domain search for real verified contacts
      const hunterKey = await getHunterApiKey();
      if (hunterKey) {
        try {
          const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=10`;
          const response = await fetch(hunterUrl);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[LeadResearcher] Hunter.io response:', JSON.stringify(data.data?.emails?.length || 0), 'contacts found');
            
            if (data.data?.emails?.length > 0) {
              // Filter for executives and decision makers
              const executives = data.data.emails
                .filter((e: HunterPerson) => {
                  const pos = (e.position || '').toLowerCase();
                  return pos.includes('ceo') || pos.includes('cto') || pos.includes('cfo') || 
                         pos.includes('founder') || pos.includes('president') || pos.includes('director') ||
                         pos.includes('chief') || pos.includes('vp') || pos.includes('vice president') ||
                         pos.includes('head') || pos.includes('manager') || pos.includes('owner');
                })
                .slice(0, 5)
                .map((e: HunterPerson) => ({
                  name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown',
                  title: e.position || 'Contact',
                  email: e.email,
                  linkedIn: e.linkedin || null,
                  confidence: e.confidence,
                  source: 'Hunter.io (Verified)'
                }));

              if (executives.length > 0) {
                console.log('[LeadResearcher] Found', executives.length, 'verified executives from Hunter.io');
                return executives;
              }

              // If no executives found, return top contacts with emails
              const topContacts = data.data.emails.slice(0, 5).map((e: HunterPerson) => ({
                name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown',
                title: e.position || 'Contact',
                email: e.email,
                linkedIn: e.linkedin || null,
                confidence: e.confidence,
                source: 'Hunter.io (Verified)'
              }));
              
              console.log('[LeadResearcher] Returning', topContacts.length, 'contacts from Hunter.io');
              return topContacts;
            }
          } else {
            console.log('[LeadResearcher] Hunter.io API error:', response.status);
          }
        } catch (hunterError) {
          console.error('[LeadResearcher] Hunter.io API error:', hunterError);
        }
      } else {
        console.log('[LeadResearcher] Hunter.io API key not configured');
      }

      // 2nd Priority: Apify Google Search for REAL-TIME executive data
      const apifyKey = process.env.APIFY_API_KEY || '';
      console.log('[LeadResearcher] Trying Apify Google Search for real-time executive data...');
      
      try {
        // Use Google Search to find current executives
        const searchQuery = `${businessName} CEO CFO CTO executives leadership team 2025 2026`;
        const apifyRes = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=' + apifyKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: searchQuery,
            maxPagesPerQuery: 1,
            resultsPerPage: 10,
            mobileResults: false,
            languageCode: 'en',
            countryCode: 'us'
          })
        });
        
        if (apifyRes.ok) {
          const searchResults = await apifyRes.json();
          console.log(`[LeadResearcher] Apify Google Search returned ${searchResults?.length || 0} results`);
          
          if (Array.isArray(searchResults) && searchResults.length > 0) {
            // Extract text from search results to find executive names
            const searchText = searchResults.map((r: any) => 
              `${r.title || ''} ${r.description || ''}`
            ).join(' ');
            
            // Use LLM to parse executive names from search results
            const parsePrompt = `Extract CURRENT executive names and titles from these Google search results about ${businessName}. 
Only include people who CURRENTLY work at the company based on the search results.
Search results: ${searchText.substring(0, 3000)}

Return JSON array: [{"name": "Full Name", "title": "Current Title"}]
Return ONLY valid JSON, max 5 people.`;

            const parsedResponse = await this.callLLM(parsePrompt);
            const parsedPeople = this.parseJSONResponse(parsedResponse);
            
            if (Array.isArray(parsedPeople) && parsedPeople.length > 0) {
              console.log(`[LeadResearcher] Found ${parsedPeople.length} executives from Google Search`);
              const apifyPeople: any[] = [];
              
              for (const p of parsedPeople.slice(0, 5)) {
                if (!p.name) continue;
                const person: any = {
                  name: p.name,
                  title: p.title || 'Executive',
                  linkedIn: null,
                  email: null as string | null,
                  confidence: 80,
                  source: '🔍 Google Search (Real-Time 2026)'
                };
                
                const nameParts = person.name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts[nameParts.length - 1];
                
                // Try Hunter.io email finder
                if (hunterKey && domain) {
                  try {
                    const finderUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${hunterKey}`;
                    const finderRes = await fetch(finderUrl);
                    if (finderRes.ok) {
                      const finderData = await finderRes.json();
                      if (finderData.data?.email) {
                        person.email = finderData.data.email;
                        person.confidence = finderData.data.score || 80;
                        person.source = '🔍 Google + Hunter.io (Verified)';
                      }
                    }
                  } catch (e) { /* continue */ }
                }
                
                // Email pattern fallback
                if (!person.email && domain) {
                  const patterns = this.generateEmailPatterns(firstName, lastName, domain);
                  person.email = patterns[0];
                  person.emailAlternatives = patterns.slice(1);
                }
                
                apifyPeople.push(person);
              }
              
              if (apifyPeople.length > 0) {
                return apifyPeople;
              }
            }
          }
        } else {
          console.log('[LeadResearcher] Apify Google Search failed:', await apifyRes.text());
        }
      } catch (e) {
        console.log('[LeadResearcher] Apify Google Search error:', e);
      }

      // 3rd Priority: AI research + email pattern verification (fallback)
      console.log('[LeadResearcher] Falling back to AI research...');
      
      const prompt = `Research and identify REAL key decision makers at ${businessName}${website ? ` (${website})` : ''}.
IMPORTANT: Only provide names of people who are actually confirmed to work at this company from public sources like LinkedIn, company websites, news articles.
If you cannot find real information, return an empty array.

Provide the response in JSON format:
[{"name": "First Last", "title": "Job Title"}]
Limit to 5 people maximum.`;

      const llmResponse = await this.callLLM(prompt);
      const aiPeople = this.parseJSONResponse(llmResponse);
      
      if (!Array.isArray(aiPeople) || aiPeople.length === 0) {
        return [];
      }

      const verifiedPeople = [];
      for (const person of aiPeople.slice(0, 5)) {
        if (!person.name) continue;
        
        const nameParts = person.name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        
        // Try Hunter.io email finder
        if (hunterKey && domain) {
          try {
            const finderUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${hunterKey}`;
            const finderRes = await fetch(finderUrl);
            
            if (finderRes.ok) {
              const finderData = await finderRes.json();
              if (finderData.data?.email) {
                verifiedPeople.push({
                  name: person.name,
                  title: person.title || 'Contact',
                  email: finderData.data.email,
                  confidence: finderData.data.score || 50,
                  linkedIn: person.linkedIn || null,
                  source: '✅ Hunter.io Email Finder (Verified)'
                });
                continue;
              }
            }
          } catch (e) {
            console.log('[LeadResearcher] Email finder failed for', person.name);
          }
        }
        
        // 4th Priority: Email pattern generation
        const emailPatterns = this.generateEmailPatterns(firstName, lastName, domain);
        verifiedPeople.push({
          name: person.name,
          title: person.title || 'Contact',
          email: emailPatterns[0],
          emailAlternatives: emailPatterns.slice(1),
          confidence: 30,
          linkedIn: person.linkedIn || null,
          source: '⚠️ Email Pattern (Unverified)'
        });
      }
      
      return verifiedPeople;
    } catch (error) {
      console.error('Error finding key people:', error);
      return [];
    }
  }

  /**
   * Generate common email patterns for a domain
   */
  private generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
    const f = firstName.toLowerCase();
    const l = lastName.toLowerCase();
    const fi = f.charAt(0);
    const li = l.charAt(0);
    
    return [
      `${f}.${l}@${domain}`,      // john.doe@company.com
      `${f}${l}@${domain}`,        // johndoe@company.com
      `${fi}${l}@${domain}`,       // jdoe@company.com
      `${f}_${l}@${domain}`,       // john_doe@company.com
      `${f}@${domain}`,            // john@company.com
      `${l}.${f}@${domain}`,       // doe.john@company.com
    ];
  }

  /**
   * Find recent company news - real search via Apify Google News, fallback to LLM
   */
  private async findRecentNews(businessName: string) {
    const apifyKey = process.env.APIFY_API_KEY || '';
    if (apifyKey) {
      try {
        const res = await fetch(
          `https://api.apify.com/v2/acts/easyapi~google-news-scraper/run-sync-get-dataset-items?token=${apifyKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `${businessName} company news`,
              maxItems: 5
            })
          }
        );
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            const news = items.map((r: any) => ({
              title: r.title || r.name || '',
              date: r.publishedDate || r.date || r.publishDate,
              source: r.source || r.publisher?.name,
              url: r.url || r.link
            })).filter((n: any) => n.title);
            if (news.length > 0) {
              console.log('[LeadResearcher] Apify Google News:', news.length, 'articles');
              return news;
            }
          }
        }
      } catch (e: any) {
        console.log('[LeadResearcher] Apify news error:', e?.message);
      }
    }

    // Fallback: LLM-generated news
    try {
      const prompt = `Find recent news and announcements about ${businessName} from the past 6 months.

Provide the response in JSON format:
[
  {
    "title": "...",
    "date": "...",
    "source": "...",
    "url": "..."
  }
]

Limit to 3-5 most relevant news items.`;

      const response = await this.callLLM(prompt);
      const recentNews = this.parseJSONResponse(response);
      return Array.isArray(recentNews) ? recentNews : [];
    } catch (error) {
      console.error('Error finding recent news:', error);
      return [];
    }
  }

  /**
   * Analyze collected data and generate recommendations
   */
  private async analyzeAndRecommend(data: any) {
    try {
      const prompt = `Based on the following company research data, provide a comprehensive analysis:

Company: ${data.businessName}
Company Info: ${JSON.stringify(data.companyInfo)}
Key People: ${JSON.stringify(data.keyPeople)}
Recent News: ${JSON.stringify(data.recentNews)}
${data.clearbitData?.techStack ? `Tech Stack: ${JSON.stringify(data.clearbitData.techStack)}` : ''}
${data.clearbitData?.funding ? `Funding: ${JSON.stringify(data.clearbitData.funding)}` : ''}
${data.intentSignals?.hiring ? `Intent Signals: Company is hiring (${JSON.stringify(data.intentSignals)})` : ''}

Please provide:
1. Estimated annual revenue (e.g., "$1M-$5M", "$10M-$50M", "$100M+")
2. Estimated employee count
3. Company size classification (Startup, Small Business, Mid-Market, Enterprise)
4. Contact information (email, phone if available)
5. Social media profiles
6. Recommended sales approach (2-3 sentences on how to best engage this lead)
7. Lead score (0-100 based on fit and opportunity)
8. Suggested next action
9. Data validation score (0-100 based on data quality)

Provide the response in JSON format:
{
  "businessMetrics": {
    "estimatedRevenue": "...",
    "employeeCount": "...",
    "companySize": "..."
  },
  "contactInfo": {
    "email": "...",
    "phone": "...",
    "socialMedia": {
      "linkedin": "...",
      "twitter": "...",
      "facebook": "..."
    }
  },
  "recommendedApproach": "...",
  "leadScore": 85,
  "nextAction": "email",
  "validationScore": 90
}`;

      const response = await this.callLLM(prompt);
      const analysis = this.parseJSONResponse(response);

      return {
        businessMetrics: analysis.businessMetrics || {},
        contactInfo: analysis.contactInfo || {},
        recommendedApproach: analysis.recommendedApproach || 'Standard outreach approach',
        leadScore: analysis.leadScore || 50,
        nextAction: analysis.nextAction || 'email',
        validationScore: analysis.validationScore || 70
      };
    } catch (error) {
      console.error('Error analyzing data:', error);
      return {
        businessMetrics: {},
        contactInfo: {},
        recommendedApproach: 'Standard outreach approach',
        leadScore: 50,
        nextAction: 'email',
        validationScore: 50
      };
    }
  }

  /**
   * Call LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[LeadResearcher] OPENAI_API_KEY is not set!');
      throw new Error('LLM API key not configured');
    }

    console.log('[LeadResearcher] Making LLM call...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant. Provide accurate, well-structured information in JSON format only. No markdown code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[LeadResearcher] LLM API error:', response.status, errText);
      throw new Error(`LLM API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    console.log('[LeadResearcher] LLM response received, length:', content?.length || 0);
    
    if (!content) {
      throw new Error('Empty response from LLM');
    }
    
    return content;
  }

  /**
   * Parse JSON response from LLM
   */
  private parseJSONResponse(response: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\n([\s\S]+?)\n```/) || 
                        response.match(/```\n([\s\S]+?)\n```/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse directly
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return {};
    }
  }

  /**
   * Get lead's user ID
   */
  private async getLeadUserId(leadId: string): Promise<string> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { userId: true }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    return lead.userId;
  }
}

// Export singleton instance
export const leadResearcher = new LeadResearcher();
