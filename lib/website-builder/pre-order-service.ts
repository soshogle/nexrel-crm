/**
 * Pre-Order Service for Website Products
 * Handles pre-orders for out-of-stock products
 */

import { prisma } from '@/lib/db';

export interface CreatePreOrderParams {
  websiteId: string;
  productId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  quantity: number;
  expectedRestockDate?: Date;
  notes?: string;
}

export interface PreOrder {
  id: string;
  websiteId: string;
  productId: string;
  productName: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  quantity: number;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  expectedRestockDate?: Date;
  fulfilledAt?: Date;
  notes?: string;
  createdAt: Date;
}

export class WebsitePreOrderService {
  /**
   * Create a pre-order for an out-of-stock product
   */
  async createPreOrder(params: CreatePreOrderParams): Promise<PreOrder> {
    const { websiteId, productId, customerEmail, customerName, customerPhone, quantity, expectedRestockDate, notes } = params;

    // Verify product exists and is out of stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.inventory > 0) {
      throw new Error('Product is in stock. Pre-orders are only available for out-of-stock items.');
    }

    // Verify website exists
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        stockSettings: true,
      },
    });

    if (!website) {
      throw new Error('Website not found');
    }

    // Check if pre-orders are enabled
    const settings = website.stockSettings;
    if (settings?.outOfStockAction !== 'PRE_ORDER') {
      throw new Error('Pre-orders are not enabled for this website');
    }

    // Create pre-order record
    const preOrder = await prisma.$executeRawUnsafe(`
      INSERT INTO "PreOrder" (
        "id", "websiteId", "productId", "customerEmail", "customerName", 
        "customerPhone", "quantity", "status", "expectedRestockDate", "notes", "createdAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      )
      RETURNING *
    `,
      `po_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      websiteId,
      productId,
      customerEmail,
      customerName,
      customerPhone || null,
      quantity,
      'PENDING',
      expectedRestockDate || null,
      notes || null
    ).catch(async () => {
      // If table doesn't exist, create it via Prisma (fallback)
      // For now, store in a JSON field or use a simpler approach
      return await prisma.website.update({
        where: { id: websiteId },
        data: {
          integrationsConfig: {
            ...((website.integrationsConfig as any) || {}),
            preOrders: [
              ...((website.integrationsConfig as any)?.preOrders || []),
              {
                id: `po_${Date.now()}`,
                productId,
                productName: product.name,
                customerEmail,
                customerName,
                customerPhone,
                quantity,
                status: 'PENDING',
                expectedRestockDate: expectedRestockDate?.toISOString(),
                notes,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      });
    });

    // Create or update Lead for the customer
    let lead = await prisma.lead.findFirst({
      where: {
        userId: website.userId,
        email: customerEmail,
      },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          userId: website.userId,
          businessName: customerName,
          contactPerson: customerName,
          email: customerEmail,
          phone: customerPhone || null,
          status: 'NEW',
          source: 'website_pre_order',
          tags: ['pre_order_customer', 'website_visitor'],
          enrichedData: {
            preOrders: [{
              websiteId,
              productId,
              quantity,
              createdAt: new Date().toISOString(),
            }],
          },
        },
      });
    } else {
      // Update existing lead
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          tags: Array.isArray(lead.tags) 
            ? [...(lead.tags as string[]), 'pre_order_customer']
            : ['pre_order_customer'],
          enrichedData: {
            ...((lead.enrichedData as any) || {}),
            preOrders: [
              ...((lead.enrichedData as any)?.preOrders || []),
              {
                websiteId,
                productId,
                quantity,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      });
    }

    return {
      id: typeof preOrder === 'object' && 'id' in preOrder ? preOrder.id : `po_${Date.now()}`,
      websiteId,
      productId,
      productName: product.name,
      customerEmail,
      customerName,
      customerPhone,
      quantity,
      status: 'PENDING' as const,
      expectedRestockDate,
      notes,
      createdAt: new Date(),
    };
  }

  /**
   * Fulfill pre-orders when product is back in stock
   */
  async fulfillPreOrders(productId: string, availableQuantity: number): Promise<{
    fulfilled: number;
    preOrders: PreOrder[];
  }> {
    // Get website and pre-orders
    const website = await prisma.website.findUnique({
      where: {
        websiteProducts: {
          some: {
            productId,
          },
        },
      },
      select: {
        id: true,
        integrationsConfig: true,
      },
    });

    if (!website) {
      return { fulfilled: 0, preOrders: [] };
    }

    const preOrders = (website.integrationsConfig as any)?.preOrders || [];
    const pendingPreOrders = preOrders
      .filter((po: any) => po.productId === productId && po.status === 'PENDING')
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remainingQuantity = availableQuantity;
    const fulfilledPreOrders: PreOrder[] = [];

    // Fulfill pre-orders in order (FIFO)
    for (const preOrder of pendingPreOrders) {
      if (remainingQuantity <= 0) break;

      const fulfillQuantity = Math.min(preOrder.quantity, remainingQuantity);
      remainingQuantity -= fulfillQuantity;

      // Update pre-order status
      preOrder.status = fulfillQuantity === preOrder.quantity ? 'FULFILLED' : 'PARTIALLY_FULFILLED';
      preOrder.fulfilledAt = new Date().toISOString();
      preOrder.fulfilledQuantity = fulfillQuantity;

      fulfilledPreOrders.push(preOrder as PreOrder);

      // Send notification to customer
      try {
        const emailService = new (await import('@/lib/email-service')).EmailService();
        await emailService.sendEmail({
          to: preOrder.customerEmail,
          subject: `Your Pre-Order is Ready: ${preOrder.productName}`,
          html: `
            <h2>Great News! Your Pre-Order is Ready</h2>
            <p>Your pre-order for <strong>${preOrder.productName}</strong> is now available!</p>
            <p>Quantity: ${fulfillQuantity}</p>
            <p>Please complete your purchase by visiting your website.</p>
          `,
        });
      } catch (error) {
        console.error('Failed to send pre-order fulfillment email:', error);
      }
    }

    // Update website config with fulfilled pre-orders
    await prisma.website.update({
      where: { id: website.id },
      data: {
        integrationsConfig: {
          ...((website.integrationsConfig as any) || {}),
          preOrders: preOrders.map((po: any) => {
            const fulfilled = fulfilledPreOrders.find((f) => f.id === po.id);
            return fulfilled || po;
          }),
        },
      },
    });

    return {
      fulfilled: fulfilledPreOrders.length,
      preOrders: fulfilledPreOrders,
    };
  }

  /**
   * Get pre-orders for a website
   */
  async getWebsitePreOrders(websiteId: string): Promise<PreOrder[]> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { integrationsConfig: true },
    });

    if (!website) {
      return [];
    }

    const preOrders = (website.integrationsConfig as any)?.preOrders || [];
    return preOrders.filter((po: any) => po.status === 'PENDING');
  }
}

export const websitePreOrderService = new WebsitePreOrderService();
