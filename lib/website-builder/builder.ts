/**
 * Automated Website Building Service
 * Uses AI to generate websites from questionnaire answers and templates
 */

import type {
  WebsiteStructure,
  WebsitePage,
  Component,
  SEOData,
  QuestionnaireAnswers,
  WebsiteTemplateType,
} from './types';

export class WebsiteBuilder {
  /**
   * Build a website from questionnaire answers
   */
  async buildFromQuestionnaire(
    answers: QuestionnaireAnswers,
    templateType: WebsiteTemplateType,
    templateId?: string
  ): Promise<WebsiteStructure> {
    // If templateId is provided, use that template
    if (templateId) {
      return this.buildFromTemplate(answers, templateId);
    }

    // Otherwise, generate website structure based on template type
    if (templateType === 'SERVICE') {
      return this.buildServiceWebsite(answers);
    } else {
      return this.buildProductWebsite(answers);
    }
  }

  /**
   * Build a website from a saved template
   */
  async buildFromTemplate(
    answers: QuestionnaireAnswers,
    templateId: string
  ): Promise<WebsiteStructure> {
    const { prisma } = await import('@/lib/db');
    
    const template = await prisma.websiteTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Get template structure
    const templateStructure = template.structure as any;

    // Customize template with user's answers
    return this.customizeTemplate(templateStructure, answers);
  }

  /**
   * Customize template structure with user's data
   */
  private customizeTemplate(
    templateStructure: any,
    answers: QuestionnaireAnswers
  ): WebsiteStructure {
    // Deep clone the template structure
    const customized = JSON.parse(JSON.stringify(templateStructure));

    // Check if template has blog page
    const hasBlog = customized.pages?.some((page: any) => 
      page.id === 'blog' || 
      page.path === '/blog' || 
      page.name?.toLowerCase().includes('blog')
    );

    // Add blog page if requested and template doesn't have it
    if (answers.blog?.enabled && !hasBlog) {
      customized.pages = customized.pages || [];
      customized.pages.push(this.createBlogPage(answers));
    }

    // Replace placeholders with user data
    customized.pages = customized.pages.map((page: any) => ({
      ...page,
      title: this.replacePlaceholders(page.title, answers),
      components: page.components.map((component: any) => ({
        ...component,
        props: this.customizeComponentProps(component.props, answers),
      })),
    }));

    // Add CTA to existing blog pages if requested
    if (answers.blog?.includeCTA && hasBlog) {
      customized.pages = customized.pages.map((page: any) => {
        if (page.id === 'blog' || page.path === '/blog' || page.name?.toLowerCase().includes('blog')) {
          // Check if CTA already exists
          const hasCTA = page.components?.some((comp: any) => comp.type === 'CTASection');
          if (!hasCTA) {
            page.components = page.components || [];
            page.components.push({
              id: 'blog-cta',
              type: 'CTASection',
              props: {
                title: answers.blog.ctaText || 'Ready to Get Started?',
                description: `Contact ${answers.businessName} today to learn more`,
                ctaText: answers.blog.ctaText || 'Contact Us',
                ctaLink: answers.blog.ctaLink || '/contact',
                variant: 'primary',
              },
            });
          }
        }
        return page;
      });
    }

    // Customize global styles if needed
    if (answers.brandColor) {
      customized.globalStyles = {
        ...customized.globalStyles,
        colors: {
          ...customized.globalStyles?.colors,
          primary: answers.brandColor,
        },
      };
    }

    return customized;
  }

  /**
   * Replace placeholders in text with user data
   */
  private replacePlaceholders(text: string, answers: QuestionnaireAnswers): string {
    return text
      .replace(/\{\{businessName\}\}/g, answers.businessName || '')
      .replace(/\{\{businessDescription\}\}/g, answers.businessDescription || '')
      .replace(/\{\{contactEmail\}\}/g, answers.contactEmail || '')
      .replace(/\{\{contactPhone\}\}/g, answers.contactPhone || '');
  }

  /**
   * Customize component props with user data
   */
  private customizeComponentProps(props: any, answers: QuestionnaireAnswers): any {
    const customized = { ...props };

    // Customize common props
    if (props.title) {
      customized.title = this.replacePlaceholders(props.title, answers);
    }
    if (props.subtitle) {
      customized.subtitle = this.replacePlaceholders(props.subtitle, answers);
    }
    if (props.content) {
      customized.content = this.replacePlaceholders(props.content, answers);
    }
    if (props.ctaText) {
      customized.ctaText = this.replacePlaceholders(props.ctaText, answers);
    }

    // Customize services/products
    if (props.items && answers.services) {
      customized.items = answers.services.map((service: any, index: number) => ({
        ...(props.items[index] || {}),
        title: service.name || service.title,
        description: service.description,
      }));
    }
    if (props.items && answers.products) {
      customized.items = answers.products.map((product: any, index: number) => ({
        ...(props.items[index] || {}),
        title: product.name || product.title,
        description: product.description,
        price: product.price,
      }));
    }

    return customized;
  }

  /**
   * Build a service-based website
   */
  private buildServiceWebsite(answers: QuestionnaireAnswers): WebsiteStructure {
    const pages: WebsitePage[] = [];
    
    // Home page
    pages.push(this.createHomePage(answers, 'service'));
    
    // Services page
    if (answers.services && answers.services.length > 0) {
      pages.push(this.createServicesPage(answers));
    }
    
    // Blog page (if enabled)
    if (answers.blog?.enabled) {
      pages.push(this.createBlogPage(answers));
    }
    
    // About page
    pages.push(this.createAboutPage(answers));
    
    // Contact page
    pages.push(this.createContactPage(answers));
    
    // Legal pages (auto-generated from onboarding/questionnaire)
    pages.push(this.createPrivacyPage(answers));
    pages.push(this.createTermsPage(answers));
    
    return {
      pages,
      globalStyles: this.generateGlobalStyles(answers),
      navigation: this.generateNavigation(pages),
      footer: this.generateFooter(answers),
    };
  }

  /**
   * Build a product-based website
   */
  private buildProductWebsite(answers: QuestionnaireAnswers): WebsiteStructure {
    const pages: WebsitePage[] = [];
    
    // Home page
    pages.push(this.createHomePage(answers, 'product'));
    
    // Products page
    if (answers.products && answers.products.length > 0) {
      pages.push(this.createProductsPage(answers));
    }
    
    // Blog page (if enabled)
    if (answers.blog?.enabled) {
      pages.push(this.createBlogPage(answers));
    }
    
    // About page
    pages.push(this.createAboutPage(answers));
    
    // Contact page
    pages.push(this.createContactPage(answers));
    
    // Legal pages (auto-generated from onboarding/questionnaire)
    pages.push(this.createPrivacyPage(answers));
    pages.push(this.createTermsPage(answers));
    
    return {
      pages,
      globalStyles: this.generateGlobalStyles(answers),
      navigation: this.generateNavigation(pages),
      footer: this.generateFooter(answers),
    };
  }

  /**
   * Create home page
   */
  private createHomePage(answers: QuestionnaireAnswers, type: 'service' | 'product'): WebsitePage {
    const components: Component[] = [];
    
    // Hero section
    components.push({
      id: 'hero',
      type: 'Hero',
      props: {
        title: answers.businessName,
        subtitle: answers.businessDescription || '',
        ctaText: type === 'service' ? 'Get Started' : 'Shop Now',
        ctaLink: type === 'service' ? '/contact' : '/products',
        backgroundImage: answers.images?.[0],
      },
    });
    
    // Features/Services preview
    if (type === 'service' && answers.services) {
      components.push({
        id: 'services-preview',
        type: 'ServicesGrid',
        props: {
          services: answers.services.slice(0, 3).map((service: string) => ({
            name: service,
            description: `Professional ${service} services`,
          })),
          ctaText: 'View All Services',
          ctaLink: '/services',
        },
      });
    } else if (type === 'product' && answers.products) {
      components.push({
        id: 'products-preview',
        type: 'ProductsGrid',
        props: {
          products: answers.products.slice(0, 3).map((product: string) => ({
            name: product,
            image: answers.images?.[0],
          })),
          ctaText: 'View All Products',
          ctaLink: '/products',
        },
      });
    }
    
    // About section
    components.push({
      id: 'about-preview',
      type: 'AboutSection',
      props: {
        title: `About ${answers.businessName}`,
        description: answers.businessDescription || '',
        ctaText: 'Learn More',
        ctaLink: '/about',
      },
    });
    
    // Contact CTA
    components.push({
      id: 'contact-cta',
      type: 'CTASection',
      props: {
        title: 'Get in Touch',
        description: 'Contact us today to learn more',
        ctaText: 'Contact Us',
        ctaLink: '/contact',
      },
    });
    
    return {
      id: 'home',
      name: 'Home',
      path: '/',
      components,
      seo: {
        title: `${answers.businessName} - ${answers.businessDescription || 'Professional Services'}`,
        description: answers.businessDescription || '',
        keywords: answers.services || answers.products || [],
      },
    };
  }

  /**
   * Create services page
   */
  private createServicesPage(answers: QuestionnaireAnswers): WebsitePage {
    const components: Component[] = [];
    
    components.push({
      id: 'services-header',
      type: 'PageHeader',
      props: {
        title: 'Our Services',
        description: 'Professional services tailored to your needs',
      },
    });
    
    components.push({
      id: 'services-list',
      type: 'ServicesList',
      props: {
        services: answers.services?.map((service: string) => ({
          name: service,
          description: `Comprehensive ${service} solutions`,
          icon: 'service',
        })) || [],
      },
    });
    
    return {
      id: 'services',
      name: 'Services',
      path: '/services',
      components,
      seo: {
        title: `Services - ${answers.businessName}`,
        description: `Our professional services: ${answers.services?.join(', ')}`,
      },
    };
  }

  /**
   * Create products page
   */
  private createProductsPage(answers: QuestionnaireAnswers): WebsitePage {
    const components: Component[] = [];
    
    components.push({
      id: 'products-header',
      type: 'PageHeader',
      props: {
        title: 'Our Products',
        description: 'Quality products for your needs',
      },
    });
    
    components.push({
      id: 'products-grid',
      type: 'ProductsGrid',
      props: {
        products: answers.products?.map((product: string) => ({
          name: product,
          description: `High-quality ${product}`,
          image: answers.images?.[0],
        })) || [],
      },
    });
    
    return {
      id: 'products',
      name: 'Products',
      path: '/products',
      components,
      seo: {
        title: `Products - ${answers.businessName}`,
        description: `Our products: ${answers.products?.join(', ')}`,
      },
    };
  }

  /**
   * Create about page
   */
  private createAboutPage(answers: QuestionnaireAnswers): WebsitePage {
    const components: Component[] = [];
    
    components.push({
      id: 'about-header',
      type: 'PageHeader',
      props: {
        title: `About ${answers.businessName}`,
      },
    });
    
    components.push({
      id: 'about-content',
      type: 'AboutContent',
      props: {
        description: answers.businessDescription || '',
        mission: `Our mission is to provide exceptional service`,
        values: ['Quality', 'Integrity', 'Customer Focus'],
      },
    });
    
    return {
      id: 'about',
      name: 'About',
      path: '/about',
      components,
      seo: {
        title: `About Us - ${answers.businessName}`,
        description: `Learn more about ${answers.businessName}`,
      },
    };
  }

  /**
   * Create blog page
   */
  private createBlogPage(answers: QuestionnaireAnswers): WebsitePage {
    const components: Component[] = [];
    
    components.push({
      id: 'blog-header',
      type: 'PageHeader',
      props: {
        title: 'Blog',
        description: `Latest news and insights from ${answers.businessName}`,
      },
    });
    
    // Blog posts grid/list
    components.push({
      id: 'blog-posts',
      type: 'BlogPostsGrid',
      props: {
        posts: [], // Empty initially, will be populated by user
        showExcerpt: true,
        showDate: true,
        showAuthor: false,
        postsPerPage: 6,
      },
    });
    
    // CTA section if enabled
    if (answers.blog?.includeCTA) {
      components.push({
        id: 'blog-cta',
        type: 'CTASection',
        props: {
          title: answers.blog.ctaText || 'Ready to Get Started?',
          description: `Contact ${answers.businessName} today to learn more`,
          ctaText: answers.blog.ctaText || 'Contact Us',
          ctaLink: answers.blog.ctaLink || '/contact',
          variant: 'primary',
        },
      });
    }
    
    return {
      id: 'blog',
      name: 'Blog',
      path: '/blog',
      components,
      seo: {
        title: `Blog - ${answers.businessName}`,
        description: `Read the latest articles, news, and insights from ${answers.businessName}`,
        keywords: ['blog', 'news', 'articles', answers.businessName],
      },
    };
  }

  /**
   * Create contact page
   */
  private createContactPage(answers: QuestionnaireAnswers): WebsitePage {
    const components: Component[] = [];
    
    components.push({
      id: 'contact-header',
      type: 'PageHeader',
      props: {
        title: 'Contact Us',
        description: 'Get in touch with us today',
      },
    });
    
    components.push({
      id: 'contact-form',
      type: 'ContactForm',
      props: {
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'phone', type: 'tel', label: 'Phone' },
          { name: 'message', type: 'textarea', label: 'Message', required: true },
        ],
      },
    });
    
    components.push({
      id: 'contact-info',
      type: 'ContactInfo',
      props: {
        email: answers.contactInfo?.email,
        phone: answers.contactInfo?.phone,
        address: answers.contactInfo?.address,
      },
    });
    
    return {
      id: 'contact',
      name: 'Contact',
      path: '/contact',
      components,
      seo: {
        title: `Contact Us - ${answers.businessName}`,
        description: `Contact ${answers.businessName}`,
      },
    };
  }

  /**
   * Create privacy policy page (auto-generated from legal entity & jurisdiction)
   */
  private createPrivacyPage(answers: QuestionnaireAnswers): WebsitePage {
    const entity = answers.legalEntityName || answers.businessName;
    const jurisdiction = answers.legalJurisdiction || 'the applicable jurisdiction';
    const contactEmail = answers.contactInfo?.email || 'contact@example.com';
    const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = `
      <p><strong>Effective date:</strong> ${lastUpdated}</p>
      <p>${entity} ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>
      <h2>1. Information We Collect</h2>
      <p>We may collect information you provide directly (name, email, phone, address), usage data, and cookies or similar technologies.</p>
      <h2>2. How We Use Your Information</h2>
      <p>We use your information to provide and improve our services, communicate with you, and comply with legal obligations.</p>
      <h2>3. Sharing and Disclosure</h2>
      <p>We do not sell your personal information. We may share data with service providers, when required by law, or with your consent.</p>
      <h2>4. Data Retention and Security</h2>
      <p>We retain your information as long as necessary for the purposes described and use reasonable security measures to protect it.</p>
      <h2>5. Your Rights</h2>
      <p>Depending on your location (including ${jurisdiction}), you may have rights to access, correct, delete, or port your data. Contact us to exercise these rights.</p>
      <h2>6. Contact</h2>
      <p>For privacy questions, contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
    `.trim();

    return {
      id: 'privacy',
      name: 'Privacy Policy',
      path: '/privacy',
      components: [
        { id: 'privacy-header', type: 'PageHeader', props: { title: 'Privacy Policy', description: `Last updated: ${lastUpdated}` } },
        { id: 'privacy-content', type: 'HtmlContent', props: { html: content } },
      ],
      seo: {
        title: `Privacy Policy - ${answers.businessName}`,
        description: `Privacy Policy for ${answers.businessName}. How we collect, use, and protect your information.`,
      },
    };
  }

  /**
   * Create terms & conditions page (auto-generated from legal entity & jurisdiction)
   */
  private createTermsPage(answers: QuestionnaireAnswers): WebsitePage {
    const entity = answers.legalEntityName || answers.businessName;
    const jurisdiction = answers.legalJurisdiction || 'the applicable jurisdiction';
    const contactEmail = answers.contactInfo?.email || 'contact@example.com';
    const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const content = `
      <p><strong>Effective date:</strong> ${lastUpdated}</p>
      <p>These Terms and Conditions ("Terms") govern your use of the website and services of ${entity}. By accessing or using our services, you agree to these Terms.</p>
      <h2>1. Use of Service</h2>
      <p>You agree to use our website and services only for lawful purposes and in accordance with these Terms.</p>
      <h2>2. Intellectual Property</h2>
      <p>Content, logos, and materials on this site are owned by ${entity} or its licensors and are protected by intellectual property laws.</p>
      <h2>3. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law in ${jurisdiction}, ${entity} shall not be liable for indirect, incidental, or consequential damages arising from your use of our services.</p>
      <h2>4. Changes</h2>
      <p>We may update these Terms from time to time. Continued use after changes constitutes acceptance.</p>
      <h2>5. Governing Law</h2>
      <p>These Terms are governed by the laws of ${jurisdiction}.</p>
      <h2>6. Contact</h2>
      <p>For questions about these Terms, contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
    `.trim();

    return {
      id: 'terms',
      name: 'Terms & Conditions',
      path: '/terms',
      components: [
        { id: 'terms-header', type: 'PageHeader', props: { title: 'Terms & Conditions', description: `Last updated: ${lastUpdated}` } },
        { id: 'terms-content', type: 'HtmlContent', props: { html: content } },
      ],
      seo: {
        title: `Terms & Conditions - ${answers.businessName}`,
        description: `Terms and Conditions for using ${answers.businessName} website and services.`,
      },
    };
  }

  /**
   * Generate global styles from answers
   */
  private generateGlobalStyles(answers: QuestionnaireAnswers): any {
    const colors = answers.brandColors || ['#3B82F6', '#1E40AF', '#60A5FA'];
    
    return {
      colors: {
        primary: colors[0] || '#3B82F6',
        secondary: colors[1] || '#1E40AF',
        accent: colors[2] || '#60A5FA',
        background: '#FFFFFF',
        text: '#1F2937',
      },
      fonts: {
        heading: 'Inter, sans-serif',
        body: 'Inter, sans-serif',
      },
      spacing: {
        unit: 8,
      },
    };
  }

  /**
   * Generate navigation from pages
   */
  private generateNavigation(pages: WebsitePage[]): any {
    const legalPaths = ['/privacy', '/terms'];
    return {
      items: pages
        .filter(page => page.path !== '/' && !legalPaths.includes(page.path))
        .map(page => ({
          label: page.name,
          path: page.path,
        })),
      style: 'horizontal',
    };
  }

  /**
   * Generate footer
   */
  private generateFooter(answers: QuestionnaireAnswers): any {
    return {
      sections: [
        {
          title: 'Company',
          links: [
            { label: 'About', url: '/about' },
            { label: 'Contact', url: '/contact' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Privacy Policy', url: '/privacy' },
            { label: 'Terms & Conditions', url: '/terms' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} ${answers.businessName}. All rights reserved.`,
    };
  }
}

export const websiteBuilder = new WebsiteBuilder();
