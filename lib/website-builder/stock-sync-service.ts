/**
 * Website Stock Synchronization Service
 * Handles real-time stock updates and synchronization between inventory and websites
 */

import { prisma } from '@/lib/db';
import { websiteStockNotificationService } from './stock-notification-service';
import { workflowEngine } from '@/lib/workflow-engine';

export interface StockUpdate {
  productId: string;
  sku: string;
  quantity: number;
  previousQuantity: number;
  websiteId?: string; // If specific to one website
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  websiteId?: string;
  userId: string;
}

export class WebsiteStockSyncService {
  /**
   * Sync stock changes to all websites that have this product
   */
  async syncStockToWebsites(update: StockUpdate) {
    const { productId, sku, quantity, previousQuantity, websiteId } = update;

    // Get all websites that have this product
    const websiteProducts = await prisma.websiteProduct.findMany({
      where: {
        productId,
        ...(websiteId ? { websiteId } : {}),
        isVisible: true,
      },
      include: {
        website: {
          include: {
            stockSettings: true,
          },
        },
        product: true,
      },
    });

    const updates: Array<{
      websiteId: string;
      productId: string;
      action: 'UPDATE' | 'HIDE' | 'SHOW' | 'PRE_ORDER';
      stock: number;
    }> = [];

    for (const wp of websiteProducts) {
      const settings = wp.website.stockSettings;
      const product = wp.product;

      // Check if product should be hidden/shown based on stock
      if (settings) {
        if (quantity === 0 && settings.autoHideOutOfStock) {
          // Hide product if out of stock
          if (settings.outOfStockAction === 'HIDE') {
            await prisma.websiteProduct.update({
              where: { id: wp.id },
              data: { isVisible: false },
            });
            updates.push({
              websiteId: wp.websiteId,
              productId,
              action: 'HIDE',
              stock: 0,
            });
          } else if (settings.outOfStockAction === 'PRE_ORDER') {
            // Keep visible but mark as pre-order
            updates.push({
              websiteId: wp.websiteId,
              productId,
              action: 'PRE_ORDER',
              stock: 0,
            });
          } else {
            // SHOW_OUT_OF_STOCK - keep visible
            updates.push({
              websiteId: wp.websiteId,
              productId,
              action: 'UPDATE',
              stock: 0,
            });
          }
        } else if (previousQuantity === 0 && quantity > 0) {
          // Product back in stock - show it
          await prisma.websiteProduct.update({
            where: { id: wp.id },
            data: { isVisible: true },
          });
          updates.push({
            websiteId: wp.websiteId,
            productId,
            action: 'SHOW',
            stock: quantity,
          });

          // Fulfill pre-orders if enabled
          if (settings?.outOfStockAction === 'PRE_ORDER') {
            try {
              const preOrderService = (await import('./pre-order-service')).websitePreOrderService;
              await preOrderService.fulfillPreOrders(productId, quantity);
            } catch (error) {
              console.error('Failed to fulfill pre-orders:', error);
            }
          }
        } else {
          // Just update stock
          updates.push({
            websiteId: wp.websiteId,
            productId,
            action: 'UPDATE',
            stock: quantity,
          });
        }
      } else {
        // No settings - default behavior: hide if out of stock
        if (quantity === 0) {
          await prisma.websiteProduct.update({
            where: { id: wp.id },
            data: { isVisible: false },
          });
          updates.push({
            websiteId: wp.websiteId,
            productId,
            action: 'HIDE',
            stock: 0,
          });
        } else {
          updates.push({
            websiteId: wp.websiteId,
            productId,
            action: 'UPDATE',
            stock: quantity,
          });
        }
      }

      // Check for low stock alert and send notifications
      if (settings && quantity <= settings.lowStockThreshold && quantity > 0) {
        await this.checkAndSendLowStockAlert({
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock: quantity,
          threshold: settings.lowStockThreshold,
          websiteId: wp.websiteId,
          userId: wp.website.userId,
        });

        // Send email/SMS notification
        await websiteStockNotificationService.sendStockAlert({
          websiteId: wp.websiteId,
          websiteName: wp.website.name,
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock: quantity,
          threshold: settings.lowStockThreshold,
          status: 'LOW_STOCK',
          userId: wp.website.userId,
        }).catch((err) => {
          console.error('Failed to send stock alert notification:', err);
        });

        // Trigger workflow
        await workflowEngine.triggerWorkflow('WEBSITE_PRODUCT_LOW_STOCK', {
          userId: wp.website.userId,
          variables: {
            websiteId: wp.websiteId,
            productId,
            productName: product.name,
            sku: product.sku,
            currentStock: quantity,
            threshold: settings.lowStockThreshold,
          },
        }).catch((err) => {
          console.error('Failed to trigger workflow:', err);
        });
      }

      // Check for out of stock
      if (quantity === 0 && previousQuantity > 0) {
        // Product just went out of stock
        await websiteStockNotificationService.sendStockAlert({
          websiteId: wp.websiteId,
          websiteName: wp.website.name,
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock: 0,
          threshold: settings?.lowStockThreshold || 10,
          status: 'OUT_OF_STOCK',
          userId: wp.website.userId,
        }).catch((err) => {
          console.error('Failed to send out of stock notification:', err);
        });

        // Trigger workflow
        await workflowEngine.triggerWorkflow('WEBSITE_PRODUCT_OUT_OF_STOCK', {
          userId: wp.website.userId,
          variables: {
            websiteId: wp.websiteId,
            productId,
            productName: product.name,
            sku: product.sku,
          },
        }).catch((err) => {
          console.error('Failed to trigger workflow:', err);
        });
      }

      // Check for back in stock
      if (previousQuantity === 0 && quantity > 0) {
        // Product just came back in stock
        await websiteStockNotificationService.sendStockAlert({
          websiteId: wp.websiteId,
          websiteName: wp.website.name,
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock: quantity,
          threshold: settings?.lowStockThreshold || 10,
          status: 'BACK_IN_STOCK',
          userId: wp.website.userId,
        }).catch((err) => {
          console.error('Failed to send back in stock notification:', err);
        });

        // Trigger workflow
        await workflowEngine.triggerWorkflow('WEBSITE_PRODUCT_BACK_IN_STOCK', {
          userId: wp.website.userId,
          variables: {
            websiteId: wp.websiteId,
            productId,
            productName: product.name,
            sku: product.sku,
            currentStock: quantity,
          },
        }).catch((err) => {
          console.error('Failed to trigger workflow:', err);
        });
      }
    }

    return updates;
  }

  /**
   * Check and send low stock alert if needed
   */
  private async checkAndSendLowStockAlert(alert: LowStockAlert) {
    const { productId, websiteId, userId } = alert;

    // Store alert in database (we'll create a simple table or use existing structure)
    // For now, we'll log it and could trigger workflows/emails
    
    // Check if we've already sent an alert recently (within last 24 hours)
    // Using a simple approach: store in a JSON field or check recent orders/adjustments
    const recentAdjustment = await prisma.generalInventoryAdjustment.findFirst({
      where: {
        userId,
        itemId: productId,
        type: 'SALE',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        notes: {
          contains: 'low_stock_alert',
        },
      },
    });

    if (recentAdjustment) {
      // Already sent alert recently
      return;
    }

    // Create a record of the alert (we can enhance this later with a dedicated table)
    // For now, create a task or note for the user
    try {
      await prisma.task.create({
        data: {
          userId,
          title: `Low Stock Alert: ${alert.productName}`,
          description: `${alert.productName} (SKU: ${alert.sku}) is running low. Current stock: ${alert.currentStock}, Threshold: ${alert.threshold}`,
          priority: 'HIGH',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
          metadata: {
            type: 'LOW_STOCK_ALERT',
            productId: alert.productId,
            productName: alert.productName,
            sku: alert.sku,
            currentStock: alert.currentStock,
            threshold: alert.threshold,
            websiteId: alert.websiteId,
          },
        },
      });
    } catch (e) {
      // Task creation failed, log it
      console.error('Failed to create low stock alert task:', e);
    }

    // TODO: Trigger workflow if exists
    // await workflowEngine.triggerWorkflow('WEBSITE_PRODUCT_LOW_STOCK', { ... });
    
    // TODO: Send email/SMS notification
    // await sendEmailNotification(userId, { ... });
  }

  /**
   * Get stock status for a website
   */
  async getWebsiteStockStatus(websiteId: string) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        websiteProducts: {
          include: {
            product: true,
          },
        },
        stockSettings: true,
      },
    });

    if (!website) {
      throw new Error('Website not found');
    }

    const settings = website.stockSettings || {
      lowStockThreshold: 10,
      outOfStockAction: 'HIDE',
      syncInventory: true,
      autoHideOutOfStock: true,
    };

    const products = website.websiteProducts.map((wp) => ({
      id: wp.productId,
      name: wp.product.name,
      sku: wp.product.sku,
      stock: wp.product.inventory,
      isVisible: wp.isVisible,
      isLowStock: wp.product.inventory <= settings.lowStockThreshold,
      isOutOfStock: wp.product.inventory === 0,
      status: wp.product.inventory === 0
        ? settings.outOfStockAction === 'PRE_ORDER'
          ? 'PRE_ORDER'
          : 'OUT_OF_STOCK'
        : wp.product.inventory <= settings.lowStockThreshold
        ? 'LOW_STOCK'
        : 'IN_STOCK',
    }));

    return {
      websiteId,
      settings,
      products,
      summary: {
        total: products.length,
        inStock: products.filter((p) => p.status === 'IN_STOCK').length,
        lowStock: products.filter((p) => p.status === 'LOW_STOCK').length,
        outOfStock: products.filter((p) => p.status === 'OUT_OF_STOCK').length,
        preOrder: products.filter((p) => p.status === 'PRE_ORDER').length,
      },
    };
  }

  /**
   * Update stock settings for a website
   */
  async updateStockSettings(
    websiteId: string,
    settings: {
      lowStockThreshold?: number;
      outOfStockAction?: 'HIDE' | 'SHOW_OUT_OF_STOCK' | 'PRE_ORDER';
      syncInventory?: boolean;
      autoHideOutOfStock?: boolean;
    }
  ) {
    return await prisma.websiteStockSettings.upsert({
      where: { websiteId },
      create: {
        websiteId,
        lowStockThreshold: settings.lowStockThreshold ?? 10,
        outOfStockAction: settings.outOfStockAction ?? 'HIDE',
        syncInventory: settings.syncInventory ?? true,
        autoHideOutOfStock: settings.autoHideOutOfStock ?? true,
      },
      update: {
        ...settings,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Calculate inventory health score (0-100)
   */
  async calculateInventoryHealthScore(websiteId: string): Promise<number> {
    const status = await this.getWebsiteStockStatus(websiteId);

    if (status.products.length === 0) {
      return 100; // No products = perfect score
    }

    const { summary } = status;
    const total = summary.total;

    // Calculate score based on stock levels
    // - Out of stock products: -20 points each
    // - Low stock products: -5 points each
    // - In stock products: +10 points each
    let score = 100;
    score -= (summary.outOfStock / total) * 20 * total;
    score -= (summary.lowStock / total) * 5 * total;
    score += (summary.inStock / total) * 10 * total;

    // Normalize to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get products that need restocking
   */
  async getProductsNeedingRestock(websiteId: string) {
    const status = await this.getWebsiteStockStatus(websiteId);
    return status.products.filter(
      (p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK'
    );
  }
}

export const websiteStockSyncService = new WebsiteStockSyncService();
