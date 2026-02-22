/**
 * Google Maps Scraper
 * 
 * Extracts business data from Google Maps search results
 * - Target: Specific industries + locations
 * - Extract: Name, phone, address, website, reviews
 * - Frequency: Daily at 2 AM (off-peak)
 * - Volume: 100-200 leads/day
 */

import { getCrmDb } from '@/lib/dal/db';
import { createDalContext } from '@/lib/context/industry-context';
import { chromium, Browser, Page } from 'playwright';

export interface GoogleMapsSearchQuery {
  query: string; // e.g., "restaurants in New York", "plumbers in Austin"
  maxResults?: number; // Max leads to extract (default: 100)
}

export interface ScrapedBusinessData {
  businessName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  category?: string;
  googlePlaceId?: string;
  rating?: number;
  reviewCount?: number;
  googleMapUrl?: string;
  latitude?: number;
  longitude?: number;
  businessHours?: any;
}

/**
 * Scrape Google Maps for business leads
 */
export async function scrapeGoogleMaps(
  userId: string,
  queries: GoogleMapsSearchQuery[]
): Promise<{
  success: number;
  failed: number;
  duplicates: number;
  total: number;
  leads: string[]; // Lead IDs
}> {
  let browser: Browser | null = null;
  
  const stats = {
    success: 0,
    failed: 0,
    duplicates: 0,
    total: 0,
    leads: [] as string[]
  };
  
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US'
    });
    
    const page = await context.newPage();
    
    // Process each query
    for (const searchQuery of queries) {
      try {
        const businesses = await scrapeQuery(page, searchQuery);
        
        const ctx = createDalContext(userId);
        const db = getCrmDb(ctx);

        // Save to database
        for (const business of businesses) {
          try {
            // Check for duplicate
            const existing = await db.lead.findFirst({
              where: {
                userId,
                OR: [
                  { googlePlaceId: business.googlePlaceId },
                  {
                    AND: [
                      { businessName: business.businessName },
                      { phone: business.phone }
                    ]
                  }
                ]
              }
            });
            
            if (existing) {
              stats.duplicates++;
              continue;
            }
            
            // Create new lead
            const lead = await db.lead.create({
              data: {
                userId,
                businessName: business.businessName,
                phone: business.phone,
                email: undefined, // Will be enriched later
                address: business.address,
                city: business.city,
                state: business.state,
                zipCode: business.zipCode,
                country: business.country || 'US',
                website: business.website,
                businessCategory: business.category,
                googlePlaceId: business.googlePlaceId,
                rating: business.rating,
                source: 'google_maps',
                status: 'NEW',
                enrichedData: {
                  googleMapUrl: business.googleMapUrl,
                  reviewCount: business.reviewCount,
                  latitude: business.latitude,
                  longitude: business.longitude,
                  businessHours: business.businessHours,
                  scrapedAt: new Date().toISOString()
                }
              }
            });
            
            stats.success++;
            stats.leads.push(lead.id);
          } catch (error) {
            console.error('Error saving business:', business.businessName, error);
            stats.failed++;
          }
        }
        
        stats.total += businesses.length;
      } catch (error) {
        console.error('Error scraping query:', searchQuery.query, error);
      }
      
      // Delay between queries to avoid rate limiting
      await page.waitForTimeout(2000 + Math.random() * 3000); // 2-5 seconds
    }
  } catch (error) {
    console.error('Error in Google Maps scraper:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return stats;
}

/**
 * Scrape a single Google Maps search query
 */
async function scrapeQuery(
  page: Page,
  searchQuery: GoogleMapsSearchQuery
): Promise<ScrapedBusinessData[]> {
  const maxResults = searchQuery.maxResults || 100;
  const businesses: ScrapedBusinessData[] = [];
  
  try {
    // Navigate to Google Maps
    const encodedQuery = encodeURIComponent(searchQuery.query);
    const url = `https://www.google.com/maps/search/${encodedQuery}`;
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for search results
    await page.waitForSelector('[role="feed"]', { timeout: 10000 });
    
    // Scroll to load more results
    const feedSelector = '[role="feed"]';
    let previousCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;
    
    while (businesses.length < maxResults && scrollAttempts < maxScrollAttempts) {
      // Get all business cards
      const businessCards = await page.$$('[role="feed"] > div > div > a');
      
      // Extract data from new cards
      for (let i = previousCount; i < businessCards.length && businesses.length < maxResults; i++) {
        try {
          const card = businessCards[i];
          
          // Click to open details
          await card.click();
          await page.waitForTimeout(1000 + Math.random() * 1000); // 1-2 seconds
          
          // Extract business data
          const businessData = await extractBusinessData(page);
          if (businessData) {
            businesses.push(businessData);
          }
        } catch (error) {
          console.error('Error extracting business card:', error);
        }
      }
      
      previousCount = businessCards.length;
      
      // Scroll to load more
      await page.evaluate((selector) => {
        const feed = document.querySelector(selector);
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      }, feedSelector);
      
      await page.waitForTimeout(2000); // Wait for new results to load
      scrollAttempts++;
      
      // Check if we've loaded new results
      const newCount = await page.$$eval('[role="feed"] > div > div > a', (cards) => cards.length);
      if (newCount === previousCount) {
        break; // No more results
      }
    }
  } catch (error) {
    console.error('Error scraping query:', searchQuery.query, error);
  }
  
  return businesses;
}

/**
 * Extract business data from Google Maps detail view
 */
async function extractBusinessData(page: Page): Promise<ScrapedBusinessData | null> {
  try {
    // Wait for details panel
    await page.waitForSelector('[role="main"]', { timeout: 5000 });
    
    // Extract data
    const data: ScrapedBusinessData = {
      businessName: ''
    };
    
    // Business name
    try {
      const nameElement = await page.$('h1');
      if (nameElement) {
        data.businessName = (await nameElement.textContent()) || '';
      }
    } catch (error) {
      console.error('Error extracting name:', error);
    }
    
    if (!data.businessName) {
      return null; // Skip if no name
    }
    
    // Phone number
    try {
      const phoneElement = await page.$('[data-item-id*="phone"]');
      if (phoneElement) {
        const phoneText = await phoneElement.textContent();
        if (phoneText) {
          data.phone = phoneText.trim();
        }
      }
    } catch (error) {
      console.error('Error extracting phone:', error);
    }
    
    // Address
    try {
      const addressElement = await page.$('[data-item-id*="address"]');
      if (addressElement) {
        const addressText = await addressElement.textContent();
        if (addressText) {
          data.address = addressText.trim();
          
          // Parse city, state, zip
          const addressParts = addressText.split(',').map(p => p.trim());
          if (addressParts.length >= 2) {
            data.city = addressParts[addressParts.length - 2];
            
            const lastPart = addressParts[addressParts.length - 1];
            const stateZip = lastPart.match(/([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/);
            if (stateZip) {
              data.state = stateZip[1];
              data.zipCode = stateZip[2];
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting address:', error);
    }
    
    // Website
    try {
      const websiteElement = await page.$('[data-item-id*="authority"]');
      if (websiteElement) {
        const websiteText = await websiteElement.textContent();
        if (websiteText) {
          data.website = websiteText.trim();
        }
      }
    } catch (error) {
      console.error('Error extracting website:', error);
    }
    
    // Rating
    try {
      const ratingElement = await page.$('[role="img"][aria-label*="stars"]');
      if (ratingElement) {
        const ariaLabel = await ratingElement.getAttribute('aria-label');
        if (ariaLabel) {
          const ratingMatch = ariaLabel.match(/([\d.]+)\s*stars?/);
          if (ratingMatch) {
            data.rating = parseFloat(ratingMatch[1]);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting rating:', error);
    }
    
    // Review count
    try {
      const reviewElement = await page.$('[role="img"][aria-label*="reviews"]');
      if (reviewElement) {
        const ariaLabel = await reviewElement.getAttribute('aria-label');
        if (ariaLabel) {
          const reviewMatch = ariaLabel.match(/([\d,]+)\s*reviews?/);
          if (reviewMatch) {
            data.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
          }
        }
      }
    } catch (error) {
      console.error('Error extracting review count:', error);
    }
    
    // Category
    try {
      const categoryElement = await page.$('button[jsaction*="category"]');
      if (categoryElement) {
        const categoryText = await categoryElement.textContent();
        if (categoryText) {
          data.category = categoryText.trim();
        }
      }
    } catch (error) {
      console.error('Error extracting category:', error);
    }
    
    // Google Place ID (from URL)
    try {
      const url = page.url();
      const placeIdMatch = url.match(/!1s([^!]+)/);
      if (placeIdMatch) {
        data.googlePlaceId = placeIdMatch[1];
      }
    } catch (error) {
      console.error('Error extracting place ID:', error);
    }
    
    // Map URL
    data.googleMapUrl = page.url();
    
    return data;
  } catch (error) {
    console.error('Error extracting business data:', error);
    return null;
  }
}

/**
 * Predefined search queries for common business types
 */
export const DEFAULT_SEARCH_QUERIES: GoogleMapsSearchQuery[] = [
  { query: 'restaurants in New York, NY', maxResults: 50 },
  { query: 'plumbers in Austin, TX', maxResults: 50 },
  { query: 'real estate agents in Miami, FL', maxResults: 50 },
  { query: 'dentists in San Francisco, CA', maxResults: 50 },
  { query: 'lawyers in Chicago, IL', maxResults: 50 },
  { query: 'auto repair shops in Los Angeles, CA', maxResults: 50 },
  { query: 'HVAC contractors in Dallas, TX', maxResults: 50 },
  { query: 'fitness centers in Seattle, WA', maxResults: 50 }
];
