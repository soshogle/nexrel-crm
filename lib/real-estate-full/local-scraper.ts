/**
 * Local Puppeteer-based scraper for contact extraction & listing scraping
 * Runs on server - NO Apify costs!
 * Uses system Chrome instead of downloading browsers
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';

let browserInstance: Browser | null = null;

// Find system Chrome executable
function getChromePath(): string {
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/local/bin/chrome',
    '/usr/local/bin/chromium',
    process.env.CHROME_PATH || ''
  ];
  
  const fs = require('fs');
  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return '/usr/bin/google-chrome'; // Default fallback
}

// DNCL (Do Not Call List) patterns to detect
const DNCL_PATTERNS = [
  'do not call list',
  'dncl',
  'national do not call',
  'not solicit them for the purpose of getting a listing',
  'respecting their choice to sell without an agent',
  'are you a real estate agent',
  'ne pas les solliciter',
  'liste nationale de numéros de télécommunication exclus',
  'sans courtier',
  'no real estate agents',
  'no realtors please',
  'agents do not call',
  'no agents'
];

// DuProprio service numbers to filter out
const DUPROPRIO_SERVICE_NUMBERS = ['8663877677', '18663877677', '1-866-387-7677'];

export interface ContactExtractionResult {
  success: boolean;
  phone: string | null;
  phone2: string | null;
  sellerName: string | null;
  isDoNotCall: boolean;
  doNotCallReason: string | null;
  error?: string;
}

/**
 * Get or create browser instance (reuse for performance)
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    const chromePath = getChromePath();
    console.log(`🌐 Launching Chrome from: ${chromePath}`);
    browserInstance = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
        '--no-zygote'
      ]
    });
  }
  return browserInstance;
}

/**
 * Extract contact from DuProprio listing
 */
export async function extractDuProprioContact(url: string): Promise<ContactExtractionResult> {
  let page: Page | null = null;
  
  try {
    console.log(`📞 [Local] Extracting contact from: ${url}`);
    
    const browser = await getBrowser();
    page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);
    
    // Get page text for DNCL detection
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    // Check for DNCL indicators
    for (const pattern of DNCL_PATTERNS) {
      if (pageText.includes(pattern)) {
        console.log(`⛔ [Local] DNCL detected: "${pattern}"`);
        return {
          success: false,
          phone: null,
          phone2: null,
          sellerName: null,
          isDoNotCall: true,
          doNotCallReason: 'Seller registered with National Do Not Call List (DNCL) - Do not contact for listing agreements'
        };
      }
    }
    
    // Handle cookie consent
    try {
      const cookieBtn = await page.$('button');
      if (cookieBtn) {
        const text = await page.evaluate(el => el.textContent || '', cookieBtn);
        if (text.includes('Accept') || text.includes('Allow')) {
          await cookieBtn.click();
          await delay(500);
        }
      }
    } catch (e) {}
    
    // Find and click phone reveal button (contains "XXX" masked pattern)
    console.log('🔍 [Local] Looking for phone reveal button...');
    const buttons = await page.$$('button');
    
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent || '', btn);
      if (text && (text.includes('XXX') || text.includes('Show') || text.includes('Afficher'))) {
        console.log(`🖱️ [Local] Clicking button: "${text.substring(0, 40)}..."`);
        await btn.click();
        await delay(2500);
        break;
      }
    }
    
    // Wait for phone reveal
    await delay(1500);
    
    // Extract phone from tel: links
    const telLinks = await page.$$eval('a[href^="tel:"]', (links) => 
      links.map(a => ({
        href: (a.getAttribute('href') || '').replace('tel:', '').trim(),
        text: a.textContent || ''
      }))
    );
    
    console.log(`📱 [Local] Found ${telLinks.length} tel: links`);
    
    let phone: string | null = null;
    let phone2: string | null = null;
    
    for (const link of telLinks) {
      const digits = link.href.replace(/[^0-9]/g, '');
      
      // Skip DuProprio service numbers
      if (DUPROPRIO_SERVICE_NUMBERS.some(svc => digits.includes(svc))) {
        console.log(`⏭️ [Local] Skipping service number: ${link.href}`);
        continue;
      }
      
      if (digits.length >= 10) {
        if (!phone) {
          phone = link.href;
          console.log(`✅ [Local] Primary phone: ${phone}`);
        } else if (!phone2 && link.href !== phone) {
          phone2 = link.href;
          console.log(`✅ [Local] Secondary phone: ${phone2}`);
        }
      }
    }
    
    // Fallback: search page text for phone patterns
    if (!phone) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const phoneMatches = bodyText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
      
      for (const match of phoneMatches) {
        if (!match.includes('X') && !match.includes('x')) {
          const digits = match.replace(/[^0-9]/g, '');
          if (digits.length >= 10 && !DUPROPRIO_SERVICE_NUMBERS.some(svc => digits.includes(svc))) {
            phone = match;
            console.log(`✅ [Local] Found phone in text: ${phone}`);
            break;
          }
        }
      }
    }
    
    return {
      success: !!phone,
      phone,
      phone2,
      sellerName: null,
      isDoNotCall: false,
      doNotCallReason: null
    };
    
  } catch (error: any) {
    console.error(`❌ [Local] Extraction error: ${error.message}`);
    return {
      success: false,
      phone: null,
      phone2: null,
      sellerName: null,
      isDoNotCall: false,
      doNotCallReason: null,
      error: error.message
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

// Helper delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generic contact extraction for other FSBO sites
 */
export async function extractGenericContact(url: string): Promise<ContactExtractionResult> {
  let page: Page | null = null;
  
  try {
    console.log(`📞 [Local] Generic extraction from: ${url}`);
    
    const browser = await getBrowser();
    page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);
    
    // Check for DNCL
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    for (const pattern of DNCL_PATTERNS) {
      if (pageText.includes(pattern)) {
        return {
          success: false,
          phone: null,
          phone2: null,
          sellerName: null,
          isDoNotCall: true,
          doNotCallReason: 'Seller registered with National Do Not Call List (DNCL)'
        };
      }
    }
    
    // Try clicking reveal buttons
    const buttons = await page.$$('button, a');
    for (const btn of buttons) {
      try {
        const text = await page.evaluate(el => el.textContent || '', btn);
        if (text.match(/show|reveal|call|phone/i)) {
          await btn.click();
          await delay(1000);
          break;
        }
      } catch (e) {}
    }
    
    // Extract from tel: links
    const telLinks = await page.$$eval('a[href^="tel:"]', (links) =>
      links.map(a => (a.getAttribute('href') || '').replace('tel:', '').trim())
    );
    
    let phone = telLinks.find(t => t.replace(/[^0-9]/g, '').length >= 10) || null;
    
    // Fallback: regex search
    if (!phone) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const match = bodyText.match(/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (match && !match[0].includes('X')) {
        phone = match[0];
      }
    }
    
    return {
      success: !!phone,
      phone,
      phone2: null,
      sellerName: null,
      isDoNotCall: false,
      doNotCallReason: null
    };
    
  } catch (error: any) {
    return {
      success: false,
      phone: null,
      phone2: null,
      sellerName: null,
      isDoNotCall: false,
      doNotCallReason: null,
      error: error.message
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Main extraction function - routes to correct handler
 */
export async function extractContact(url: string): Promise<ContactExtractionResult> {
  if (url.includes('duproprio.com')) {
    return extractDuProprioContact(url);
  }
  return extractGenericContact(url);
}

/**
 * Cleanup browser on shutdown
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// =============================================================================
// LISTING SCRAPER - Scrape DuProprio listings directly (NO Apify costs!)
// =============================================================================

export interface ScrapedListing {
  title: string;
  price: number | null;
  address: string;
  city: string;
  province: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  propertyType: string;
  sourceUrl: string;
  photos: string[];
  description: string;
  isDoNotCall: boolean;
}

/**
 * Scrape DuProprio search results page
 */
export async function scrapeDuProprioListings(
  location: string,
  options: {
    minPrice?: number;
    maxPrice?: number;
    maxListings?: number;
  } = {}
): Promise<ScrapedListing[]> {
  const { minPrice, maxPrice, maxListings = 25 } = options;
  let page: Page | null = null;
  const listings: ScrapedListing[] = [];
  
  try {
    console.log(`🏠 [Local] Scraping DuProprio listings for: ${location}`);
    
    const browser = await getBrowser();
    page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Build search URL
    let searchUrl = `https://duproprio.com/en/search/list?search=true&regions%5B0%5D=${encodeURIComponent(location)}&is_for_sale=1`;
    if (minPrice) searchUrl += `&minPrice=${minPrice}`;
    if (maxPrice) searchUrl += `&maxPrice=${maxPrice}`;
    
    console.log(`🔗 [Local] Search URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 45000 });
    await delay(3000);
    
    // Get listing cards
    const listingCards = await page.$$('.search-results-listings-list__item, .listing-card, [data-listing-id]');
    console.log(`📋 [Local] Found ${listingCards.length} listing cards`);
    
    // Extract listing URLs
    const listingUrls: string[] = [];
    for (const card of listingCards) {
      if (listingUrls.length >= maxListings) break;
      
      try {
        const link = await card.$('a[href*="/en/"]');
        if (link) {
          const href = await page.evaluate(el => el.getAttribute('href'), link);
          if (href && href.includes('duproprio.com')) {
            listingUrls.push(href);
          } else if (href && href.startsWith('/')) {
            listingUrls.push(`https://duproprio.com${href}`);
          }
        }
      } catch (e) {}
    }
    
    // Also try extracting from href attributes directly
    if (listingUrls.length === 0) {
      const allLinks = await page.$$eval('a[href*="-for-sale-"]', links => 
        links.map(a => a.getAttribute('href')).filter(h => h && h.includes('hab-'))
      );
      for (const href of allLinks) {
        if (listingUrls.length >= maxListings) break;
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://duproprio.com${href}`;
          if (!listingUrls.includes(fullUrl)) {
            listingUrls.push(fullUrl);
          }
        }
      }
    }
    
    console.log(`🔗 [Local] Found ${listingUrls.length} listing URLs`);
    
    // Scrape each listing page
    for (const listingUrl of listingUrls.slice(0, maxListings)) {
      try {
        const listing = await scrapeSingleDuProprioListing(page, listingUrl);
        if (listing) {
          listings.push(listing);
          console.log(`✅ [Local] Scraped: ${listing.address} - $${listing.price}`);
        }
      } catch (e: any) {
        console.error(`❌ [Local] Failed to scrape ${listingUrl}: ${e.message}`);
      }
      
      // Small delay between requests to be polite
      await delay(1000);
    }
    
    console.log(`✅ [Local] Total listings scraped: ${listings.length}`);
    return listings;
    
  } catch (error: any) {
    console.error(`❌ [Local] Scraping error: ${error.message}`);
    return listings;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Scrape a single DuProprio listing page
 */
async function scrapeSingleDuProprioListing(page: Page, url: string): Promise<ScrapedListing | null> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(1500);
  
  // Check for DNCL
  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  const isDoNotCall = DNCL_PATTERNS.some(pattern => pageText.includes(pattern));
  
  // Extract data
  const data = await page.evaluate(() => {
    const getText = (selector: string): string => {
      const el = document.querySelector(selector);
      return el?.textContent?.trim() || '';
    };
    
    const getNumber = (text: string): number | null => {
      const match = text.replace(/[^0-9.]/g, '');
      return match ? parseFloat(match) : null;
    };
    
    // Price
    const priceText = getText('.listing-price, [class*="price"], .gtm-listing-price');
    const price = priceText ? parseFloat(priceText.replace(/[^0-9]/g, '')) : null;
    
    // Address
    const address = getText('.listing-address, [class*="address"], h1') || 
                   getText('.listing-location__address');
    
    // City from URL or page
    const cityEl = document.querySelector('.listing-location__city, [class*="city"]');
    const city = cityEl?.textContent?.trim() || '';
    
    // Property details
    const bedsText = document.body.innerText.match(/(\d+)\s*(?:bed|chambre)/i);
    const bathsText = document.body.innerText.match(/(\d+)\s*(?:bath|salle)/i);
    const sqftText = document.body.innerText.match(/([\d,]+)\s*(?:sq\.?\s*ft|pi2|pc)/i);
    
    // Photos
    const photos: string[] = [];
    document.querySelectorAll('img[src*="duproprio"], img[data-src*="duproprio"]').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && src.includes('photo') && !photos.includes(src)) {
        photos.push(src);
      }
    });
    
    // Description
    const description = getText('.listing-description, [class*="description"]').substring(0, 500);
    
    // Property type from title or breadcrumb
    const title = getText('h1, .listing-title');
    let propertyType = 'House';
    if (title.toLowerCase().includes('condo')) propertyType = 'Condo';
    else if (title.toLowerCase().includes('duplex')) propertyType = 'Duplex';
    else if (title.toLowerCase().includes('triplex')) propertyType = 'Triplex';
    else if (title.toLowerCase().includes('semi')) propertyType = 'Semi-Detached';
    else if (title.toLowerCase().includes('townhouse')) propertyType = 'Townhouse';
    
    return {
      title,
      price,
      address,
      city,
      beds: bedsText ? parseInt(bedsText[1]) : null,
      baths: bathsText ? parseInt(bathsText[1]) : null,
      sqft: sqftText ? parseInt(sqftText[1].replace(/,/g, '')) : null,
      propertyType,
      photos: photos.slice(0, 5),
      description
    };
  });
  
  // Extract province from URL
  const urlParts = url.split('/');
  const province = 'Quebec'; // DuProprio is Quebec-focused
  
  return {
    ...data,
    province,
    sourceUrl: url,
    isDoNotCall
  };
}
