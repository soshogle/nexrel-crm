/**
 * Website Scraping Service
 * Extracts content, SEO, images, videos, forms, and structure from websites
 */

import type {
  ScrapedWebsiteData,
  ScrapedImage,
  ScrapedVideo,
  ScrapedForm,
  ScrapedProduct,
  SEOData,
} from './types';

export class WebsiteScraper {
  /**
   * Scrape a website and extract all relevant data
   * @param url - Source website URL
   * @param userId - User ID for multi-tenant storage
   * @param websiteId - Website ID for multi-tenant storage
   * @param downloadImages - Whether to download and store images (default: false)
   * @param useJsRendering - Use Playwright for JS-rendered sites (default: from ENABLE_JS_SCRAPING env)
   */
  async scrapeWebsite(
    url: string,
    userId?: string,
    websiteId?: string,
    downloadImages: boolean = false,
    useJsRendering?: boolean
  ): Promise<ScrapedWebsiteData> {
    try {
      // Fetch HTML (use Playwright when requested or ENABLE_JS_SCRAPING=true)
      const html = await this.fetchHTML(url, useJsRendering);
      
      // Extract SEO data
      const seo = await this.extractSEO(html, url);
      
      // Extract images
      let images = await this.extractImages(html, url);
      
      // Download and store images if requested and credentials provided
      if (downloadImages && userId && websiteId) {
        try {
          const { WebsiteImageStorage } = await import('./image-storage');
          const storageProvider = (process.env.IMAGE_STORAGE_PROVIDER || 'vercel') as 'vercel' | 's3' | 'r2';
          const imageStorage = new WebsiteImageStorage({
            provider: storageProvider,
            userId,
            websiteId,
          });

          // Download and store images (with error handling per image)
          const storedImages = await Promise.allSettled(
            images.map(async (img) => {
              try {
                const stored = await imageStorage.downloadAndStore(
                  img.url,
                  img.alt,
                  {
                    createOptimized: true,
                    createThumbnail: true,
                    maxWidth: 1920, // Max width for optimized version
                    maxHeight: 1080,
                  }
                );
                return {
                  ...stored,
                  alt: img.alt,
                };
              } catch (error: any) {
                console.warn(`Failed to store image ${img.url}:`, error.message);
                // Return original image info if storage fails
                return img;
              }
            })
          );

          // Update images array with stored URLs (or keep original if storage failed)
          images = storedImages.map((result, index) => {
            if (result.status === 'fulfilled' && 'url' in result.value) {
              return result.value as any; // Stored image
            }
            return images[index]; // Original image (fallback)
          });
        } catch (error: any) {
          console.error('Image storage initialization failed:', error.message);
          // Continue with original image URLs if storage fails
        }
      }
      
      // Extract videos
      const videos = await this.extractVideos(html);
      
      // Extract forms
      const forms = await this.extractForms(html);
      
      // Extract products (if e-commerce)
      const products = await this.extractProducts(html, url);
      
      // Extract styles
      const styles = await this.extractStyles(html);
      
      // Extract structure
      const structure = await this.extractStructure(html);

      // Extract content sections (headings, paragraphs) for template population
      const contentSections = await this.extractContentSections(html);

      // Extract metadata
      const metadata = await this.extractMetadata(html);

      return {
        html,
        seo,
        images,
        videos,
        forms,
        products,
        styles,
        structure,
        contentSections,
        metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }

  /**
   * Fetch HTML content (with optional JavaScript rendering for SPAs)
   * - forceJsRendering=true: Use Playwright only
   * - forceJsRendering=false: Try simple fetch first, fallback to Playwright if blocked
   */
  private async fetchHTML(url: string, forceJsRendering?: boolean): Promise<string> {
    const useJsRendering = forceJsRendering ?? process.env.ENABLE_JS_SCRAPING === 'true';

    if (useJsRendering) {
      try {
        return await this.fetchHTMLWithPlaywright(url);
      } catch (error: any) {
        console.warn('Playwright fetch failed, falling back to simple fetch:', error.message);
        return this.fetchHTMLSimple(url);
      }
    }

    // Smart mode: try simple fetch first, fallback to Playwright if blocked
    try {
      const html = await this.fetchHTMLSimple(url);
      if (this.looksLikeBlocked(html)) {
        console.warn('Simple fetch returned block/challenge page, trying Playwright');
        return await this.fetchHTMLWithPlaywright(url);
      }
      return html;
    } catch (error: any) {
      const msg = error?.message || '';
      const isBlocked = /403|429|blocked|forbidden|timeout/i.test(msg);
      const isTransient = /5\d{2}|timeout|econnreset|econnrefused|network/i.test(msg);
      if (isBlocked) {
        console.warn('Simple fetch failed (likely blocked), trying Playwright:', msg);
        try {
          return await this.fetchHTMLWithPlaywright(url);
        } catch (pwErr: any) {
          throw new Error(`Scrape failed. Simple fetch: ${msg}. Playwright: ${pwErr?.message || pwErr}`);
        }
      }
      if (isTransient) {
        console.warn('Transient error, retrying once:', msg);
        await new Promise((r) => setTimeout(r, 2000)); // Brief delay before retry
        try {
          return await this.fetchHTMLSimple(url);
        } catch (retryErr: any) {
          // Last resort for timeout/slow sites: try Playwright
          if (/timeout|slow/i.test(msg)) {
            console.warn('Retry failed, trying Playwright as last resort');
            return await this.fetchHTMLWithPlaywright(url);
          }
          throw retryErr;
        }
      }
      throw error;
    }
  }

  /** Headers that mimic a real browser to reduce blocking */
  private static readonly BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  };

  /**
   * Returns true if HTML looks like a block/challenge page (Cloudflare, bot check, etc.)
   */
  private looksLikeBlocked(html: string): boolean {
    const lower = html.toLowerCase();
    const suspicious = [
      'enable javascript',
      'please enable javascript',
      'cloudflare',
      'checking your browser',
      'ddos protection',
      'access denied',
      'blocked',
      'captcha',
      'challenge',
      'ray id',
      'cf-browser-verification',
    ];
    return suspicious.some((s) => lower.includes(s)) || html.length < 500;
  }

  /**
   * Simple fetch - works for static HTML sites
   */
  private async fetchHTMLSimple(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout
    try {
      const response = await fetch(url, {
        headers: WebsiteScraper.BROWSER_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The site may be slow or blocking requests.');
      }
      throw err;
    }
  }

  /**
   * Fetch HTML using Playwright - renders JavaScript for SPAs and dynamic sites
   * On Vercel/serverless, uses @sparticuz/chromium for a compatible Chromium binary
   */
  private async fetchHTMLWithPlaywright(url: string): Promise<string> {
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;
    const { chromium: playwrightChromium } = await import('playwright');
    let browser: any = null;

    try {
      const launchOptions: { headless: boolean; args: string[]; executablePath?: string } = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };

      if (isServerless) {
        const chromium = (await import('@sparticuz/chromium')).default;
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.args = chromium.args;
      }

      browser = await playwrightChromium.launch(launchOptions);

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        ignoreHTTPSErrors: true,
      });

      const page = await context.newPage();

      // Navigate and wait for content to load
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for body to have meaningful content (handles slow SPAs)
      await page.waitForLoadState('domcontentloaded');
      await new Promise((r) => setTimeout(r, 2000)); // Allow client-side rendering

      const html = await page.content();
      await browser.close();
      return html;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Extract SEO data from HTML
   */
  private async extractSEO(html: string, baseUrl: string): Promise<SEOData> {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const description = metaDescription ? metaDescription[1].trim() : '';
    
    const metaKeywords = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    const keywords = metaKeywords ? metaKeywords[1].split(',').map(k => k.trim()) : [];
    
    // Open Graph
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1];
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    
    // Twitter Card
    const twitterCard = html.match(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']+)["']/i)?.[1];
    
    // Canonical URL
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
    
    return {
      title,
      description,
      keywords,
      ogTitle: ogTitle || title,
      ogDescription: ogDescription || description,
      ogImage: ogImage ? this.resolveUrl(ogImage, baseUrl) : undefined,
      twitterCard,
      canonicalUrl: canonical ? this.resolveUrl(canonical, baseUrl) : baseUrl,
    };
  }

  /**
   * Extract images from HTML
   */
  private async extractImages(html: string, baseUrl: string): Promise<ScrapedImage[]> {
    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    const addImage = (rawUrl: string, alt?: string) => {
      if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.length < 5) return;
      const url = this.resolveUrl(rawUrl.trim(), baseUrl);
      if (seen.has(url)) return;
      seen.add(url);
      images.push({ url, alt: alt || undefined });
    };

    // Extract <img> tags — src, data-src, data-lazy-src
    const imgMatches = html.matchAll(/<img[^>]*>/gi);
    for (const match of imgMatches) {
      const tag = match[0];
      const altMatch = tag.match(/alt=["']([^"']+)["']/i);
      const alt = altMatch?.[1];

      const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch) addImage(srcMatch[1], alt);

      const dataSrcMatch = tag.match(/data-(?:src|lazy-src|original)=["']([^"']+)["']/i);
      if (dataSrcMatch) addImage(dataSrcMatch[1], alt);

      // Extract best image from srcset
      const srcsetMatch = tag.match(/srcset=["']([^"']+)["']/i);
      if (srcsetMatch) {
        const candidates = srcsetMatch[1].split(',').map((s) => s.trim().split(/\s+/));
        const best = candidates
          .map(([url, descriptor]) => ({
            url,
            width: parseInt(descriptor?.replace('w', '') || '0') || 0,
          }))
          .sort((a, b) => b.width - a.width)[0];
        if (best?.url) addImage(best.url, alt);
      }
    }

    // Extract <picture> > <source> elements
    const sourceMatches = html.matchAll(/<source[^>]+srcset=["']([^"',\s]+)/gi);
    for (const match of sourceMatches) {
      addImage(match[1]);
    }

    // Extract background images from CSS (both background-image and background shorthand)
    const bgMatches = html.matchAll(/background(?:-image)?:\s*[^;]*url\(["']?([^"')]+)["']?\)/gi);
    for (const match of bgMatches) {
      addImage(match[1]);
    }

    // Extract Open Graph and Twitter Card images
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch) addImage(ogMatch[1]);

    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twMatch) addImage(twMatch[1]);

    return images;
  }

  /**
   * Extract videos from HTML
   */
  private async extractVideos(html: string): Promise<ScrapedVideo[]> {
    const videos: ScrapedVideo[] = [];
    
    // YouTube embeds
    const youtubeMatches = html.matchAll(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/gi);
    for (const match of youtubeMatches) {
      videos.push({
        url: `https://www.youtube.com/watch?v=${match[1]}`,
        type: 'youtube',
        embedId: match[1],
      });
    }
    
    // YouTube short URLs
    const youtubeShortMatches = html.matchAll(/youtu\.be\/([a-zA-Z0-9_-]+)/gi);
    for (const match of youtubeShortMatches) {
      videos.push({
        url: `https://www.youtube.com/watch?v=${match[1]}`,
        type: 'youtube',
        embedId: match[1],
      });
    }
    
    // Vimeo embeds
    const vimeoMatches = html.matchAll(/vimeo\.com\/(\d+)/gi);
    for (const match of vimeoMatches) {
      videos.push({
        url: `https://vimeo.com/${match[1]}`,
        type: 'vimeo',
        embedId: match[1],
      });
    }
    
    // Direct video files
    const videoMatches = html.matchAll(/<video[^>]+src=["']([^"']+)["']/gi);
    for (const match of videoMatches) {
      videos.push({
        url: match[1],
        type: 'direct',
      });
    }
    
    return videos;
  }

  /**
   * Extract forms from HTML
   */
  private async extractForms(html: string): Promise<ScrapedForm[]> {
    const forms: ScrapedForm[] = [];
    
    const formMatches = html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/gi);
    for (const formMatch of formMatches) {
      const formHtml = formMatch[0];
      const actionMatch = formHtml.match(/action=["']([^"']+)["']/i);
      const methodMatch = formHtml.match(/method=["']([^"']+)["']/i);
      const idMatch = formHtml.match(/id=["']([^"']+)["']/i);
      
      // Extract form fields
      const fields: any[] = [];
      const inputMatches = formHtml.matchAll(/<input[^>]+>/gi);
      for (const inputMatch of inputMatches) {
        const inputHtml = inputMatch[0];
        const nameMatch = inputHtml.match(/name=["']([^"']+)["']/i);
        const typeMatch = inputHtml.match(/type=["']([^"']+)["']/i);
        const requiredMatch = inputHtml.match(/required/i);
        
        if (nameMatch) {
          fields.push({
            name: nameMatch[1],
            type: typeMatch ? typeMatch[1] : 'text',
            required: !!requiredMatch,
          });
        }
      }
      
      // Extract textareas
      const textareaMatches = formHtml.matchAll(/<textarea[^>]+name=["']([^"']+)["']/gi);
      for (const textareaMatch of textareaMatches) {
        fields.push({
          name: textareaMatch[1],
          type: 'textarea',
        });
      }
      
      forms.push({
        id: idMatch ? idMatch[1] : undefined,
        action: actionMatch ? actionMatch[1] : undefined,
        method: methodMatch ? methodMatch[1].toUpperCase() : 'POST',
        fields,
      });
    }
    
    return forms;
  }

  /**
   * Extract products (for e-commerce sites)
   */
  private async extractProducts(html: string, baseUrl: string): Promise<ScrapedProduct[] | undefined> {
    // Try to detect e-commerce patterns
    const hasProducts = html.includes('product') || html.includes('shop') || html.includes('cart');
    
    if (!hasProducts) {
      return undefined;
    }
    
    const products: ScrapedProduct[] = [];
    
    // Look for common e-commerce patterns
    // This is a simplified version - can be enhanced with schema.org parsing
    const productMatches = html.matchAll(/<[^>]+class=["'][^"']*product[^"']*["'][^>]*>/gi);
    
    // TODO: Implement more sophisticated product extraction
    // - Parse schema.org Product markup
    // - Parse common e-commerce platform patterns
    // - Extract product details (name, price, description, image)
    
    return products.length > 0 ? products : undefined;
  }

  /**
   * Extract styles (colors, fonts, layout patterns)
   */
  private async extractStyles(html: string): Promise<any> {
    const colors: string[] = [];
    const fonts: string[] = [];
    
    // Extract colors from inline styles and style tags
    const colorMatches = html.matchAll(/(?:color|background-color|border-color):\s*([#a-fA-F0-9]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/gi);
    for (const match of colorMatches) {
      if (!colors.includes(match[1])) {
        colors.push(match[1]);
      }
    }
    
    // Extract fonts
    const fontMatches = html.matchAll(/font-family:\s*([^;]+)/gi);
    for (const match of fontMatches) {
      const fontFamily = match[1].split(',')[0].trim().replace(/["']/g, '');
      if (!fonts.includes(fontFamily)) {
        fonts.push(fontFamily);
      }
    }
    
    return {
      colors: colors.slice(0, 10), // Limit to 10 colors
      fonts: fonts.slice(0, 5), // Limit to 5 fonts
      layout: 'responsive', // Default, can be enhanced
    };
  }

  /**
   * Extract content sections (headings, paragraphs) for template population.
   * Handles both semantic HTML (h1-h6, p, li) and React SPA output (section > div trees).
   */
  private async extractContentSections(html: string): Promise<{
    hero?: { title?: string; subtitle?: string; image?: string };
    sections: { title?: string; content?: string; image?: string }[];
  }> {
    const stripHtml = (s: string) =>
      s.replace(/<br\s*\/?>/gi, '\n')
       .replace(/<[^>]+>/g, ' ')
       .replace(/&nbsp;/gi, ' ')
       .replace(/&amp;/gi, '&')
       .replace(/&lt;/gi, '<')
       .replace(/&gt;/gi, '>')
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/gi, "'")
       .replace(/\s+/g, ' ')
       .trim()
       .slice(0, 2000);

    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

    // --- Standard semantic extraction ---

    const headingMatches = cleaned.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi);
    const headings: { level: number; text: string; index: number }[] = [];
    for (const m of headingMatches) {
      const text = stripHtml(m[2]);
      if (text && text.length > 2) {
        headings.push({ level: parseInt(m[1][1]), text, index: m.index! });
      }
    }

    const pMatches = cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    const paragraphs: { text: string; index: number }[] = [];
    for (const m of pMatches) {
      const text = stripHtml(m[1]);
      if (text && text.length > 10) {
        paragraphs.push({ text, index: m.index! });
      }
    }

    const liMatches = cleaned.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    const listItems: { text: string; index: number }[] = [];
    for (const m of liMatches) {
      const text = stripHtml(m[1]);
      if (text && text.length > 5) {
        listItems.push({ text, index: m.index! });
      }
    }

    const bqMatches = cleaned.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi);
    for (const m of bqMatches) {
      const text = stripHtml(m[1]);
      if (text && text.length > 10) {
        paragraphs.push({ text: `"${text}"`, index: m.index! });
      }
    }

    // --- SPA / div-based content extraction ---
    // React SPAs render into <section> and <div> elements. Extract text from <span>,
    // <em>, <strong>, and bare text nodes inside divs when no <p> tags are present.
    if (paragraphs.length < 3) {
      const spanMatches = cleaned.matchAll(/<(?:span|em|strong|a)[^>]*>([\s\S]*?)<\/(?:span|em|strong|a)>/gi);
      const seenTexts = new Set(paragraphs.map(p => p.text));
      for (const m of spanMatches) {
        const text = stripHtml(m[1]);
        if (text && text.length > 20 && !seenTexts.has(text)) {
          seenTexts.add(text);
          paragraphs.push({ text, index: m.index! });
        }
      }
    }

    // Extract <section> blocks as section boundaries (common in React templates)
    const sectionElements = cleaned.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi);
    const sectionBlocks: { html: string; index: number }[] = [];
    for (const m of sectionElements) {
      sectionBlocks.push({ html: m[1], index: m.index! });
    }

    const imgPositions = cleaned.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi);
    const positionedImages: { url: string; alt: string; index: number }[] = [];
    for (const m of imgPositions) {
      const altMatch = m[0].match(/alt=["']([^"']+)["']/i);
      positionedImages.push({
        url: m[1],
        alt: altMatch?.[1] || '',
        index: m.index!,
      });
    }

    // Build hero from first h1 + nearest paragraph + nearest image
    let hero: { title?: string; subtitle?: string; image?: string } | undefined;
    const h1 = headings.find((h) => h.level === 1);
    if (h1) {
      const nearestP = paragraphs.find((p) => p.index > h1.index);
      const nearestImg = positionedImages.find(
        (img) => Math.abs(img.index - h1.index) < 3000
      );
      hero = {
        title: h1.text,
        subtitle: nearestP?.text,
        image: nearestImg?.url,
      };
    } else if (headings.length > 0) {
      hero = { title: headings[0].text };
      const nearestP = paragraphs.find((p) => p.index > headings[0].index);
      if (nearestP) hero.subtitle = nearestP.text;
    }

    // Build sections by grouping content under each heading (h2-h6)
    const sections: { title?: string; content?: string; image?: string }[] = [];
    const sectionHeadings = headings.filter((h) => h !== (h1 || headings[0]));

    for (let i = 0; i < sectionHeadings.length; i++) {
      const heading = sectionHeadings[i];
      const nextHeading = sectionHeadings[i + 1];
      const rangeEnd = nextHeading?.index ?? Infinity;

      const sectionParagraphs = paragraphs
        .filter((p) => p.index > heading.index && p.index < rangeEnd)
        .map((p) => p.text);

      const sectionLists = listItems
        .filter((li) => li.index > heading.index && li.index < rangeEnd)
        .map((li) => `• ${li.text}`);

      const allContent = [...sectionParagraphs, ...sectionLists].join('\n\n');

      const sectionImg = positionedImages.find(
        (img) => img.index > heading.index && img.index < rangeEnd
      );

      if (allContent || heading.text) {
        sections.push({
          title: heading.text,
          content: allContent || '',
          image: sectionImg?.url,
        });
      }
    }

    // Fallback: if heading-based extraction yielded few/no sections, try <section> blocks
    if (sections.length < 2 && sectionBlocks.length > 0) {
      const seenTitles = new Set(sections.map(s => s.title));

      for (const block of sectionBlocks) {
        const blockHeading = block.html.match(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/i);
        const title = blockHeading ? stripHtml(blockHeading[2]) : undefined;
        if (title && seenTitles.has(title)) continue;

        const blockParagraphs: string[] = [];
        const pInBlock = block.html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        for (const pm of pInBlock) {
          const t = stripHtml(pm[1]);
          if (t && t.length > 10) blockParagraphs.push(t);
        }

        // Also extract text from divs with meaningful content (React SPA pattern)
        if (blockParagraphs.length === 0) {
          const divTexts = block.html.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi);
          for (const dm of divTexts) {
            const t = stripHtml(dm[1]);
            if (t && t.length > 30 && !t.includes('<')) {
              blockParagraphs.push(t);
            }
          }
        }

        const blockImg = block.html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
        const content = blockParagraphs.join('\n\n');
        if (content || title) {
          if (title) seenTitles.add(title);
          sections.push({
            title: title || undefined,
            content,
            image: blockImg?.[1],
          });
        }
      }
    }

    // Last resort: group all paragraphs into one section
    if (sections.length === 0 && paragraphs.length > 0) {
      const allText = paragraphs.map((p) => p.text).join('\n\n');
      sections.push({ title: 'About', content: allText });
    }

    return { hero, sections };
  }

  /**
   * Extract structure (header, main, footer, navigation)
   */
  private async extractStructure(html: string): Promise<any> {
    // Extract header
    const headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
    const header = headerMatch ? headerMatch[1] : null;
    
    // Extract main content
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const main = mainMatch ? mainMatch[1] : null;
    
    // Extract footer
    const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
    const footer = footerMatch ? footerMatch[1] : null;
    
    // Extract navigation
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    const navigation = navMatch ? navMatch[1] : null;
    
    return {
      header,
      main,
      footer,
      navigation,
    };
  }

  /**
   * Extract additional metadata
   */
  private async extractMetadata(html: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};
    
    // Extract all meta tags
    const metaMatches = html.matchAll(/<meta[^>]+>/gi);
    for (const metaMatch of metaMatches) {
      const metaHtml = metaMatch[0];
      const nameMatch = metaHtml.match(/(?:name|property)=["']([^"']+)["']/i);
      const contentMatch = metaHtml.match(/content=["']([^"']+)["']/i);
      
      if (nameMatch && contentMatch) {
        metadata[nameMatch[1]] = contentMatch[1];
      }
    }
    
    return metadata;
  }

  /**
   * Resolve relative URL to absolute URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}

export const websiteScraper = new WebsiteScraper();
