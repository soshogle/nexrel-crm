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
   */
  async scrapeWebsite(url: string): Promise<ScrapedWebsiteData> {
    try {
      // Fetch HTML
      const html = await this.fetchHTML(url);
      
      // Extract SEO data
      const seo = await this.extractSEO(html, url);
      
      // Extract images
      const images = await this.extractImages(html, url);
      
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
        metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }

  /**
   * Fetch HTML content (with JavaScript rendering support)
   */
  private async fetchHTML(url: string): Promise<string> {
    // For now, use simple fetch
    // TODO: Add Puppeteer/Playwright for JavaScript rendering
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteBuilder/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    return await response.text();
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
    
    // Extract <img> tags
    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      const src = match[1];
      const altMatch = match[0].match(/alt=["']([^"']+)["']/i);
      images.push({
        url: this.resolveUrl(src, baseUrl),
        alt: altMatch ? altMatch[1] : undefined,
      });
    }
    
    // Extract background images from CSS
    const bgMatches = html.matchAll(/background-image:\s*url\(["']?([^"')]+)["']?\)/gi);
    for (const match of bgMatches) {
      images.push({
        url: this.resolveUrl(match[1], baseUrl),
      });
    }
    
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
