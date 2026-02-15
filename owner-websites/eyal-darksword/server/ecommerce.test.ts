import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@darkswordarmory.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("products router", () => {
  it("lists products with pagination", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.list({ page: 1, limit: 10 });

    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.products)).toBe(true);
    expect(result.products.length).toBeLessThanOrEqual(10);
    expect(result.total).toBeGreaterThan(0);
  });

  it("gets a product by slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First get a product from the list
    const list = await caller.products.list({ page: 1, limit: 1 });
    expect(list.products.length).toBeGreaterThan(0);

    const slug = list.products[0].slug;
    const product = await caller.products.getBySlug({ slug });

    expect(product).toHaveProperty("id");
    expect(product).toHaveProperty("name");
    expect(product).toHaveProperty("slug", slug);
    expect(product).toHaveProperty("price");
  });

  it("returns 404 for non-existent product slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.products.getBySlug({ slug: "non-existent-product-xyz-123" })
    ).rejects.toThrow("Product not found");
  });

  it("gets product variations", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Get a product that likely has variations
    const list = await caller.products.list({ page: 1, limit: 5 });
    const productWithId = list.products[0];

    const variations = await caller.products.getVariations({ productId: productWithId.id });
    expect(Array.isArray(variations)).toBe(true);
  });

  it("gets featured products", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const featured = await caller.products.getFeatured({ limit: 5 });
    expect(Array.isArray(featured)).toBe(true);
  });
});

describe("categories router", () => {
  it("lists all categories", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.categories.list();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty("name");
    expect(categories[0]).toHaveProperty("slug");
  });
});

describe("cart router", () => {
  it("gets or creates a cart by session ID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const cart = await caller.cart.get({ sessionId: "test-session-vitest-001" });
    expect(cart).toHaveProperty("items");
    expect(Array.isArray(cart.items)).toBe(true);
    expect(cart).toHaveProperty("total");
  });
});
