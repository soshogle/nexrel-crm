import { eq, like, or, and, desc, asc, sql, inArray, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  InsertUser, users,
  products, categories, productVariations, productAttributes,
  carts, cartItems, orders, orderItems,
  addresses, wishlistItems, reviews,
  type Product, type Category, type ProductVariation, type ProductAttribute,
  type Cart, type CartItem, type Order, type OrderItem,
  type Address, type WishlistItem, type Review,
  type InsertProduct, type InsertCategory,
  type InsertOrder, type InsertOrderItem,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PRODUCT QUERIES ============

// Helper to enrich product arrays with variation count and price range
async function enrichWithVariationInfo(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, productList: any[]) {
  if (productList.length === 0) return productList;
  const productIds = productList.map(p => p.id);
  const varRows = await db.select({
    productId: productVariations.productId,
    count: sql<number>`count(*)`,
    minPrice: sql<string>`MIN(CASE WHEN ${productVariations.price}::numeric > 0 THEN ${productVariations.price} END)`,
    maxPrice: sql<string>`MAX(CASE WHEN ${productVariations.price}::numeric > 0 THEN ${productVariations.price} END)`,
  }).from(productVariations)
    .where(inArray(productVariations.productId, productIds))
    .groupBy(productVariations.productId);
  const info: Record<number, { count: number; minPrice: string | null; maxPrice: string | null }> = {};
  for (const row of varRows) {
    info[row.productId] = { count: Number(row.count), minPrice: row.minPrice, maxPrice: row.maxPrice };
  }
  return productList.map(p => ({
    ...p,
    variationCount: info[p.id]?.count || 0,
    minVariationPrice: info[p.id]?.minPrice || null,
    maxVariationPrice: info[p.id]?.maxPrice || null,
  }));
}

export async function getProducts(opts: {
  categorySlug?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return { products: [], total: 0 };

  const page = opts.page || 1;
  const limit = opts.limit || 24;
  const offset = (page - 1) * limit;

  let conditions: any[] = [eq(products.status, 'publish')];

  if (opts.categorySlug) {
    // Use the same resilient slug lookup as getCategoryBySlug
    const cat = await getCategoryBySlug(opts.categorySlug);
    if (cat) {
      conditions.push(
        or(
          eq(products.categoryId, cat.id),
          sql`${products.categories}::text ILIKE ${'%' + cat.name + '%'}`
        )
      );
    }
  }

  if (opts.search) {
    conditions.push(
      or(
        ilike(products.name, `%${opts.search}%`),
        ilike(products.description, `%${opts.search}%`),
        ilike(products.sku, `%${opts.search}%`)
      )
    );
  }

  if (opts.featured) {
    conditions.push(eq(products.featured, 1));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  let orderClause;
  switch (opts.sortBy) {
    case 'price_asc': orderClause = asc(products.price); break;
    case 'price_desc': orderClause = desc(products.price); break;
    case 'name_asc': orderClause = asc(products.name); break;
    case 'name_desc': orderClause = desc(products.name); break;
    case 'newest': orderClause = desc(products.createdAt); break;
    default: orderClause = desc(products.id);
  }

  const [result, countResult] = await Promise.all([
    db.select().from(products).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
  ]);

  // Fetch variation info (count + price range) for all returned products
  const productIds = result.map(p => p.id);
  let variationInfo: Record<number, { count: number; minPrice: string | null; maxPrice: string | null }> = {};
  if (productIds.length > 0) {
    const varRows = await db.select({
      productId: productVariations.productId,
      count: sql<number>`count(*)`,
      minPrice: sql<string>`MIN(CASE WHEN ${productVariations.price}::numeric > 0 THEN ${productVariations.price} END)`,
      maxPrice: sql<string>`MAX(CASE WHEN ${productVariations.price}::numeric > 0 THEN ${productVariations.price} END)`,
    }).from(productVariations)
      .where(inArray(productVariations.productId, productIds))
      .groupBy(productVariations.productId);
    for (const row of varRows) {
      variationInfo[row.productId] = { count: Number(row.count), minPrice: row.minPrice, maxPrice: row.maxPrice };
    }
  }

  const enrichedProducts = result.map(p => ({
    ...p,
    variationCount: variationInfo[p.id]?.count || 0,
    minVariationPrice: variationInfo[p.id]?.minPrice || null,
    maxVariationPrice: variationInfo[p.id]?.maxPrice || null,
  }));

  return { products: enrichedProducts, total: Number(countResult[0]?.count || 0) };
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProductVariations(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productVariations).where(eq(productVariations.productId, productId)).orderBy(asc(productVariations.sortOrder));
}

export async function getProductAttributes(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productAttributes).where(eq(productAttributes.productId, productId)).orderBy(asc(productAttributes.sortOrder));
}

export async function getRelatedProducts(productId: number, categoryName: string, limit = 4) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(products)
    .where(and(
      sql`${products.categories}::text ILIKE ${'%' + categoryName + '%'}`,
      sql`${products.id} != ${productId}`,
      eq(products.status, 'publish'),
      sql`${products.imageUrl} IS NOT NULL AND ${products.imageUrl} != ''`,
      sql`${products.price} IS NOT NULL AND ${products.price}::numeric != 0`
    ))
    .limit(limit);
  return enrichWithVariationInfo(db, result);
}

export async function getFeaturedProducts(limit = 8) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(products)
    .where(and(
      eq(products.status, 'publish'),
      sql`${products.imageUrl} IS NOT NULL AND ${products.imageUrl} != ''`,
      sql`${products.price} IS NOT NULL AND ${products.price}::numeric != 0`
    ))
    .orderBy(desc(products.id))
    .limit(limit);
  return enrichWithVariationInfo(db, result);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function createProduct(data: InsertProduct): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(products).values(data).returning({ id: products.id });
  return row.id;
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, id));
}

// ============ CATEGORY QUERIES ============

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  
  // Get product counts per category
  const allProducts = await db.select({ id: products.id, cats: products.categories }).from(products);
  const countMap: Record<string, number> = {};
  for (const p of allProducts) {
    if (p.cats) {
      // categories is stored as jsonb array
      const catNames = Array.isArray(p.cats) ? p.cats : [];
      for (const catName of catNames) {
        const name = String(catName).trim();
        countMap[name] = (countMap[name] || 0) + 1;
      }
    }
  }
  
  return cats.map(cat => ({
    ...cat,
    productCount: countMap[cat.name] || 0,
  }));
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  // Try exact match first
  let result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (result.length > 0) return result[0];
  // Fallback: try slug starts with (e.g., 'samurai-swords' matches 'samurai-swords-katanas-japanese-swords')
  result = await db.select().from(categories).where(like(categories.slug, `${slug}%`)).limit(1);
  if (result.length > 0) return result[0];
  // Fallback: try slug contained within (e.g., 'sale' matches 'swords-armors-weapons-sale')
  result = await db.select().from(categories).where(like(categories.slug, `%${slug}%`)).limit(1);
  if (result.length > 0) return result[0];
  // Fallback: try matching by name (e.g., 'axes' matches 'Axes')
  const nameGuess = slug.replace(/-/g, ' ');
  result = await db.select().from(categories).where(ilike(categories.name, `%${nameGuess}%`)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============ CART QUERIES ============

export async function getOrCreateCart(userId?: number, sessionId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let cart;
  if (userId) {
    const result = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    cart = result[0];
  } else if (sessionId) {
    const result = await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1);
    cart = result[0];
  }

  if (!cart) {
    const result = await db.insert(carts).values({
      userId: userId || null,
      sessionId: sessionId || nanoid(),
    }).returning();
    cart = result[0];
  }

  return cart;
}

export async function getCartItems(cartId: number) {
  const db = await getDb();
  if (!db) return [];

  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));

  // Enrich with product data
  const enriched = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    enriched.push({
      ...item,
      product: product ? {
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        price: product.price,
      } : null,
    });
  }
  return enriched;
}

export async function addToCart(cartId: number, productId: number, quantity: number, price: string, variationId?: number, variationDetails?: Record<string, string>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if item already in cart with same variation
  const existing = await db.select().from(cartItems)
    .where(and(
      eq(cartItems.cartId, cartId),
      eq(cartItems.productId, productId),
      variationId ? eq(cartItems.variationId, variationId) : sql`${cartItems.variationId} IS NULL`
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(cartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(cartItems).values({
    cartId,
    productId,
    variationId: variationId || null,
    quantity,
    price,
    variationDetails: variationDetails || null,
  }).returning({ id: cartItems.id });
  return result[0].id;
}

export async function updateCartItemQuantity(itemId: number, quantity: number) {
  const db = await getDb();
  if (!db) return;
  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
  } else {
    await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
  }
}

export async function removeCartItem(itemId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(eq(cartItems.id, itemId));
}

export async function clearCart(cartId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

export async function getCartCount(cartId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sql<number>`COALESCE(SUM(quantity), 0)` }).from(cartItems).where(eq(cartItems.cartId, cartId));
  return Number(result[0]?.total || 0);
}

// ============ ORDER QUERIES ============

export async function createOrder(data: {
  userId?: number;
  items: { productId: number; variationId?: number; productName: string; productSku?: string; quantity: number; price: string; total: string; variationDetails?: Record<string, string>; }[];
  subtotal: string;
  shippingCost?: string;
  taxAmount?: string;
  discountAmount?: string;
  total: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: any;
  billingAddress: any;
  paymentMethod?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderNumber = `DSA-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;

  const orderResult = await db.insert(orders).values({
    orderNumber,
    userId: data.userId || null,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: data.paymentMethod || null,
    subtotal: data.subtotal,
    shippingCost: data.shippingCost || '0.00',
    taxAmount: data.taxAmount || '0.00',
    discountAmount: data.discountAmount || '0.00',
    total: data.total,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
    customerPhone: data.customerPhone || null,
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress,
    notes: data.notes || null,
  }).returning({ id: orders.id });

  const orderId = orderResult[0].id;

  // Insert order items
  for (const item of data.items) {
    await db.insert(orderItems).values({
      orderId,
      productId: item.productId,
      variationId: item.variationId || null,
      productName: item.productName,
      productSku: item.productSku || null,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      variationDetails: item.variationDetails || null,
    });
  }

  return { orderId, orderNumber };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getAllOrders(opts: { page?: number; limit?: number; status?: string }) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };

  const page = opts.page || 1;
  const limit = opts.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = opts.status ? eq(orders.status, opts.status as any) : undefined;

  const [result, countResult] = await Promise.all([
    whereClause
      ? db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limit).offset(offset)
      : db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
    whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(orders),
  ]);

  return { orders: result, total: Number(countResult[0]?.count || 0) };
}

export async function updateOrderStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, id));
}

export async function updateOrderPayment(id: number, data: { paymentStatus: string; transactionId?: string; paymentMethod?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({
    paymentStatus: data.paymentStatus as any,
    transactionId: data.transactionId || undefined,
    paymentMethod: data.paymentMethod || undefined,
  }).where(eq(orders.id, id));
}

export async function updateOrderTracking(id: number, trackingNumber: string, carrier: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ trackingNumber, shippingCarrier: carrier, status: 'completed' as any }).where(eq(orders.id, id));
}

// ============ WISHLIST QUERIES ============

export async function getUserWishlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId));
  const enriched = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    if (product) enriched.push({ ...item, product });
  }
  return enriched;
}

export async function addToWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(wishlistItems).values({ userId, productId });
  }
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
}

// ============ REVIEW QUERIES ============

export async function getProductReviews(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
    .orderBy(desc(reviews.createdAt));
}

export async function createReview(data: { productId: number; userId?: number; customerName: string; rating: number; title?: string; content?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(reviews).values({
    productId: data.productId,
    userId: data.userId || null,
    customerName: data.customerName,
    rating: data.rating,
    title: data.title || null,
    content: data.content || null,
    status: 'pending',
  });
}

// ============ ADDRESS QUERIES ============

export async function getUserAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(addresses).where(eq(addresses.userId, userId));
}

// ============ ADMIN STATS ============

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalCustomers: 0, recentOrders: [] };

  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
  const [revenue] = await db.select({ total: sql<string>`COALESCE(SUM(total::numeric), 0)` }).from(orders).where(eq(orders.paymentStatus, 'paid'));
  const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const [customerCount] = await db.select({ count: sql<number>`count(DISTINCT user_id)` }).from(orders);
  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10);

  return {
    totalOrders: Number(orderCount?.count || 0),
    totalRevenue: Number(revenue?.total || 0),
    totalProducts: Number(productCount?.count || 0),
    totalCustomers: Number(customerCount?.count || 0),
    recentOrders,
  };
}
