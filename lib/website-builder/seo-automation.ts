/**
 * SEO Automation Service
 * Handles automatic SEO optimization including:
 * - Sitemap generation
 * - Robots.txt generation
 * - Structured data (JSON-LD)
 * - Google Search Console integration
 */

import type { WebsiteStructure, WebsitePage } from './types';
import { extractPages } from './extract-pages';

export interface SEOAutomationConfig {
  websiteUrl: string;
  businessName: string;
  businessDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export class SEOAutomationService {
  /**
   * Generate sitemap.xml content
   */
  generateSitemap(
    structure: WebsiteStructure,
    config: SEOAutomationConfig
  ): string {
    const entries: SitemapEntry[] = [];
    const baseUrl = config.websiteUrl.replace(/\/$/, '');

    // Add homepage
    entries.push({
      loc: baseUrl,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 1.0,
    });

    // Add all pages from structure
    structure.pages?.forEach((page: WebsitePage) => {
      if (page.path && page.path !== '/') {
        entries.push({
          loc: `${baseUrl}${page.path}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: this.getChangeFrequency(page.path),
          priority: this.getPriority(page.path),
        });
      }
    });

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${this.escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return xml;
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(config: SEOAutomationConfig): string {
    const baseUrl = config.websiteUrl.replace(/\/$/, '');
    return `# robots.txt for ${config.businessName}
User-agent: *
Allow: /

# Disallow admin and private paths
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /.env
Disallow: /.git

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;
  }

  /**
   * Generate structured data (JSON-LD) for Organization
   */
  generateOrganizationSchema(config: SEOAutomationConfig): object {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: config.businessName,
    };

    if (config.businessDescription) {
      schema.description = config.businessDescription;
    }

    if (config.websiteUrl) {
      schema.url = config.websiteUrl;
    }

    if (config.contactEmail) {
      schema.email = config.contactEmail;
    }

    if (config.contactPhone) {
      schema.telephone = config.contactPhone;
    }

    if (config.address) {
      schema.address = {
        '@type': 'PostalAddress',
        ...(config.address.street && { streetAddress: config.address.street }),
        ...(config.address.city && { addressLocality: config.address.city }),
        ...(config.address.state && { addressRegion: config.address.state }),
        ...(config.address.zipCode && { postalCode: config.address.zipCode }),
        ...(config.address.country && { addressCountry: config.address.country }),
      };
    }

    return schema;
  }

  /**
   * Generate structured data (JSON-LD) for LocalBusiness (if applicable)
   */
  generateLocalBusinessSchema(config: SEOAutomationConfig): object | null {
    if (!config.address) {
      return null;
    }

    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: config.businessName,
    };

    if (config.businessDescription) {
      schema.description = config.businessDescription;
    }

    if (config.websiteUrl) {
      schema.url = config.websiteUrl;
    }

    if (config.contactPhone) {
      schema.telephone = config.contactPhone;
    }

    schema.address = {
      '@type': 'PostalAddress',
      ...(config.address.street && { streetAddress: config.address.street }),
      ...(config.address.city && { addressLocality: config.address.city }),
      ...(config.address.state && { addressRegion: config.address.state }),
      ...(config.address.zipCode && { postalCode: config.address.zipCode }),
      ...(config.address.country && { addressCountry: config.address.country }),
    };

    return schema;
  }

  /**
   * Generate structured data (JSON-LD) for WebSite
   */
  generateWebSiteSchema(config: SEOAutomationConfig): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.businessName,
      url: config.websiteUrl,
      ...(config.businessDescription && { description: config.businessDescription }),
    };
  }

  /**
   * Generate all structured data for a page
   */
  generatePageStructuredData(
    page: WebsitePage,
    config: SEOAutomationConfig
  ): object[] {
    const schemas: object[] = [];

    // Always include Organization schema
    schemas.push(this.generateOrganizationSchema(config));

    // Include WebSite schema on homepage
    if (page.path === '/' || page.id === 'home') {
      schemas.push(this.generateWebSiteSchema(config));
    }

    // Include LocalBusiness schema if address is available
    const localBusinessSchema = this.generateLocalBusinessSchema(config);
    if (localBusinessSchema) {
      schemas.push(localBusinessSchema);
    }

    // Add page-specific schema
    if (page.seo) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.seo.title || page.name,
        description: page.seo.description,
        url: `${config.websiteUrl}${page.path}`,
      });
    }

    return schemas;
  }

  /**
   * Generate meta tags for a page
   */
  generateMetaTags(page: WebsitePage, config: SEOAutomationConfig): string {
    const tags: string[] = [];
    const pageUrl = `${config.websiteUrl}${page.path}`;
    const pageTitle = page.seo?.title || `${page.name} - ${config.businessName}`;
    const pageDescription = page.seo?.description || config.businessDescription || '';

    // Basic meta tags
    tags.push(`<meta charset="UTF-8">`);
    tags.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0">`);
    tags.push(`<title>${this.escapeHtml(pageTitle)}</title>`);
    tags.push(`<meta name="description" content="${this.escapeHtml(pageDescription)}">`);

    // Keywords
    if (page.seo?.keywords && Array.isArray(page.seo.keywords)) {
      tags.push(`<meta name="keywords" content="${this.escapeHtml(page.seo.keywords.join(', '))}">`);
    }

    // Canonical URL
    tags.push(`<link rel="canonical" href="${this.escapeHtml(pageUrl)}">`);

    // Open Graph tags
    tags.push(`<meta property="og:type" content="website">`);
    tags.push(`<meta property="og:title" content="${this.escapeHtml(pageTitle)}">`);
    tags.push(`<meta property="og:description" content="${this.escapeHtml(pageDescription)}">`);
    tags.push(`<meta property="og:url" content="${this.escapeHtml(pageUrl)}">`);
    if (page.seo?.ogImage) {
      tags.push(`<meta property="og:image" content="${this.escapeHtml(page.seo.ogImage)}">`);
    }

    // Twitter Card tags
    tags.push(`<meta name="twitter:card" content="summary_large_image">`);
    tags.push(`<meta name="twitter:title" content="${this.escapeHtml(pageTitle)}">`);
    tags.push(`<meta name="twitter:description" content="${this.escapeHtml(pageDescription)}">`);
    if (page.seo?.ogImage) {
      tags.push(`<meta name="twitter:image" content="${this.escapeHtml(page.seo.ogImage)}">`);
    }

    // Robots meta tag
    tags.push(`<meta name="robots" content="index, follow">`);

    return tags.join('\n');
  }

  /**
   * Auto-generate comprehensive SEO metadata for every page in a structure.
   * Fills in titles, descriptions, keywords, OG tags, and Twitter cards
   * so owners only need to review/edit rather than create from scratch.
   */
  generateAutoSeo(
    structure: any,
    config: SEOAutomationConfig
  ): { globalSeo: any; pagesWithSeo: any[] } {
    const pages = extractPages(structure);

    const globalSeo = {
      title: config.businessName,
      description: config.businessDescription ||
        `Welcome to ${config.businessName}. Explore our services and discover what sets us apart.`,
      keywords: this.inferKeywords(config),
      canonicalUrl: config.websiteUrl?.replace(/\/$/, '') || '',
      ogTitle: config.businessName,
      ogDescription: config.businessDescription ||
        `Welcome to ${config.businessName}. Explore our services and discover what sets us apart.`,
      ogImage: '',
      twitterCard: 'summary_large_image',
      locale: 'en_US',
      type: 'website',
    };

    const pagesWithSeo = pages.map((page: any) => {
      const pageName = page.name || page.id || 'Page';
      const pagePath = page.path || '/';
      const isHome = pagePath === '/' || page.id === 'home';
      const heroComponent = (page.components || []).find(
        (c: any) => c.type === 'Hero' || c.type === 'hero' ||
          c.sectionType === 'Hero' || c.sectionType === 'hero'
      );
      const heroTitle = heroComponent?.props?.title || heroComponent?.props?.heading;
      const heroSubtitle = heroComponent?.props?.subtitle || heroComponent?.props?.description;

      const title = page.seo?.title ||
        (isHome
          ? `${config.businessName} | ${heroTitle || 'Home'}`
          : `${pageName} | ${config.businessName}`);

      const description = page.seo?.description ||
        heroSubtitle ||
        (isHome
          ? config.businessDescription || `${config.businessName} — ${pageName}`
          : `${pageName} — ${config.businessName}. Learn more about our ${pageName.toLowerCase()}.`);

      const keywords = page.seo?.keywords ||
        this.inferPageKeywords(pageName, pagePath, config);

      return {
        ...page,
        seo: {
          ...(page.seo || {}),
          title,
          description: description.slice(0, 160),
          keywords,
          ogTitle: page.seo?.ogTitle || title,
          ogDescription: page.seo?.ogDescription || description.slice(0, 160),
          ogImage: page.seo?.ogImage || '',
          twitterCard: 'summary_large_image',
          robots: 'index, follow',
          canonicalUrl: isHome
            ? config.websiteUrl?.replace(/\/$/, '') || ''
            : `${config.websiteUrl?.replace(/\/$/, '') || ''}${pagePath}`,
        },
      };
    });

    return { globalSeo, pagesWithSeo };
  }

  private inferKeywords(config: SEOAutomationConfig): string[] {
    const kw: string[] = [];
    if (config.businessName) kw.push(config.businessName);
    const desc = (config.businessDescription || '').toLowerCase();
    const buzzwords = [
      'real estate', 'dental', 'clinic', 'services', 'products', 'e-commerce',
      'consulting', 'agency', 'portfolio', 'restaurant', 'salon', 'fitness',
      'health', 'law', 'legal', 'finance', 'insurance', 'marketing',
      'construction', 'education', 'coaching', 'photography', 'design',
    ];
    for (const bw of buzzwords) {
      if (desc.includes(bw)) kw.push(bw);
    }
    if (config.address?.city) kw.push(config.address.city);
    if (config.address?.state) kw.push(config.address.state);
    return kw.length > 0 ? kw : [config.businessName || 'business'];
  }

  private inferPageKeywords(
    pageName: string,
    pagePath: string,
    config: SEOAutomationConfig
  ): string[] {
    const base = [config.businessName || ''];
    const slug = pagePath.replace(/^\//, '').replace(/-/g, ' ');
    if (slug && slug !== '/') base.push(slug);
    const nameLC = pageName.toLowerCase();
    const pageAliases: Record<string, string[]> = {
      about: ['about us', 'our story', 'company'],
      services: ['services', 'what we offer', 'solutions'],
      products: ['products', 'shop', 'store'],
      contact: ['contact us', 'get in touch', 'reach us'],
      blog: ['blog', 'articles', 'news'],
      gallery: ['gallery', 'portfolio', 'work'],
      faq: ['faq', 'frequently asked questions', 'help'],
      testimonials: ['reviews', 'testimonials', 'what clients say'],
      pricing: ['pricing', 'plans', 'rates'],
    };
    for (const [key, aliases] of Object.entries(pageAliases)) {
      if (nameLC.includes(key)) {
        base.push(...aliases);
        break;
      }
    }
    return base.filter(Boolean);
  }

  // Helper methods
  private getChangeFrequency(path: string): SitemapEntry['changefreq'] {
    if (path === '/' || path.includes('home')) return 'daily';
    if (path.includes('blog') || path.includes('news')) return 'weekly';
    if (path.includes('about') || path.includes('contact')) return 'monthly';
    return 'monthly';
  }

  private getPriority(path: string): number {
    if (path === '/' || path.includes('home')) return 1.0;
    if (path.includes('services') || path.includes('products')) return 0.9;
    if (path.includes('about')) return 0.8;
    return 0.7;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const seoAutomation = new SEOAutomationService();
