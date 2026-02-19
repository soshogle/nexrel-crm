import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // Voice AI config (ElevenLabs) — fetches from CRM when NEXREL_CRM_URL + NEXREL_WEBSITE_ID set
  voice: router({
    getConfig: publicProcedure.query(async () => {
      const crmUrl = process.env.NEXREL_CRM_URL;
      const websiteId = process.env.NEXREL_WEBSITE_ID;
      const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET;

      if (crmUrl && websiteId) {
        try {
          const res = await fetch(`${crmUrl.replace(/\/$/, "")}/api/websites/${websiteId}/voice-config`, {
            headers: secret ? { "x-website-secret": secret } : {},
          });
          if (res.ok) {
            const data = (await res.json()) as { agentId?: string; enableVoiceAI?: boolean; enableTavusAvatar?: boolean; websiteId?: string };
            return {
              enableVoiceAI: data.enableVoiceAI ?? false,
              enableTavusAvatar: false,
              elevenLabsAgentId: data.agentId || null,
              websiteId: data.websiteId || websiteId || null,
              crmUrl: crmUrl?.replace(/\/$/, "") || null,
            };
          }
        } catch (err) {
          console.warn("[voice.getConfig] CRM fetch failed:", err);
        }
      }
      return {
        enableVoiceAI: !!process.env.NEXREL_ELEVENLABS_AGENT_ID,
        enableTavusAvatar: false,
        elevenLabsAgentId: process.env.NEXREL_ELEVENLABS_AGENT_ID || null,
        websiteId: process.env.NEXREL_WEBSITE_ID || null,
        crmUrl: process.env.NEXREL_CRM_URL?.replace(/\/$/, "") || null,
      };
    }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PRODUCTS ============
  products: router({
    list: publicProcedure.input(z.object({
      categorySlug: z.string().optional(),
      search: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
      sortBy: z.string().optional(),
      featured: z.boolean().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getProducts(input || {});
    }),

    getBySlug: publicProcedure.input(z.object({
      slug: z.string(),
    })).query(async ({ input }) => {
      const product = await db.getProductBySlug(input.slug);
      if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      return product;
    }),

    getById: publicProcedure.input(z.object({
      id: z.number(),
    })).query(async ({ input }) => {
      const product = await db.getProductById(input.id);
      if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      return product;
    }),

    getVariations: publicProcedure.input(z.object({
      productId: z.number(),
    })).query(async ({ input }) => {
      return db.getProductVariations(input.productId);
    }),

    getAttributes: publicProcedure.input(z.object({
      productId: z.number(),
    })).query(async ({ input }) => {
      return db.getProductAttributes(input.productId);
    }),

    getRelated: publicProcedure.input(z.object({
      productId: z.number(),
      categoryName: z.string(),
      limit: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getRelatedProducts(input.productId, input.categoryName, input.limit);
    }),

    getFeatured: publicProcedure.input(z.object({
      limit: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.getFeaturedProducts(input?.limit);
    }),

    search: publicProcedure.input(z.object({
      query: z.string(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getProducts({ search: input.query, page: input.page, limit: input.limit });
    }),
  }),

  // ============ CATEGORIES ============
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),

    getBySlug: publicProcedure.input(z.object({
      slug: z.string(),
    })).query(async ({ input }) => {
      const category = await db.getCategoryBySlug(input.slug);
      if (!category) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      return category;
    }),
  }),

  // ============ CART ============
  cart: router({
    get: publicProcedure.input(z.object({
      sessionId: z.string().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      const sessionId = input?.sessionId;
      if (!userId && !sessionId) return { items: [], total: 0, count: 0 };

      const cart = await db.getOrCreateCart(userId || undefined, sessionId || undefined);
      const items = await db.getCartItems(cart.id);
      const count = await db.getCartCount(cart.id);

      let total = 0;
      for (const item of items) {
        total += parseFloat(item.price) * item.quantity;
      }

      return { cartId: cart.id, sessionId: cart.sessionId, items, total: total.toFixed(2), count };
    }),

    addItem: publicProcedure.input(z.object({
      sessionId: z.string().optional(),
      productId: z.number(),
      quantity: z.number().min(1),
      variationId: z.number().optional(),
      variationDetails: z.record(z.string(), z.string()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      const cart = await db.getOrCreateCart(userId || undefined, input.sessionId || undefined);

      // Get product price
      const product = await db.getProductById(input.productId);
      if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });

      let price = parseFloat(product.salePrice || product.price);

      // Use variation's absolute price if available, otherwise fall back to price modifier
      if (input.variationId) {
        const variations = await db.getProductVariations(input.productId);
        const variation = variations.find(v => v.id === input.variationId);
        if (variation) {
          if (variation.salePrice && parseFloat(variation.salePrice) > 0) {
            price = parseFloat(variation.salePrice);
          } else if (variation.price && parseFloat(variation.price) > 0) {
            price = parseFloat(variation.price);
          } else if (variation.priceModifier && parseFloat(variation.priceModifier) !== 0) {
            price += parseFloat(variation.priceModifier);
          }
        }
      }

      const itemId = await db.addToCart(
        cart.id,
        input.productId,
        input.quantity,
        price.toFixed(2),
        input.variationId,
        input.variationDetails as Record<string, string> | undefined
      );

      return { success: true, itemId, cartId: cart.id, sessionId: cart.sessionId };
    }),

    updateQuantity: publicProcedure.input(z.object({
      itemId: z.number(),
      quantity: z.number(),
    })).mutation(async ({ input }) => {
      await db.updateCartItemQuantity(input.itemId, input.quantity);
      return { success: true };
    }),

    removeItem: publicProcedure.input(z.object({
      itemId: z.number(),
    })).mutation(async ({ input }) => {
      await db.removeCartItem(input.itemId);
      return { success: true };
    }),

    clear: publicProcedure.input(z.object({
      cartId: z.number(),
    })).mutation(async ({ input }) => {
      await db.clearCart(input.cartId);
      return { success: true };
    }),
  }),

  // ============ ORDERS ============
  orders: router({
    create: publicProcedure.input(z.object({
      sessionId: z.string().optional(),
      customerEmail: z.string().email(),
      customerName: z.string(),
      customerPhone: z.string().optional(),
      shippingAddress: z.object({
        firstName: z.string(),
        lastName: z.string(),
        company: z.string().optional(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string(),
        phone: z.string().optional(),
      }),
      billingAddress: z.object({
        firstName: z.string(),
        lastName: z.string(),
        company: z.string().optional(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string(),
        phone: z.string().optional(),
      }),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      const cart = await db.getOrCreateCart(userId || undefined, input.sessionId || undefined);
      const cartItemsList = await db.getCartItems(cart.id);

      if (cartItemsList.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' });
      }

      let subtotal = 0;
      const orderItemsData = cartItemsList.map(item => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        subtotal += itemTotal;
        return {
          productId: item.productId,
          variationId: item.variationId || undefined,
          productName: item.product?.name || 'Unknown Product',
          productSku: undefined,
          quantity: item.quantity,
          price: item.price,
          total: itemTotal.toFixed(2),
          variationDetails: (item.variationDetails as Record<string, string>) || undefined,
        };
      });

      const shippingCost = subtotal >= 300 ? 0 : 25; // Free shipping over $300
      const taxRate = 0; // Tax calculated based on location
      const taxAmount = subtotal * taxRate;
      const total = subtotal + shippingCost + taxAmount;

      const result = await db.createOrder({
        userId: userId || undefined,
        items: orderItemsData,
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      });

      // Clear cart after order
      await db.clearCart(cart.id);

      return result;
    }),

    getByNumber: publicProcedure.input(z.object({
      orderNumber: z.string(),
    })).query(async ({ input }) => {
      const order = await db.getOrderByNumber(input.orderNumber);
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      const items = await db.getOrderItems(order.id);
      return { ...order, items };
    }),

    myOrders: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return db.getUserOrders(ctx.user.id);
    }),

    updatePayment: publicProcedure.input(z.object({
      orderId: z.number(),
      paymentStatus: z.string(),
      transactionId: z.string().optional(),
      paymentMethod: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.updateOrderPayment(input.orderId, {
        paymentStatus: input.paymentStatus,
        transactionId: input.transactionId,
        paymentMethod: input.paymentMethod,
      });
      if (input.paymentStatus === 'paid') {
        await db.updateOrderStatus(input.orderId, 'processing');
      }
      return { success: true };
    }),
  }),

  // ============ WISHLIST ============
  wishlist: router({
    get: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return db.getUserWishlist(ctx.user.id);
    }),

    add: publicProcedure.input(z.object({
      productId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) return { success: false };
      await db.addToWishlist(ctx.user.id, input.productId);
      return { success: true };
    }),

    remove: publicProcedure.input(z.object({
      productId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      if (!ctx.user) return { success: false };
      await db.removeFromWishlist(ctx.user.id, input.productId);
      return { success: true };
    }),
  }),

  // ============ REVIEWS ============
  reviews: router({
    getForProduct: publicProcedure.input(z.object({
      productId: z.number(),
    })).query(async ({ input }) => {
      return db.getProductReviews(input.productId);
    }),

    create: publicProcedure.input(z.object({
      productId: z.number(),
      customerName: z.string(),
      rating: z.number().min(1).max(5),
      title: z.string().optional(),
      content: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.createReview({
        productId: input.productId,
        userId: ctx.user?.id,
        customerName: input.customerName,
        rating: input.rating,
        title: input.title,
        content: input.content,
      });
      return { success: true };
    }),
  }),

  // ============ ADMIN ============
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getAdminStats();
    }),

    orders: router({
      list: adminProcedure.input(z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        status: z.string().optional(),
      }).optional()).query(async ({ input }) => {
        return db.getAllOrders(input || {});
      }),

      getById: adminProcedure.input(z.object({
        id: z.number(),
      })).query(async ({ input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
        const items = await db.getOrderItems(order.id);
        return { ...order, items };
      }),

      updateStatus: adminProcedure.input(z.object({
        id: z.number(),
        status: z.string(),
      })).mutation(async ({ input }) => {
        await db.updateOrderStatus(input.id, input.status);
        return { success: true };
      }),

      addTracking: adminProcedure.input(z.object({
        id: z.number(),
        trackingNumber: z.string(),
        carrier: z.string(),
      })).mutation(async ({ input }) => {
        await db.updateOrderTracking(input.id, input.trackingNumber, input.carrier);
        return { success: true };
      }),
    }),

    products: router({
      list: adminProcedure.input(z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        search: z.string().optional(),
      }).optional()).query(async ({ input }) => {
        return db.getProducts({ ...input, status: 'publish' });
      }),

      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        price: z.string().optional(),
        salePrice: z.string().optional(),
        stockQuantity: z.number().optional(),
        stockStatus: z.string().optional(),
        description: z.string().optional(),
        featured: z.number().optional(),
      })).mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProduct(id, data as any);
        return { success: true };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
