/**
 * Website Template Importer
 * Fetches websites from URLs and converts them into templates
 */

import { websiteScraper } from './scraper';
import { prisma } from '@/lib/db';

export class WebsiteTemplateImporter {
  /**
   * Import a website from URL and save as a template
   */
  async importTemplateFromUrl(
    url: string,
    templateType: 'SERVICE' | 'PRODUCT',
    name: string,
    description?: string,
    category?: string
  ) {
    console.log(`📥 Importing template from URL: ${url}`);

    // Scrape the website
    const scrapedData = await websiteScraper.scrapeWebsite(url);

    if (!scrapedData) {
      throw new Error('Failed to scrape website');
    }

    // Convert scraped data into template structure
    const templateStructure = this.convertScrapedDataToTemplate(scrapedData);

    // Extract preview image (first large image or logo)
    const previewImage = this.extractPreviewImage(scrapedData);

    // Save as template
    const template = await prisma.websiteTemplate.create({
      data: {
        name,
        type: templateType,
        category: category || 'Imported',
        description: description || `Template imported from ${url}`,
        previewImage,
        structure: templateStructure,
        isDefault: false,
      },
    });

    console.log(`✅ Template created: ${template.id}`);

    return template;
  }

  /**
   * Convert scraped website data into template structure
   */
  private convertScrapedDataToTemplate(scrapedData: any): any {
    const structure: any = {
      pages: [],
      globalStyles: scrapedData.styles || {},
      navigation: scrapedData.navigation || {},
      footer: scrapedData.footer || {},
      seo: scrapedData.seo || {},
    };

    // Convert pages
    if (scrapedData.pages && scrapedData.pages.length > 0) {
      structure.pages = scrapedData.pages.map((page: any) => ({
        id: page.id || `page-${Date.now()}`,
        path: page.path || '/',
        title: page.title || 'Page',
        components: this.convertPageToComponents(page),
        seo: page.seo || {},
      }));
    } else {
      // Create default page structure from scraped content
      structure.pages = [
        {
          id: 'home',
          path: '/',
          title: 'Home',
          components: this.extractComponentsFromScrapedData(scrapedData),
          seo: scrapedData.seo || {},
        },
      ];
    }

    return structure;
  }

  /**
   * Convert page data to components
   */
  private convertPageToComponents(page: any): any[] {
    const components: any[] = [];

    // Extract header/sections
    if (page.sections) {
      page.sections.forEach((section: any, index: number) => {
        components.push({
          id: `section-${index}`,
          type: this.determineComponentType(section),
          props: {
            content: section.content,
            styles: section.styles,
            images: section.images || [],
          },
        });
      });
    }

    // Extract forms
    if (page.forms && page.forms.length > 0) {
      page.forms.forEach((form: any, index: number) => {
        components.push({
          id: `form-${index}`,
          type: 'Form',
          props: {
            fields: form.fields || [],
            action: form.action,
            method: form.method,
          },
        });
      });
    }

    return components;
  }

  /**
   * Extract components from scraped data (when no page structure exists)
   */
  private extractComponentsFromScrapedData(scrapedData: any): any[] {
    const components: any[] = [];

    // Add hero section if available
    if (scrapedData.hero) {
      components.push({
        id: 'hero',
        type: 'Hero',
        props: {
          title: scrapedData.hero.title,
          subtitle: scrapedData.hero.subtitle,
          image: scrapedData.hero.image,
          cta: scrapedData.hero.cta,
        },
      });
    }

    // Add content sections
    if (scrapedData.content) {
      scrapedData.content.forEach((section: any, index: number) => {
        components.push({
          id: `content-${index}`,
          type: 'ContentSection',
          props: {
            title: section.title,
            content: section.content,
            images: section.images || [],
          },
        });
      });
    }

    // Add features/services/products
    if (scrapedData.features) {
      components.push({
        id: 'features',
        type: 'Features',
        props: {
          items: scrapedData.features,
        },
      });
    }

    // Add contact form if available
    if (scrapedData.forms && scrapedData.forms.length > 0) {
      components.push({
        id: 'contact-form',
        type: 'ContactForm',
        props: {
          fields: scrapedData.forms[0].fields || [],
        },
      });
    }

    return components;
  }

  /**
   * Determine component type from section data
   */
  private determineComponentType(section: any): string {
    const content = (section.content || '').toLowerCase();
    const title = (section.title || '').toLowerCase();

    if (title.includes('hero') || content.includes('hero')) return 'Hero';
    if (title.includes('feature') || content.includes('feature')) return 'Features';
    if (title.includes('service') || content.includes('service')) return 'Services';
    if (title.includes('product') || content.includes('product')) return 'Products';
    if (title.includes('about') || content.includes('about')) return 'About';
    if (title.includes('contact') || content.includes('contact')) return 'Contact';
    if (section.images && section.images.length > 0) return 'ImageSection';
    
    return 'ContentSection';
  }

  /**
   * Extract preview image from scraped data
   */
  private extractPreviewImage(scrapedData: any): string | null {
    // Try to find logo or first large image
    if (scrapedData.logo) return scrapedData.logo;
    if (scrapedData.images && scrapedData.images.length > 0) {
      // Find largest image (likely hero/header image)
      const largeImage = scrapedData.images.find((img: any) => 
        img.width > 500 || img.height > 500
      );
      if (largeImage) return largeImage.url;
      return scrapedData.images[0].url;
    }
    return null;
  }

  /**
   * Set a template as default for its type
   */
  async setDefaultTemplate(templateId: string) {
    const template = await prisma.websiteTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Unset other defaults of the same type
    await prisma.websiteTemplate.updateMany({
      where: {
        type: template.type,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this one as default
    await prisma.websiteTemplate.update({
      where: { id: templateId },
      data: { isDefault: true },
    });

    return template;
  }

  /**
   * Get all templates of a specific type
   */
  async getTemplatesByType(type: 'SERVICE' | 'PRODUCT') {
    return prisma.websiteTemplate.findMany({
      where: { type },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }
}

export const websiteTemplateImporter = new WebsiteTemplateImporter();
