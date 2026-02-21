/**
 * Brand Scraper Service
 *
 * Orchestrates external scraping to collect what the public says about a brand:
 *   Layer 1 – Review platform scrapers (Yelp, Google, Trustpilot, Facebook, BBB)
 *             via Apify actors.
 *   Layer 2 – Web mention scanner (SerpAPI → page scrape) for Reddit, forums,
 *             blogs, news articles.
 *
 * All results are sentiment-analyzed via OpenAI and stored as BrandMention rows
 * (and optionally imported into the Review table).
 */

import { prisma } from '@/lib/db';
import { analyzeReviewSentiment, processIncomingReview } from './review-intelligence-service';

const APIFY_BASE = 'https://api.apify.com/v2';

// ── Apify actors for each review platform ──────────────────────────────────
// Apify actor IDs use tilde (username~actor-name), not slash
const REVIEW_ACTORS: Record<string, { actorId: string; buildInput: (biz: string, loc?: string) => Record<string, any> }> = {
  GOOGLE: {
    actorId: 'compass~google-maps-reviews-scraper',
    buildInput: (biz, loc) => ({
      searchQueries: [loc ? `${biz} ${loc}` : biz],
      maxReviews: 100,
      language: 'en',
    }),
  },
  YELP: {
    actorId: 'yin~yelp-scraper',
    buildInput: (biz, loc) => ({
      searchTerms: [biz],
      locations: loc ? [loc] : [],
      maxItems: 100,
      includeReviews: true,
    }),
  },
  TRUSTPILOT: {
    actorId: 'trudax~trustpilot-reviews-scraper',
    buildInput: (biz) => ({
      startUrls: [{ url: `https://www.trustpilot.com/search?query=${encodeURIComponent(biz)}` }],
      maxItems: 100,
    }),
  },
  FACEBOOK: {
    actorId: 'apify~facebook-pages-scraper',
    buildInput: (biz) => ({
      startUrls: [{ url: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(biz)}` }],
      maxReviews: 50,
    }),
  },
  BBB: {
    actorId: 'apify~cheerio-scraper',
    buildInput: (biz) => ({
      startUrls: [{ url: `https://www.bbb.org/search?find_text=${encodeURIComponent(biz)}` }],
      pageFunction: `async function pageFunction(context) {
        const { $, request } = context;
        const results = [];
        $('[class*="complaint"], [class*="review"]').each((i, el) => {
          results.push({
            text: $(el).text().trim().slice(0, 2000),
            url: request.url,
          });
        });
        return results;
      }`,
      maxRequestsPerCrawl: 10,
    }),
  },
};

// ── Apify helpers ──────────────────────────────────────────────────────────

function getApifyToken(): string {
  return process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || process.env.APIFY_API_KEY || '';
}

async function runActorAndWait(
  actorId: string,
  input: Record<string, any>,
  timeoutSec = 120,
): Promise<any[]> {
  const token = getApifyToken();
  if (!token) throw new Error('APIFY_API_TOKEN not configured');

  const res = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify start failed: ${await res.text()}`);
  const run = await res.json();
  const runId = run.data.id;
  const datasetId = run.data.defaultDatasetId;

  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`${APIFY_BASE}/acts/${actorId}/runs/${runId}?token=${token}`);
    if (!statusRes.ok) continue;
    const s = await statusRes.json();
    if (s.data.status === 'SUCCEEDED') break;
    if (s.data.status !== 'RUNNING' && s.data.status !== 'READY') {
      throw new Error(`Apify run ended with status: ${s.data.status}`);
    }
  }

  const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=200`);
  if (!itemsRes.ok) return [];
  return await itemsRes.json();
}

// ── SerpAPI web mention search ─────────────────────────────────────────────

interface WebMention {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
}

const SERPAPI_QUERIES = (biz: string) => [
  `"${biz}" reviews`,
  `"${biz}" customer experience`,
  `"${biz}" complaints OR praise`,
  `site:reddit.com "${biz}"`,
];

function classifySource(url: string): string {
  const host = new URL(url).hostname.replace('www.', '');
  if (host.includes('reddit.com')) return 'REDDIT';
  if (host.includes('yelp.com')) return 'YELP';
  if (host.includes('trustpilot.com')) return 'TRUSTPILOT';
  if (host.includes('bbb.org')) return 'BBB';
  if (host.includes('facebook.com')) return 'FACEBOOK';
  if (host.includes('twitter.com') || host.includes('x.com')) return 'TWITTER';
  if (host.includes('instagram.com')) return 'INSTAGRAM';
  if (host.includes('linkedin.com')) return 'LINKEDIN';
  if (host.includes('google.com')) return 'GOOGLE';
  if (host.includes('news') || host.includes('press') || host.includes('bbc') || host.includes('cnn') || host.includes('forbes'))
    return 'NEWS';
  if (host.includes('medium.com') || host.includes('blog') || host.includes('wordpress'))
    return 'BLOG';
  return 'FORUM';
}

async function searchViaGoogleCSE(query: string, apiKey: string, cx: string): Promise<WebMention[]> {
  const params = new URLSearchParams({ q: query, key: apiKey, cx, num: '10' });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((r: any) => ({
    title: r.title || '',
    url: r.link,
    snippet: r.snippet || '',
    source: classifySource(r.link),
    publishedAt: r.pagemap?.metatags?.[0]?.['article:published_time'] || undefined,
  }));
}

async function searchViaSerpAPI(query: string, serpKey: string): Promise<WebMention[]> {
  const params = new URLSearchParams({ q: query, api_key: serpKey, engine: 'google', num: '15', hl: 'en' });
  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.organic_results || []).map((r: any) => ({
    title: r.title || '',
    url: r.link,
    snippet: r.snippet || '',
    source: classifySource(r.link),
    publishedAt: r.date || undefined,
  }));
}

async function searchWebMentions(businessName: string): Promise<WebMention[]> {
  const serpKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  const googleCSEKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_CSE_API_KEY;
  const googleCSECx = process.env.GOOGLE_CUSTOM_SEARCH_CX || process.env.GOOGLE_CSE_CX;

  if (!serpKey && !googleCSEKey) {
    console.warn('[BrandScraper] No SERPAPI_KEY or GOOGLE_CUSTOM_SEARCH_API_KEY configured – skipping web mentions');
    return [];
  }

  const queries = SERPAPI_QUERIES(businessName);
  const allMentions: WebMention[] = [];
  const seenUrls = new Set<string>();

  for (const q of queries) {
    try {
      let results: WebMention[] = [];

      if (googleCSEKey && googleCSECx) {
        results = await searchViaGoogleCSE(q, googleCSEKey, googleCSECx);
      } else if (serpKey) {
        results = await searchViaSerpAPI(q, serpKey);
      }

      for (const r of results) {
        if (!r.url || seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);
        allMentions.push(r);
      }
    } catch (err) {
      console.warn(`[BrandScraper] Web search query failed for "${q}":`, err);
    }
  }

  return allMentions;
}

// ── Page scraper (extracts longer text from a web mention URL) ─────────────

async function scrapePageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Strip tags, keep text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 5000) || null;
  } catch {
    return null;
  }
}

// ── Sentiment analysis for a text snippet (no rating) ──────────────────────

async function analyzeMentionSentiment(text: string): Promise<{
  sentiment: string;
  sentimentScore: number;
  themes: string[];
  summary: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text || text.length < 20) {
    return { sentiment: 'NEUTRAL', sentimentScore: 0, themes: [], summary: '' };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You analyze text mentioning a brand/company for sentiment. Return only valid JSON.',
          },
          {
            role: 'user',
            content: `Analyze this text about a company/brand and return JSON:\n- "sentiment": POSITIVE | NEGATIVE | NEUTRAL | MIXED\n- "sentimentScore": float -1.0 to 1.0\n- "themes": short theme labels array\n- "summary": one-sentence summary\n\nText: "${text.slice(0, 3000)}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error('OpenAI error');
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    return {
      sentiment: parsed.sentiment || 'NEUTRAL',
      sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      summary: parsed.summary || '',
    };
  } catch {
    return { sentiment: 'NEUTRAL', sentimentScore: 0, themes: [], summary: '' };
  }
}

// ── Normalise raw Apify results into BrandMention-shaped data ──────────────

interface NormalizedReview {
  source: string;
  sourceUrl?: string;
  snippet: string;
  authorName?: string;
  rating?: number;
  publishedAt?: Date;
}

function normalizeApifyResults(source: string, items: any[]): NormalizedReview[] {
  const out: NormalizedReview[] = [];

  for (const item of items) {
    const text =
      item.reviewText || item.text || item.review || item.comment ||
      item.reviewBody || item.body || item.content || '';
    if (!text || text.length < 10) continue;

    const rating =
      item.rating || item.stars || item.reviewRating ||
      (item.ratingValue ? Number(item.ratingValue) : undefined);

    const author =
      item.reviewerName || item.author || item.authorName ||
      item.userName || item.user?.name || item.name || undefined;

    const url =
      item.reviewUrl || item.url || item.link || item.reviewLink || undefined;

    let pubDate: Date | undefined;
    const dateStr = item.publishedAt || item.date || item.reviewDate || item.createdAt || item.timestamp;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) pubDate = d;
    }

    out.push({
      source,
      sourceUrl: url,
      snippet: typeof text === 'string' ? text.slice(0, 5000) : String(text).slice(0, 5000),
      authorName: author ? String(author) : undefined,
      rating: typeof rating === 'number' && rating >= 1 && rating <= 5 ? Math.round(rating) : undefined,
      publishedAt: pubDate,
    });
  }

  return out;
}

// ── Main orchestrator ──────────────────────────────────────────────────────

export interface BrandScanOptions {
  userId: string;
  businessName: string;
  location?: string;
  sources?: string[];       // which review platforms to hit (defaults to all available)
  includeWebMentions?: boolean; // SerpAPI web mentions (default true)
  importAsReviews?: boolean;    // also create Review records (default true)
}

export async function runBrandScan(opts: BrandScanOptions): Promise<string> {
  const {
    userId,
    businessName,
    location,
    sources,
    includeWebMentions = true,
    importAsReviews = true,
  } = opts;

  const scan = await prisma.brandScan.create({
    data: {
      userId,
      businessName,
      location,
      sources: sources || Object.keys(REVIEW_ACTORS),
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  // Run asynchronously so the API returns immediately
  _executeScan(scan.id, userId, businessName, location, sources, includeWebMentions, importAsReviews).catch(
    (err) => console.error('[BrandScraper] scan error:', err),
  );

  return scan.id;
}

async function _executeScan(
  scanId: string,
  userId: string,
  businessName: string,
  location: string | undefined,
  sources: string[] | undefined,
  includeWebMentions: boolean,
  importAsReviews: boolean,
) {
  let reviewsFound = 0;
  let mentionsFound = 0;
  const errors: string[] = [];

  // ─── Layer 1: Review platform scrapers ───────────────────────────────
  const platformsToScan = sources || Object.keys(REVIEW_ACTORS);
  const hasApifyToken = !!getApifyToken();

  for (const platform of platformsToScan) {
    const actor = REVIEW_ACTORS[platform];
    if (!actor) continue;
    if (!hasApifyToken) {
      errors.push(`Skipped ${platform}: APIFY_API_TOKEN not configured`);
      continue;
    }

    try {
      console.log(`[BrandScraper] Scraping ${platform} for "${businessName}"...`);
      const rawItems = await runActorAndWait(actor.actorId, actor.buildInput(businessName, location), 180);
      const normalized = normalizeApifyResults(platform, rawItems);

      for (const rev of normalized) {
        const analysis = await analyzeMentionSentiment(rev.snippet);

        await prisma.brandMention.create({
          data: {
            userId,
            scanId,
            source: rev.source,
            sourceUrl: rev.sourceUrl,
            snippet: rev.snippet,
            authorName: rev.authorName,
            rating: rev.rating,
            sentiment: analysis.sentiment,
            sentimentScore: analysis.sentimentScore,
            themes: analysis.themes,
            aiSummary: analysis.summary,
            publishedAt: rev.publishedAt,
          },
        });

        reviewsFound++;

        if (importAsReviews && rev.rating) {
          try {
            const { review } = await processIncomingReview(userId, {
              source: rev.source,
              rating: rev.rating,
              reviewText: rev.snippet,
              reviewerName: rev.authorName,
              reviewUrl: rev.sourceUrl,
            });
            await prisma.brandMention.updateMany({
              where: { scanId, sourceUrl: rev.sourceUrl, snippet: rev.snippet },
              data: { importedAsReviewId: review.id },
            });
          } catch (e: any) {
            console.warn(`[BrandScraper] Failed to import review:`, e.message);
          }
        }
      }
    } catch (err: any) {
      console.warn(`[BrandScraper] ${platform} scrape failed:`, err.message);
      errors.push(`${platform}: ${err.message}`);
    }
  }

  // ─── Layer 2: Web mentions via SerpAPI ───────────────────────────────
  if (includeWebMentions) {
    try {
      console.log(`[BrandScraper] Searching web mentions for "${businessName}"...`);
      const mentions = await searchWebMentions(businessName);

      for (const mention of mentions) {
        let fullText: string | null = null;
        if (['REDDIT', 'FORUM', 'BLOG', 'NEWS'].includes(mention.source)) {
          fullText = await scrapePageText(mention.url);
        }

        const textToAnalyze = fullText || mention.snippet;
        const analysis = await analyzeMentionSentiment(textToAnalyze);

        await prisma.brandMention.create({
          data: {
            userId,
            scanId,
            source: mention.source,
            sourceUrl: mention.url,
            title: mention.title,
            snippet: mention.snippet,
            fullText,
            sentiment: analysis.sentiment,
            sentimentScore: analysis.sentimentScore,
            themes: analysis.themes,
            aiSummary: analysis.summary,
            publishedAt: mention.publishedAt ? new Date(mention.publishedAt) : undefined,
          },
        });

        mentionsFound++;
      }
    } catch (err: any) {
      console.warn('[BrandScraper] Web mentions scan failed:', err.message);
      errors.push(`Web mentions: ${err.message}`);
    }
  }

  // ─── Finalise the scan record ────────────────────────────────────────
  await prisma.brandScan.update({
    where: { id: scanId },
    data: {
      status: errors.length > 0 && reviewsFound + mentionsFound === 0 ? 'FAILED' : 'COMPLETED',
      reviewsFound,
      mentionsFound,
      error: errors.length > 0 ? errors.join('; ') : null,
      completedAt: new Date(),
    },
  });

  console.log(
    `[BrandScraper] Scan ${scanId} complete: ${reviewsFound} reviews, ${mentionsFound} web mentions`,
  );
}

// ── Get scan status ────────────────────────────────────────────────────────

export async function getScanStatus(scanId: string) {
  return prisma.brandScan.findUnique({
    where: { id: scanId },
    include: {
      _count: { select: { mentions: true } },
    },
  });
}

export async function getUserScans(userId: string) {
  return prisma.brandScan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { _count: { select: { mentions: true } } },
  });
}

export async function getUserMentions(
  userId: string,
  opts?: { source?: string; sentiment?: string; limit?: number; scanId?: string },
) {
  return prisma.brandMention.findMany({
    where: {
      userId,
      ...(opts?.source ? { source: opts.source } : {}),
      ...(opts?.sentiment ? { sentiment: opts.sentiment } : {}),
      ...(opts?.scanId ? { scanId: opts.scanId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit || 100,
  });
}
