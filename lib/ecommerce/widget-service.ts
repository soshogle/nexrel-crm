
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * E-commerce Widget Service
 * Manages embeddable product widgets for merchant websites
 */
export class WidgetService {
  /**
   * Create a new widget configuration
   */
  async createWidget(params: {
    userId: string;
    storefrontId?: string;
    name: string;
    description?: string;
    theme?: string;
    layout?: string;
    primaryColor?: string;
    accentColor?: string;
    borderRadius?: number;
    productIds: string[];
    categoryFilter?: string;
    maxProducts?: number;
    showOutOfStock?: boolean;
    showPrices?: boolean;
    showAddToCart?: boolean;
    showQuickView?: boolean;
    showSearch?: boolean;
    enableCheckout?: boolean;
    checkoutUrl?: string;
    allowedDomains?: string[];
  }) {
    // Generate unique API key for the widget
    const apiKey = crypto.randomBytes(32).toString('hex');

    return await prisma.ecommerceWidget.create({
      data: {
        userId: params.userId,
        storefrontId: params.storefrontId,
        name: params.name,
        description: params.description,
        isActive: true,
        theme: (params.theme as any) || 'LIGHT',
        layout: (params.layout as any) || 'GRID',
        primaryColor: params.primaryColor || '#3b82f6',
        accentColor: params.accentColor || '#10b981',
        borderRadius: params.borderRadius || 8,
        productIds: params.productIds,
        categoryFilter: params.categoryFilter,
        maxProducts: params.maxProducts || 12,
        showOutOfStock: params.showOutOfStock ?? false,
        showPrices: params.showPrices ?? true,
        showAddToCart: params.showAddToCart ?? true,
        showQuickView: params.showQuickView ?? true,
        showSearch: params.showSearch ?? true,
        enableCheckout: params.enableCheckout ?? true,
        checkoutUrl: params.checkoutUrl,
        allowedDomains: params.allowedDomains || [],
        apiKey,
      },
    });
  }

  /**
   * Update widget configuration
   */
  async updateWidget(widgetId: string, userId: string, updates: any) {
    // Verify ownership
    const widget = await prisma.ecommerceWidget.findFirst({
      where: { id: widgetId, userId },
    });

    if (!widget) {
      throw new Error('Widget not found or access denied');
    }

    return await prisma.ecommerceWidget.update({
      where: { id: widgetId },
      data: updates,
    });
  }

  /**
   * Get all widgets for a user
   */
  async getWidgets(userId: string) {
    return await prisma.ecommerceWidget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get widget by ID
   */
  async getWidget(widgetId: string, userId?: string) {
    const where: any = { id: widgetId };
    if (userId) {
      where.userId = userId;
    }

    return await prisma.ecommerceWidget.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        storefront: true,
      },
    });
  }

  /**
   * Get widget by API key (for public access)
   */
  async getWidgetByApiKey(apiKey: string) {
    return await prisma.ecommerceWidget.findUnique({
      where: { apiKey },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        storefront: true,
      },
    });
  }

  /**
   * List all widgets for a user
   */
  async listWidgets(userId: string) {
    return await prisma.ecommerceWidget.findMany({
      where: { userId },
      include: {
        storefront: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete widget
   */
  async deleteWidget(widgetId: string, userId: string) {
    // Verify ownership
    const widget = await prisma.ecommerceWidget.findFirst({
      where: { id: widgetId, userId },
    });

    if (!widget) {
      throw new Error('Widget not found or access denied');
    }

    return await prisma.ecommerceWidget.delete({
      where: { id: widgetId },
    });
  }

  /**
   * Track widget impression
   */
  async trackImpression(params: {
    widgetId: string;
    sessionId?: string;
    domain?: string;
    referrer?: string;
    userAgent?: string;
    deviceType?: string;
  }) {
    // Create analytics record
    await prisma.widgetAnalytics.create({
      data: {
        widgetId: params.widgetId,
        eventType: 'impression',
        sessionId: params.sessionId,
        domain: params.domain,
        referrer: params.referrer,
        userAgent: params.userAgent,
        deviceType: params.deviceType,
      },
    });

    // Increment widget impressions counter
    await prisma.ecommerceWidget.update({
      where: { id: params.widgetId },
      data: {
        impressions: { increment: 1 },
      },
    });
  }

  /**
   * Track widget click
   */
  async trackClick(params: {
    widgetId: string;
    productId?: string;
    sessionId?: string;
    domain?: string;
    userAgent?: string;
    deviceType?: string;
  }) {
    // Create analytics record
    await prisma.widgetAnalytics.create({
      data: {
        widgetId: params.widgetId,
        eventType: 'click',
        productId: params.productId,
        sessionId: params.sessionId,
        domain: params.domain,
        userAgent: params.userAgent,
        deviceType: params.deviceType,
      },
    });

    // Increment widget clicks counter
    await prisma.ecommerceWidget.update({
      where: { id: params.widgetId },
      data: {
        clicks: { increment: 1 },
      },
    });
  }

  /**
   * Track widget conversion (add to cart)
   */
  async trackConversion(params: {
    widgetId: string;
    productId: string;
    conversionValue: number;
    sessionId?: string;
    domain?: string;
    userAgent?: string;
    deviceType?: string;
  }) {
    // Create analytics record
    await prisma.widgetAnalytics.create({
      data: {
        widgetId: params.widgetId,
        eventType: 'add_to_cart',
        productId: params.productId,
        conversionValue: params.conversionValue,
        sessionId: params.sessionId,
        domain: params.domain,
        userAgent: params.userAgent,
        deviceType: params.deviceType,
      },
    });

    // Increment widget conversions counter
    await prisma.ecommerceWidget.update({
      where: { id: params.widgetId },
      data: {
        conversions: { increment: 1 },
      },
    });
  }

  /**
   * Get widget analytics summary
   */
  async getAnalytics(widgetId: string, userId: string, filter?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
  }) {
    // Verify ownership
    const widget = await prisma.ecommerceWidget.findFirst({
      where: { id: widgetId, userId },
    });

    if (!widget) {
      throw new Error('Widget not found or access denied');
    }

    const where: any = { widgetId };
    
    if (filter?.eventType) {
      where.eventType = filter.eventType;
    }
    
    if (filter?.startDate || filter?.endDate) {
      where.timestamp = {};
      if (filter.startDate) where.timestamp.gte = filter.startDate;
      if (filter.endDate) where.timestamp.lte = filter.endDate;
    }

    const analytics = await prisma.widgetAnalytics.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    // Calculate summary metrics
    const summary = {
      totalEvents: analytics.length,
      impressions: analytics.filter((a) => a.eventType === 'impression').length,
      clicks: analytics.filter((a) => a.eventType === 'click').length,
      conversions: analytics.filter((a) => a.eventType === 'add_to_cart').length,
      conversionValue: analytics
        .filter((a) => a.eventType === 'add_to_cart')
        .reduce((sum, a) => sum + (a.conversionValue || 0), 0),
      clickThroughRate: 0,
      conversionRate: 0,
    };

    if (summary.impressions > 0) {
      summary.clickThroughRate = (summary.clicks / summary.impressions) * 100;
      summary.conversionRate = (summary.conversions / summary.impressions) * 100;
    }

    return {
      widget,
      summary,
      recentEvents: analytics.slice(0, 50), // Last 50 events
    };
  }

  /**
   * Generate embed code for widget
   */
  generateEmbedCode(widget: any, options?: {
    width?: string;
    height?: string;
  }) {
    const width = options?.width || '100%';
    const height = options?.height || '600px';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://go-high-or-show-goog-8dv76n.abacusai.app';
    const embedUrl = `${baseUrl}/api/widgets/${widget.apiKey}/embed`;

    return {
      iframe: `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" scrolling="auto"></iframe>`,
      script: `<script src="${baseUrl}/api/widgets/${widget.apiKey}/widget.js"></script>
<div id="soshogle-widget-${widget.apiKey}" data-api-key="${widget.apiKey}"></div>`,
      preview: embedUrl,
    };
  }

  /**
   * Get products for widget display
   */
  async getWidgetProducts(widgetId: string) {
    const widget = await prisma.ecommerceWidget.findUnique({
      where: { id: widgetId },
    });

    if (!widget) {
      throw new Error('Widget not found');
    }

    const where: any = {
      userId: widget.userId,
    };

    // Filter by product IDs if specified
    if (widget.productIds && widget.productIds.length > 0) {
      where.id = { in: widget.productIds };
    }

    // Filter by category if specified
    if (widget.categoryFilter) {
      where.categoryId = widget.categoryFilter;
    }

    // Filter out of stock if not showing them
    if (!widget.showOutOfStock) {
      where.stock = { gt: 0 };
    }

    const products = await prisma.product.findMany({
      where,
      take: widget.maxProducts,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });

    return products;
  }

  /**
   * Get widget analytics (alias for getAnalytics)
   */
  async getWidgetAnalytics(widgetId: string, userId: string, filter?: {
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
  }) {
    return this.getAnalytics(widgetId, userId, filter);
  }

  /**
   * Get widget preview data
   */
  async getWidgetPreview(widgetId: string, userId?: string) {
    const widget = await this.getWidget(widgetId, userId);
    if (!widget) {
      throw new Error('Widget not found');
    }

    const products = await this.getWidgetProducts(widgetId);

    return {
      widget,
      products,
      previewUrl: `/widgets/${widgetId}/preview`,
    };
  }

  /**
   * Track widget embed (impression on page load)
   */
  async trackEmbed(params: {
    widgetConfigId: string;
    domain?: string;
    referrer?: string;
    userAgent?: string;
    sessionId?: string;
  }) {
    return this.trackImpression({
      widgetId: params.widgetConfigId,
      domain: params.domain,
      referrer: params.referrer,
      userAgent: params.userAgent || 'Widget Embed',
      sessionId: params.sessionId,
    });
  }
}

export const widgetService = new WidgetService();
