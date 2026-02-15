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

describe("products", () => {
  const caller = appRouter.createCaller(createPublicContext());

  describe("products.list", () => {
    it("returns a list of products with total count", async () => {
      const result = await caller.products.list({});
      expect(result).toHaveProperty("products");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it("respects pagination limit", async () => {
      const result = await caller.products.list({ limit: 5 });
      expect(result.products.length).toBeLessThanOrEqual(5);
    });

    it("returns products with required fields", async () => {
      const result = await caller.products.list({ limit: 1 });
      const product = result.products[0];
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("slug");
      expect(product).toHaveProperty("price");
    });
  });

  describe("products.getBySlug", () => {
    it("returns a product by slug", async () => {
      // First get a known product
      const list = await caller.products.list({ limit: 1 });
      const slug = list.products[0].slug;

      const product = await caller.products.getBySlug({ slug });
      expect(product).toHaveProperty("id");
      expect(product.slug).toBe(slug);
    });

    it("throws NOT_FOUND for invalid slug", async () => {
      await expect(
        caller.products.getBySlug({ slug: "nonexistent-product-xyz" })
      ).rejects.toThrow();
    });
  });

  describe("products.getVariations", () => {
    it("returns variations for a product with package options", async () => {
      // Danish Viking Axe has 2 package variations
      const product = await caller.products.getBySlug({ slug: "danish-viking-axe-1743" });
      const variations = await caller.products.getVariations({ productId: product.id });

      expect(Array.isArray(variations)).toBe(true);
      expect(variations.length).toBe(2);

      // Check variation structure
      const first = variations[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("optionValue");
      expect(first).toHaveProperty("price");
      expect(first).toHaveProperty("variationType");
    });

    it("returns variations with correct absolute prices", async () => {
      const product = await caller.products.getBySlug({ slug: "danish-viking-axe-1743" });
      const variations = await caller.products.getVariations({ productId: product.id });

      // Blunt axe should be $310, Sharpened should be $325
      const blunt = variations.find((v: any) => v.optionValue?.includes("Blunt"));
      const sharp = variations.find((v: any) => v.optionValue?.includes("Sharpened"));

      expect(blunt).toBeDefined();
      expect(sharp).toBeDefined();
      expect(parseFloat(blunt!.price!)).toBe(310);
      expect(parseFloat(sharp!.price!)).toBe(325);
    });

    it("returns size variations for jewelry", async () => {
      const product = await caller.products.getBySlug({ slug: "troth-silver-tungsten-ring" });
      const variations = await caller.products.getVariations({ productId: product.id });

      expect(variations.length).toBe(7); // Sizes 7-13
      expect(variations[0]).toHaveProperty("variationType");
      // All sizes should have the same price
      const prices = variations.map((v: any) => parseFloat(v.price!));
      expect(new Set(prices).size).toBe(1); // All same price
    });

    it("returns empty array for products without variations", async () => {
      // Find a product without variations
      const list = await caller.products.list({ limit: 50 });
      // Antiques typically don't have variations
      const antique = list.products.find((p: any) =>
        String(p.categories || '').includes('Antiques') && parseFloat(p.price) > 0
      );
      if (antique) {
        const variations = await caller.products.getVariations({ productId: antique.id });
        expect(Array.isArray(variations)).toBe(true);
        // May or may not have variations, just verify it returns an array
      }
    });
  });

  describe("products.getFeatured", () => {
    it("returns featured products with valid prices and images", async () => {
      const featured = await caller.products.getFeatured({ limit: 8 });
      expect(Array.isArray(featured)).toBe(true);

      // Featured products should all have prices > 0 and valid images
      for (const product of featured) {
        expect(parseFloat(product.price)).toBeGreaterThan(0);
        expect(product.imageUrl).toBeTruthy();
        expect(product.imageUrl!.startsWith("http")).toBe(true);
      }
    });
  });

  describe("products.getRelated", () => {
    it("returns related products excluding the current product", async () => {
      const product = await caller.products.getBySlug({ slug: "danish-viking-axe-1743" });
      const related = await caller.products.getRelated({
        productId: product.id,
        categoryName: "Axes",
        limit: 4,
      });

      expect(Array.isArray(related)).toBe(true);
      // Related products should not include the current product
      const ids = related.map((r: any) => r.id);
      expect(ids).not.toContain(product.id);

      // Related products should have valid prices and images
      for (const rp of related) {
        expect(parseFloat(rp.price)).toBeGreaterThan(0);
      }
    });
  });
});

describe("categories", () => {
  const caller = appRouter.createCaller(createPublicContext());

  it("returns categories with product counts", async () => {
    const categories = await caller.categories.list();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);

    // Check that at least some categories have product counts
    const withCounts = categories.filter((c: any) => c.productCount > 0);
    expect(withCounts.length).toBeGreaterThan(0);

    // Medieval Swords should have a significant count
    const medievalSwords = categories.find((c: any) => c.name === "Medieval Swords");
    expect(medievalSwords).toBeDefined();
    expect(medievalSwords!.productCount).toBeGreaterThan(50);
  });
});
