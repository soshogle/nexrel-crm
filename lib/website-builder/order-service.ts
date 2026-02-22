/**
 * Website Order Service
 * Handles order creation from website sales and CRM integration
 */

import { getCrmDb, leadService } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';
import { websiteStockSyncService } from './stock-sync-service';

export interface OrderItemData {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number; // in cents
  total: number; // in cents
}

export interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  billingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface CreateOrderParams {
  websiteId: string;
  userId: string; // Business owner's user ID
  customer: CustomerData;
  items: OrderItemData[];
  subtotal: number; // in cents
  tax?: number; // in cents
  shipping?: number; // in cents
  discount?: number; // in cents
  total: number; // in cents
  paymentIntentId?: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export class WebsiteOrderService {
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create or update Lead from customer data
   */
  private async createOrUpdateLead(
    ctx: { userId: string; industry?: string | null },
    customer: CustomerData,
    websiteId: string,
    orderTotal: number
  ) {
    const db = getCrmDb(ctx);

    // Check if lead exists by email
    let lead = await db.lead.findFirst({
      where: {
        userId: ctx.userId,
        email: customer.email,
      },
    });

    const shippingAddress = customer.shippingAddress || {};
    const enrichedData: any = {
      purchaseHistory: {
        firstPurchaseDate: lead?.createdAt || new Date(),
        totalSpent: (lead?.enrichedData as any)?.purchaseHistory?.totalSpent || 0 + orderTotal,
        orderCount: ((lead?.enrichedData as any)?.purchaseHistory?.orderCount || 0) + 1,
        lastPurchaseDate: new Date(),
        averageOrderValue: 0, // Will be calculated
      },
      websiteContext: {
        sourceWebsite: websiteId,
        referralSource: 'website_sale',
      },
      customerTier: 'NEW', // Will be updated based on total spent
    };

    // Calculate customer tier
    const totalSpent = enrichedData.purchaseHistory.totalSpent;
    if (totalSpent >= 1000) {
      enrichedData.customerTier = 'VIP';
    } else if (totalSpent >= 500) {
      enrichedData.customerTier = 'REGULAR';
    }

    // Calculate lead score (0-100)
    const leadScore = Math.min(100, Math.round(
      Math.min(40, (totalSpent / 1000) * 40) + // Purchase value (0-40)
      Math.min(30, (enrichedData.purchaseHistory.orderCount / 10) * 30) + // Frequency (0-30)
      20 + // Recent purchase (20 points)
      10 // Active customer (10 points)
    ));

    if (lead) {
      // Update existing lead
      lead = await leadService.update(ctx, lead.id, {
        contactPerson: customer.name,
        phone: customer.phone || lead.phone,
        address: shippingAddress.line1 || lead.address,
        city: shippingAddress.city || lead.city,
        state: shippingAddress.state || lead.state,
        zipCode: shippingAddress.postal_code || lead.zipCode,
        country: shippingAddress.country || lead.country || 'US',
        status: 'CONVERTED', // They're a paying customer
        contactType: 'CUSTOMER',
        enrichedData,
        leadScore,
        lastContactedAt: new Date(),
        tags: Array.isArray(lead.tags) ? [...(lead.tags as string[]), 'customer', 'website_buyer'] : ['customer', 'website_buyer'],
      });
    } else {
      // Create new lead
      lead = await leadService.create(ctx, {
        businessName: customer.name,
        contactPerson: customer.name,
        email: customer.email,
        phone: customer.phone || null,
        address: shippingAddress.line1 || null,
        city: shippingAddress.city || null,
        state: shippingAddress.state || null,
        zipCode: shippingAddress.postal_code || null,
        country: shippingAddress.country || 'US',
        status: 'CONVERTED',
        source: 'website_sale',
        contactType: 'CUSTOMER',
        enrichedData,
        leadScore,
        tags: ['customer', 'website_buyer', 'first_time_buyer'],
      } as any);
    }

    return lead;
  }

  /**
   * Create order from payment data
   */
  async createOrder(params: CreateOrderParams) {
    const {
      websiteId,
      userId,
      customer,
      items,
      subtotal,
      tax = 0,
      shipping = 0,
      discount = 0,
      total,
      paymentIntentId,
      paymentMethod = 'stripe',
      metadata = {},
    } = params;

    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create or update Lead
      const lead = await this.createOrUpdateLead(ctx, customer, websiteId, total);

      // 2. Create Order
      const order = await tx.order.create({
        data: {
          userId,
          orderNumber: this.generateOrderNumber(),
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || null,
          shippingAddress: customer.shippingAddress || null,
          billingAddress: customer.billingAddress || customer.shippingAddress || null,
          status: 'PENDING',
          paymentStatus: 'PAID',
          paymentMethod,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          notes: `Order from website. Payment Intent: ${paymentIntentId || 'N/A'}`,
        },
      });

      // 3. Create OrderItems
      const orderItems = await Promise.all(
        items.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
            },
          })
        )
      );

      // 4. Create WebsiteOrder link
      try {
        await tx.websiteOrder.create({
          data: {
            websiteId,
            orderId: order.id,
            customerId: lead.id,
          },
        });
      } catch (e: any) {
        // Handle unique constraint violation (order already linked)
        if (e.code !== 'P2002') {
          console.error('Failed to create WebsiteOrder link:', e);
        }
      }

      // 5. Deduct inventory for each product and sync to websites
      for (const item of items) {
        // Get current stock before update
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { inventory: true },
        });

        const previousQuantity = product?.inventory || 0;

        // Update Product inventory
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        });

        const newQuantity = Math.max(0, updatedProduct.inventory);

        // Update GeneralInventoryItem if exists (by SKU)
        const inventoryItem = await tx.generalInventoryItem.findFirst({
          where: {
            userId,
            sku: item.productSku,
            isActive: true,
          },
        });

        if (inventoryItem) {
          const inventoryNewQuantity = Math.max(0, inventoryItem.quantity - item.quantity);
          
          await tx.generalInventoryItem.update({
            where: { id: inventoryItem.id },
            data: { quantity: inventoryNewQuantity },
          });

          // Create adjustment record
          await tx.generalInventoryAdjustment.create({
            data: {
              userId,
              itemId: inventoryItem.id,
              type: 'SALE',
              quantity: item.quantity,
              quantityBefore: inventoryItem.quantity,
              quantityAfter: inventoryNewQuantity,
              reason: `Website sale - Order ${order.orderNumber}`,
              reference: order.orderNumber,
              notes: JSON.stringify({
                websiteId,
                orderId: order.id,
                paymentIntentId,
              }),
            },
          });
        }
      }

      return {
        order,
        orderItems,
        lead,
        inventoryUpdates: items.map((item) => ({
          productId: item.productId,
          sku: item.productSku,
        })),
      };
    });

    // Sync stock to websites AFTER transaction completes
    // This prevents long-running transactions and allows for better error handling
    if (result.inventoryUpdates) {
      for (const update of result.inventoryUpdates) {
        const product = await db.product.findUnique({
          where: { id: update.productId },
          select: { inventory: true, sku: true },
        });

        if (product) {
          // Get previous quantity from order items (before deduction)
          const orderItem = items.find((item) => item.productId === update.productId);
          const previousQuantity = (product.inventory || 0) + (orderItem?.quantity || 0);

          websiteStockSyncService.syncStockToWebsites({
            productId: update.productId,
            sku: update.sku || product.sku,
            quantity: product.inventory || 0,
            previousQuantity,
            websiteId,
          }).catch((err) => {
            console.error('Failed to sync stock to websites:', err);
          });
        }
      }
    }

    // Digital product fulfillment: assign access codes, send download email
    this.fulfillDigitalProducts(ctx, {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      customerEmail: customer.email,
      customerName: customer.name,
      items,
    }).catch((err) => console.error('Digital fulfillment error:', err));

    return result;
  }

  /**
   * Fulfill digital products: assign access codes, email download links
   */
  private async fulfillDigitalProducts(
    ctx: { userId: string; industry?: string | null },
    params: {
      orderId: string;
      orderNumber: string;
      customerEmail: string;
      customerName: string;
      items: OrderItemData[];
    }
  ) {
    const { orderId, orderNumber, customerEmail, customerName, items } = params;
    const db = getCrmDb(ctx);

    const digitalItems: Array<{ productId: string; productName: string; quantity: number; url?: string; codes?: string[] }> = [];

    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { productType: true, downloadUrl: true, accessCodeTemplate: true },
      });

      if (product?.productType !== 'DIGITAL') continue;

      const entry: { productId: string; productName: string; quantity: number; url?: string; codes?: string[] } = {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
      };

      if (product.downloadUrl) {
        entry.url = product.downloadUrl;
      }

      if (product.accessCodeTemplate) {
        const codes = await db.productAccessCode.findMany({
          where: {
            productId: item.productId,
            redeemedAt: null,
          },
          take: item.quantity,
        });

        if (codes.length >= item.quantity) {
          const codeStrings = codes.map((c) => c.code);
          await db.productAccessCode.updateMany({
            where: { id: { in: codes.map((c) => c.id) } },
            data: { orderId, redeemedAt: new Date() },
          });
          entry.codes = codeStrings;
        }
      }

      digitalItems.push(entry);
    }

    if (digitalItems.length === 0) return;

    const { sendEmail } = await import('@/lib/email');
    const lines = digitalItems.flatMap((d) => {
      const parts: string[] = [`${d.productName}:`];
      if (d.url) parts.push(`Download: ${d.url}`);
      if (d.codes?.length) parts.push(`Access code(s): ${d.codes.join(', ')}`);
      return parts;
    });

    const html = `
      <p>Hi ${customerName},</p>
      <p>Thank you for your order (${orderNumber}). Here are your digital products:</p>
      <ul>${digitalItems.map((d) => `<li><strong>${d.productName}</strong>${d.url ? `<br><a href="${d.url}">Download</a>` : ''}${d.codes?.length ? `<br>Access codes: ${d.codes.join(', ')}` : ''}</li>`).join('')}</ul>
      <p>If you have any questions, please reply to this email.</p>
    `;

    await sendEmail({
      to: customerEmail,
      subject: `Your order ${orderNumber} - Digital delivery`,
      html,
      text: lines.join('\n'),
      userId: ctx.userId,
    });
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    const db = getCrmDb(createDalContext('bootstrap'));
    return await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Get orders for a website
   */
  async getWebsiteOrders(websiteId: string) {
    const website = await getCrmDb(createDalContext('bootstrap')).website.findUnique({
      where: { id: websiteId },
      select: { userId: true },
    });
    if (!website) return [];

    const ctx = createDalContext(website.userId);
    const db = getCrmDb(ctx);

    const websiteOrders = await db.websiteOrder.findMany({
      where: { websiteId },
      select: { orderId: true },
    });

    const orderIds = websiteOrders.map((wo) => wo.orderId);

    if (orderIds.length === 0) {
      return [];
    }

    return await db.order.findMany({
      where: {
        id: { in: orderIds },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const websiteOrderService = new WebsiteOrderService();
