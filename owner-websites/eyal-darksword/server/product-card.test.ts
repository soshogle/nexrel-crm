import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("product card data enrichment", () => {
  describe("getProducts returns variation info", () => {
    it("includes variationCount and price range for variable products", async () => {
      const result = await db.getProducts({ limit: 50 });
      expect(result.products.length).toBeGreaterThan(0);

      // Find a product with variations
      const variableProduct = result.products.find(
        (p: any) => p.variationCount > 0
      );
      expect(variableProduct).toBeDefined();
      expect(variableProduct!.variationCount).toBeGreaterThan(0);
      expect(variableProduct!.minVariationPrice).toBeTruthy();
      expect(variableProduct!.maxVariationPrice).toBeTruthy();
      expect(parseFloat(variableProduct!.minVariationPrice!)).toBeGreaterThan(0);
      expect(parseFloat(variableProduct!.maxVariationPrice!)).toBeGreaterThanOrEqual(
        parseFloat(variableProduct!.minVariationPrice!)
      );
    });

    it("returns variationCount 0 for simple products", async () => {
      const result = await db.getProducts({ limit: 50 });
      const simpleProduct = result.products.find(
        (p: any) => p.variationCount === 0
      );
      expect(simpleProduct).toBeDefined();
      expect(simpleProduct!.variationCount).toBe(0);
      expect(simpleProduct!.minVariationPrice).toBeNull();
      expect(simpleProduct!.maxVariationPrice).toBeNull();
    });
  });

  describe("getFeaturedProducts returns variation info", () => {
    it("includes variationCount for featured products", async () => {
      const products = await db.getFeaturedProducts(10);
      expect(products.length).toBeGreaterThan(0);

      // All products should have the variationCount field
      for (const p of products) {
        expect(p).toHaveProperty("variationCount");
        expect(p).toHaveProperty("minVariationPrice");
        expect(p).toHaveProperty("maxVariationPrice");
        expect(typeof p.variationCount).toBe("number");
      }
    });
  });

  describe("getRelatedProducts returns variation info", () => {
    it("includes variationCount for related products", async () => {
      // Get a product first
      const result = await db.getProducts({ limit: 1 });
      const product = result.products[0];
      if (!product) return; // skip if no products

      const categories = product.categories;
      const catName = Array.isArray(categories) && categories.length > 0
        ? categories[0]
        : "Medieval Swords";

      const related = await db.getRelatedProducts(product.id, catName, 4);
      for (const p of related) {
        expect(p).toHaveProperty("variationCount");
        expect(p).toHaveProperty("minVariationPrice");
        expect(p).toHaveProperty("maxVariationPrice");
      }
    });
  });
});
