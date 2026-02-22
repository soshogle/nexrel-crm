/**
 * Visitor Tracking Service
 * Handles both Google Analytics and basic tracking for website visitors
 */

import { getCrmDb } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';

export interface VisitorEvent {
  websiteId: string;
  sessionId: string;
  eventType: 'page_view' | 'cta_click' | 'form_submit' | 'product_view' | 'add_to_cart' | 'purchase';
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface VisitorSession {
  websiteId: string;
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  pagesVisited: string[];
  timeOnSite: number; // in seconds
  referrer?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  isReturning: boolean;
}

export class WebsiteVisitorTrackingService {
  /**
   * Track a visitor event
   */
  async trackEvent(event: VisitorEvent) {
    const website = await getCrmDb(createDalContext('bootstrap')).website.findUnique({
      where: { id: event.websiteId },
      select: { userId: true },
    });
    if (!website) return;

    const ctx = createDalContext(website.userId);
    const db = getCrmDb(ctx);

    // Get or create visitor session
    let visitor = await db.websiteVisitor.findFirst({
      where: {
        websiteId: event.websiteId,
        sessionId: event.sessionId,
      },
    });

    const now = new Date();
    const pagesVisited = visitor?.pagesVisited as string[] || [];
    
    // Add page to visited pages if it's a page view
    if (event.eventType === 'page_view' && event.pageUrl) {
      if (!pagesVisited.includes(event.pageUrl)) {
        pagesVisited.push(event.pageUrl);
      }
    }

    // Calculate time on site
    const timeOnSite = visitor
      ? Math.floor((now.getTime() - new Date(visitor.createdAt).getTime()) / 1000)
      : 0;

    // Update or create visitor record
    if (visitor) {
      await db.websiteVisitor.update({
        where: { id: visitor.id },
        data: {
          pagesVisited,
          interactions: {
            ...((visitor.interactions as any) || {}),
            [event.eventType]: [
              ...((visitor.interactions as any)?.[event.eventType] || []),
              {
                timestamp: now.toISOString(),
                ...event.metadata,
                ...(event.pageUrl && { pageUrl: event.pageUrl }),
              },
            ],
          },
          ...(event.formData && { formData: event.formData }),
        },
      });
    } else {
      // Check if returning visitor (by IP or other identifier)
      const existingVisitor = await db.websiteVisitor.findFirst({
        where: {
          websiteId: event.websiteId,
          ipAddress: event.ipAddress,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      visitor = await db.websiteVisitor.create({
        data: {
          websiteId: event.websiteId,
          sessionId: event.sessionId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          referrer: event.referrer || event.referrer,
          pagesVisited,
          interactions: {
            [event.eventType]: [
              {
                timestamp: now.toISOString(),
                ...event.metadata,
                ...(event.pageUrl && { pageUrl: event.pageUrl }),
              },
            ],
          },
          ...(event.formData && { formData: event.formData }),
        },
      });

      // If returning visitor, trigger workflow
      if (existingVisitor) {
        // Trigger returning visitor workflow
        const workflowEngine = (await import('@/lib/workflow-engine')).workflowEngine;
        await workflowEngine.triggerWorkflow('WEBSITE_VISITOR_RETURNING', {
          userId: website.userId,
          variables: {
            websiteId: event.websiteId,
            sessionId: event.sessionId,
            previousVisitDate: existingVisitor.createdAt,
          },
        }).catch((err) => console.error('Failed to trigger returning visitor workflow:', err));
      }
    }

    // Send to Google Analytics if configured
    const websiteConfig = await db.website.findUnique({
      where: { id: event.websiteId },
      select: { googleAnalyticsId: true },
    });

    if (websiteConfig?.googleAnalyticsId) {
      await this.sendToGoogleAnalytics(event, websiteConfig.googleAnalyticsId);
    }

    // Send to Facebook Pixel if configured
    const websiteWithPixel = await db.website.findUnique({
      where: { id: event.websiteId },
      select: { facebookPixelId: true },
    });

    if (websiteWithPixel?.facebookPixelId) {
      await this.sendToFacebookPixel(event, websiteWithPixel.facebookPixelId);
    }

    return visitor;
  }

  /**
   * Send event to Google Analytics
   */
  private async sendToGoogleAnalytics(event: VisitorEvent, gaId: string) {
    // Use Measurement Protocol API or gtag
    // For now, this would be handled client-side via gtag
    // Server-side tracking can be added if needed
    console.log(`[GA] Tracking event: ${event.eventType} for website ${event.websiteId}`);
  }

  /**
   * Send event to Facebook Pixel
   */
  private async sendToFacebookPixel(event: VisitorEvent, pixelId: string) {
    // Facebook Pixel events are typically sent client-side
    // Server-side API can be added if needed
    console.log(`[FB Pixel] Tracking event: ${event.eventType} for website ${event.websiteId}`);
  }

  /**
   * Get visitor session data
   */
  async getVisitorSession(websiteId: string, sessionId: string): Promise<VisitorSession | null> {
    const website = await getCrmDb(createDalContext('bootstrap')).website.findUnique({
      where: { id: websiteId },
      select: { userId: true },
    });
    if (!website) return null;

    const ctx = createDalContext(website.userId);
    const db = getCrmDb(ctx);

    const visitor = await db.websiteVisitor.findFirst({
      where: {
        websiteId,
        sessionId,
      },
    });

    if (!visitor) return null;

    const pagesVisited = (visitor.pagesVisited as string[]) || [];
    const timeOnSite = Math.floor(
      (new Date().getTime() - new Date(visitor.createdAt).getTime()) / 1000
    );

    // Check if returning visitor
    const previousVisit = await db.websiteVisitor.findFirst({
      where: {
        websiteId,
        ipAddress: visitor.ipAddress,
        id: { not: visitor.id },
        createdAt: {
          lt: visitor.createdAt,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      websiteId,
      sessionId,
      startTime: visitor.createdAt,
      lastActivity: new Date(),
      pagesVisited,
      timeOnSite,
      referrer: visitor.referrer || undefined,
      deviceType: this.detectDeviceType(visitor.userAgent || ''),
      isReturning: !!previousVisit,
    };
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    const ua = userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Track cart abandonment
   */
  async trackCartAbandonment(websiteId: string, sessionId: string, cartData: any) {
    const visitor = await this.getVisitorSession(websiteId, sessionId);
    
    if (visitor && cartData.items && cartData.items.length > 0) {
      const website = await getCrmDb(createDalContext('bootstrap')).website.findUnique({
        where: { id: websiteId },
        select: { userId: true },
      });
      const userId = website?.userId;
      if (!userId) return;

      const ctx = createDalContext(userId);
      const db = getCrmDb(ctx);

      // Wait 30 minutes - if no purchase, trigger abandonment
      setTimeout(async () => {
        const order = await db.order.findFirst({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
            },
            items: {
              some: {
                productSku: { in: cartData.items.map((i: any) => i.sku) },
              },
            },
          },
        });

        if (!order) {
          // Cart was abandoned - trigger workflow
          const workflowEngine = (await import('@/lib/workflow-engine')).workflowEngine;
          await workflowEngine.triggerWorkflow('WEBSITE_VISITOR_ABANDONED_CART', {
            userId,
            variables: {
              websiteId,
              sessionId,
              cartValue: cartData.total || 0,
              items: cartData.items,
            },
          }).catch((err) => console.error('Failed to trigger cart abandonment workflow:', err));
        }
      }, 30 * 60 * 1000); // 30 minutes
    }
  }
}

export const websiteVisitorTrackingService = new WebsiteVisitorTrackingService();
