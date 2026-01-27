
/**
 * Onboarding Configuration Service
 * Automatically configures system based on collected user data
 */

import { prisma } from './db';

export interface OnboardingData {
  businessName?: string;
  business_name?: string;
  industry?: string;
  services?: string[];
  businessHours?: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  contactChannels?: string[];
  paymentPreferences?: string[];
  website?: string;
  description?: string;
  about?: string;
  logo?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  [key: string]: any; // Allow additional dynamic fields from scraping
}

class OnboardingConfigService {
  /**
   * Apply all configuration from onboarding data
   */
  async applyConfiguration(userId: string, data: OnboardingData): Promise<boolean> {
    try {
      // 1. Update user profile with business info
      await this.updateBusinessProfile(userId, data);

      // 2. Create knowledge base entries
      await this.createKnowledgeBase(userId, data);

      // 3. Configure business hours
      await this.configureBusinessHours(userId, data);

      // 4. Set up default templates
      await this.createDefaultTemplates(userId, data);

      // 5. Mark onboarding as complete
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingProgress: JSON.stringify({ completed: true, completedAt: new Date() }),
        },
      });

      return true;
    } catch (error) {
      console.error('Configuration error:', error);
      return false;
    }
  }

  /**
   * Update user's business profile
   */
  private async updateBusinessProfile(userId: string, data: OnboardingData) {
    const updateData: any = {};
    
    // Map onboarding data to user profile fields
    if (data.businessName || data.business_name) {
      updateData.name = data.businessName || data.business_name;
    }
    
    if (data.industry) {
      updateData.industry = data.industry;
    }
    
    if (data.about || data.description) {
      updateData.businessDescription = data.about || data.description;
    }
    
    if (data.website) {
      updateData.website = data.website;
    }
    
    if (data.contact_email) {
      // Note: email is typically not updated as it's the user's login
      // But we can store it in a separate business email field if available
    }
    
    if (data.contact_phone) {
      updateData.phone = data.contact_phone;
    }
    
    if (data.contact_address) {
      updateData.address = data.contact_address;
    }
    
    if (data.logo) {
      updateData.image = data.logo;
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  /**
   * Create knowledge base entries from collected data
   */
  private async createKnowledgeBase(userId: string, data: OnboardingData) {
    const entries: any[] = [];
    
    // Add business info if available
    if (data.businessName || data.business_name) {
      const businessName = data.businessName || data.business_name;
      const industry = data.industry || 'various industries';
      const description = data.description || data.about || '';
      
      entries.push({
        category: 'business_info',
        title: 'About Our Business',
        content: `We are ${businessName}, operating in the ${industry} industry. ${description}`,
        tags: JSON.stringify(['business', 'about']),
        priority: 10,
      });
    }
    
    // Add services if available
    if (data.services && Array.isArray(data.services) && data.services.length > 0) {
      entries.push({
        category: 'services',
        title: 'Our Services',
        content: `We offer the following services: ${data.services.join(', ')}`,
        tags: JSON.stringify(['services', 'offerings']),
        priority: 9,
      });
    }

    // Add website if available
    if (data.website) {
      entries.push({
        category: 'contact',
        title: 'Website',
        content: `Visit our website at ${data.website}`,
        tags: JSON.stringify(['website', 'contact']),
        priority: 8,
      });
    }

    // Create knowledge base entries
    for (const entry of entries) {
      await prisma.knowledgeBase.create({
        data: {
          ...entry,
          userId,
        },
      });
    }
  }

  /**
   * Configure business hours in auto-reply settings
   */
  private async configureBusinessHours(userId: string, data: OnboardingData) {
    // Check if settings exist
    const existing = await prisma.autoReplySettings.findUnique({
      where: { userId },
    });

    const businessDays = JSON.stringify(data.businessHours);

    if (existing) {
      await prisma.autoReplySettings.update({
        where: { userId },
        data: { businessDays },
      });
    } else {
      await prisma.autoReplySettings.create({
        data: {
          userId,
          isEnabled: true,
          responseTone: 'professional',
          responseLanguage: 'en',
          businessDays,
          confidenceThreshold: 0.7,
          businessHoursEnabled: true,
        },
      });
    }
  }

  /**
   * Create default message templates
   */
  private async createDefaultTemplates(userId: string, data: OnboardingData) {
    const templates = [
      {
        title: 'Welcome Message',
        content: `Hi! Thank you for contacting ${data.businessName}. How can we help you today?`,
        category: 'greeting',
      },
      {
        title: 'Business Hours',
        content: `We're available during our business hours. We'll get back to you as soon as possible!`,
        category: 'auto_reply',
      },
    ];

    // Store templates in knowledge base with special category
    for (const template of templates) {
      await prisma.knowledgeBase.create({
        data: {
          userId,
          category: 'template',
          title: template.title,
          content: template.content,
          tags: JSON.stringify([template.category]),
          priority: 5,
        },
      });
    }
  }
}

export const onboardingConfigService = new OnboardingConfigService();
