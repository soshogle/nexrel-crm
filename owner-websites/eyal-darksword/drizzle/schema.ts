import { pgTable, pgEnum, serial, text, timestamp, varchar, decimal, integer, boolean, jsonb } from "drizzle-orm/pg-core";

// PostgreSQL enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const stockStatusEnum = pgEnum("stock_status", ["instock", "outofstock", "onbackorder"]);
export const productStatusEnum = pgEnum("product_status", ["publish", "draft", "trash"]);
export const addressTypeEnum = pgEnum("address_type", ["shipping", "billing"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending", "processing", "on_hold", "completed", "cancelled", "refunded", "failed"
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", "paid", "failed", "refunded", "partially_refunded"
]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const displayTypeEnum = pgEnum("display_type", ["color_swatch", "dropdown"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Product categories (Medieval Swords, Fantasy Swords, Armor, etc.)
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Products table - swords, armor, daggers, etc.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  sku: varchar("sku", { length: 100 }),
  stockQuantity: integer("stock_quantity").default(0),
  stockStatus: stockStatusEnum("stock_status").default("instock").notNull(),
  imageUrl: text("image_url"),
  galleryImages: jsonb("gallery_images").$type<string[]>(),
  categoryId: integer("category_id"),
  categories: jsonb("categories").$type<string[]>(),
  weight: varchar("weight", { length: 50 }),
  steelType: varchar("steel_type", { length: 100 }),
  overallLength: varchar("overall_length", { length: 100 }),
  bladeLength: varchar("blade_length", { length: 100 }),
  handleLength: varchar("handle_length", { length: 100 }),
  pointOfBalance: varchar("point_of_balance", { length: 100 }),
  featured: integer("featured").default(0),
  status: productStatusEnum("status").default("publish").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product variations (Package options - blade type, scabbard, sword belt, etc.)
 */
export const productVariations = pgTable("product_variations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  variationType: varchar("variation_type", { length: 100 }).notNull().default("package"),
  optionName: varchar("option_name", { length: 255 }).notNull(),
  optionValue: varchar("option_value", { length: 500 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  regularPrice: decimal("regular_price", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  priceModifier: decimal("price_modifier", { precision: 10, scale: 2 }).default("0.00"),
  sku: varchar("sku", { length: 100 }),
  imageUrl: text("image_url"),
  stockStatus: stockStatusEnum("stock_status").default("instock"),
  stockQuantity: integer("stock_quantity").default(0),
  wpVariationId: varchar("wp_variation_id", { length: 50 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductVariation = typeof productVariations.$inferSelect;
export type InsertProductVariation = typeof productVariations.$inferInsert;

/**
 * Customer addresses for shipping and billing
 */
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: addressTypeEnum("type").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  company: varchar("company", { length: 255 }),
  address1: varchar("address1", { length: 500 }).notNull(),
  address2: varchar("address2", { length: 500 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  isDefault: integer("is_default").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

/**
 * Shopping cart
 */
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: varchar("session_id", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Cart = typeof carts.$inferSelect;
export type InsertCart = typeof carts.$inferInsert;

/**
 * Cart items
 */
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull(),
  productId: integer("product_id").notNull(),
  variationId: integer("variation_id"),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  variationDetails: jsonb("variation_details").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Orders
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  userId: integer("user_id"),
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  customerEmail: varchar("customer_email", { length: 320 }),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 30 }),
  shippingAddress: jsonb("shipping_address").$type<{
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  }>(),
  billingAddress: jsonb("billing_address").$type<{
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  }>(),
  notes: text("notes"),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  shippingCarrier: varchar("shipping_carrier", { length: 100 }),
  quickbooksInvoiceId: varchar("quickbooks_invoice_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order line items
 */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  variationId: integer("variation_id"),
  productName: varchar("product_name", { length: 500 }).notNull(),
  productSku: varchar("product_sku", { length: 100 }),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  variationDetails: jsonb("variation_details").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Wishlist items
 */
export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;

/**
 * Product reviews
 */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  userId: integer("user_id"),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  status: reviewStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Product attributes (Grip colors, Scabbard colors, Blade Finish, Guard & Pommel Finish)
 * These are non-price-affecting customization options shown on the product page.
 * Each row represents one attribute group for a product (e.g., "Grip" with multiple color options).
 */
export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  attributeKey: varchar("attribute_key", { length: 100 }).notNull(),
  attributeName: varchar("attribute_name", { length: 255 }).notNull(),
  displayType: displayTypeEnum("display_type").default("dropdown").notNull(),
  options: jsonb("options").$type<Array<{ value: string; colorHex?: string; isDefault?: boolean }>>().notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type InsertProductAttribute = typeof productAttributes.$inferInsert;
