/**
 * Contact Extractor - Uses Apify Web Scraper with Puppeteer to extract masked phone numbers
 * DuProprio and other sites mask contact info behind "Show" buttons
 * This extractor visits each listing and clicks to reveal the contact info
 */

import { ApifyClient } from 'apify-client';

interface ExtractedContact {
  listingUrl: string;
  phone?: string;
  email?: string;
  sellerName?: string;
  success: boolean;
  error?: string;
}

// Get Apify token from env or secrets file
function getApifyToken(): string | null {
  return process.env.APIFY_API_TOKEN || null;
}

/**
 * Extract contact info from DuProprio listings
 * Uses Apify Web Scraper actor with custom page function
 */
export async function extractDuProprioContacts(listingUrls: string[]): Promise<ExtractedContact[]> {
  const token = getApifyToken();
  
  if (!token) {
    console.error('❌ No Apify token available for contact extraction');
    return listingUrls.map(url => ({
      listingUrl: url,
      success: false,
      error: 'No Apify token configured'
    }));
  }
  
  console.log(`📞 Extracting contacts from ${listingUrls.length} DuProprio listings...`);
  
  const client = new ApifyClient({ token });
  
  // Use Web Scraper actor with custom Puppeteer code
  // This actor can click buttons and extract dynamic content
  const input = {
    startUrls: listingUrls.map(url => ({ url })),
    pageFunction: `
      async function pageFunction(context) {
        const { page, request, log } = context;
        
        log.info('Processing: ' + request.url);
        
        // Wait for page to fully load
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        let phone = null;
        let email = null;
        let sellerName = null;
        
        try {
          // Look for the "Show" phone button and click it
          const showPhoneSelectors = [
            'button:has-text("Show")',
            '[data-testid="show-phone"]',
            '.phone-reveal',
            'a[href^="tel:"]',
            '.listing-contact button',
            'button.btn-phone',
            '[class*="phone"] button'
          ];
          
          for (const selector of showPhoneSelectors) {
            try {
              const btn = await page.$(selector);
              if (btn) {
                await btn.click();
                await page.waitForTimeout(1500);
                log.info('Clicked phone reveal button');
                break;
              }
            } catch (e) {}
          }
          
          // Extract phone number after clicking
          // DuProprio format: phone number appears after clicking
          const phoneSelectors = [
            'a[href^="tel:"]',
            '[class*="phone"] a',
            '.contact-phone',
            '.seller-phone',
            '[data-phone]'
          ];
          
          for (const selector of phoneSelectors) {
            try {
              const elem = await page.$(selector);
              if (elem) {
                const href = await elem.getAttribute('href');
                if (href && href.startsWith('tel:')) {
                  phone = href.replace('tel:', '').trim();
                  break;
                }
                const text = await elem.textContent();
                if (text && /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
                  phone = text.trim();
                  break;
                }
              }
            } catch (e) {}
          }
          
          // Also try to get from page text after click
          if (!phone) {
            const bodyText = await page.evaluate(() => document.body.innerText);
            const phoneMatch = bodyText.match(/(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/);
            if (phoneMatch) {
              phone = phoneMatch[0];
            }
          }
          
          // Extract seller/owner name
          const nameSelectors = [
            '.seller-name',
            '.owner-name',
            '.landlord-name',
            '[class*="contact"] h2',
            '[class*="contact"] h3'
          ];
          
          for (const selector of nameSelectors) {
            try {
              const elem = await page.$(selector);
              if (elem) {
                sellerName = await elem.textContent();
                break;
              }
            } catch (e) {}
          }
          
        } catch (error) {
          log.error('Error extracting contact: ' + error.message);
        }
        
        return {
          listingUrl: request.url,
          phone,
          email,
          sellerName,
          success: !!phone
        };
      }
    `,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL']
    },
    maxRequestsPerCrawl: listingUrls.length,
    maxConcurrency: 3, // Don't hammer the site
    navigationTimeoutSecs: 60
  };
  
  try {
    // Use web-scraper actor for browser automation
    const run = await client.actor('apify/web-scraper').call(input, {
      timeout: 300, // 5 min timeout
      memory: 1024
    });
    
    // Get results from dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`✅ Extracted contacts from ${items.length} listings`);
    
    return items.map((item: any) => ({
      listingUrl: item.listingUrl || item.url,
      phone: item.phone,
      email: item.email,
      sellerName: item.sellerName,
      success: item.success || !!item.phone
    }));
    
  } catch (error: any) {
    console.error('❌ Contact extraction failed:', error.message);
    return listingUrls.map(url => ({
      listingUrl: url,
      success: false,
      error: error.message
    }));
  }
}

/**
 * Alternative: Use dedicated Apify actor for DuProprio deep scraping
 * Some actors already handle the phone reveal
 */
export async function deepScrapeDuProprio(listingUrls: string[]): Promise<ExtractedContact[]> {
  const token = getApifyToken();
  
  if (!token) {
    return listingUrls.map(url => ({
      listingUrl: url,
      success: false,
      error: 'No Apify token configured'
    }));
  }
  
  console.log(`🔍 Deep scraping ${listingUrls.length} DuProprio listings for contacts...`);
  
  const client = new ApifyClient({ token });
  
  // Use the DuProprio actor but with individual listing URLs
  // This does a deeper scrape of each listing page
  const input = {
    startUrls: listingUrls.map(url => ({ url })),
    maxItems: listingUrls.length,
    extendOutputFunction: `
      async ({ data, page, request }) => {
        // Try to click phone reveal button
        try {
          const showBtn = await page.$('button:has-text("Show")');
          if (showBtn) {
            await showBtn.click();
            await page.waitForTimeout(2000);
          }
        } catch (e) {}
        
        // Extract phone after reveal
        let phone = null;
        try {
          const phoneLink = await page.$('a[href^="tel:"]');
          if (phoneLink) {
            const href = await phoneLink.getAttribute('href');
            phone = href?.replace('tel:', '');
          }
        } catch (e) {}
        
        return {
          ...data,
          extractedPhone: phone
        };
      }
    `
  };
  
  try {
    const run = await client.actor('aitorsm/duproprio').call(input, {
      timeout: 300,
      memory: 1024
    });
    
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    return items.map((item: any) => ({
      listingUrl: item.url || item.listingUrl,
      phone: item.extractedPhone || item.phone,
      sellerName: item.sellerName,
      success: !!(item.extractedPhone || item.phone)
    }));
    
  } catch (error: any) {
    console.error('❌ Deep scrape failed:', error.message);
    return listingUrls.map(url => ({
      listingUrl: url,
      success: false,
      error: error.message
    }));
  }
}
