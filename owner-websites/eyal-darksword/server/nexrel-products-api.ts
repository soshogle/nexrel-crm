/**
 * /api/nexrel/products - REST API for CRM website builder to manage products.
 * Auth: x-website-secret header (must match WEBSITE_SECRET or WEBSITE_VOICE_CONFIG_SECRET env).
 * Used when CRM proxies product edits to the owner's deployed site.
 */
import { Request, Response } from "express";
import * as db from "./db";

function getSecret(): string | null {
  return process.env.WEBSITE_SECRET || process.env.WEBSITE_VOICE_CONFIG_SECRET || null;
}

function validateSecret(req: Request): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const headerSecret = req.headers["x-website-secret"] as string;
  return !!headerSecret && headerSecret === secret;
}

export function registerNexrelProductsRoutes(app: import("express").Express) {
  app.get("/api/nexrel/products", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
      const result = await db.getProducts({ page, limit });
      res.json(result);
    } catch (err) {
      console.error("[nexrel/products GET]", err);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/nexrel/products/:id", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid product ID" });
        return;
      }
      const product = await db.getProductById(id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(product);
    } catch (err) {
      console.error("[nexrel/products/:id GET]", err);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/nexrel/products", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const body = req.body || {};
      const data = {
        name: String(body.name || "New Product"),
        slug: String(body.slug || "new-product").replace(/\s+/g, "-").toLowerCase(),
        description: body.description ?? null,
        shortDescription: body.shortDescription ?? null,
        price: String(body.price || "0"),
        salePrice: body.salePrice ? String(body.salePrice) : null,
        sku: body.sku ?? null,
        stockQuantity: typeof body.stockQuantity === "number" ? body.stockQuantity : 0,
        stockStatus: (body.stockStatus || "instock") as "instock" | "outofstock" | "onbackorder",
        imageUrl: body.imageUrl ?? null,
        galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : null,
        categoryId: typeof body.categoryId === "number" ? body.categoryId : null,
        categories: Array.isArray(body.categories) ? body.categories : null,
        weight: body.weight ?? null,
        steelType: body.steelType ?? null,
        overallLength: body.overallLength ?? null,
        bladeLength: body.bladeLength ?? null,
        handleLength: body.handleLength ?? null,
        pointOfBalance: body.pointOfBalance ?? null,
        featured: typeof body.featured === "number" ? body.featured : 0,
        status: (body.status || "publish") as "publish" | "draft" | "trash",
      };
      const id = await db.createProduct(data);
      const product = await db.getProductById(id);
      res.status(201).json(product);
    } catch (err) {
      console.error("[nexrel/products POST]", err);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/nexrel/products/:id", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid product ID" });
        return;
      }
      const existing = await db.getProductById(id);
      if (!existing) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      const body = req.body || {};
      const data: Record<string, unknown> = {};
      const allowed = [
        "name", "slug", "description", "shortDescription", "price", "salePrice",
        "sku", "stockQuantity", "stockStatus", "imageUrl", "galleryImages",
        "categoryId", "categories", "weight", "steelType", "overallLength",
        "bladeLength", "handleLength", "pointOfBalance", "featured", "status",
      ];
      for (const key of allowed) {
        if (body[key] !== undefined) {
          (data as any)[key] = body[key];
        }
      }
      if (Object.keys(data).length > 0) {
        await db.updateProduct(id, data as any);
      }
      const product = await db.getProductById(id);
      res.json(product);
    } catch (err) {
      console.error("[nexrel/products/:id PATCH]", err);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/nexrel/products/:id", async (req: Request, res: Response) => {
    if (!validateSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid product ID" });
        return;
      }
      const existing = await db.getProductById(id);
      if (!existing) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      await db.deleteProduct(id);
      res.status(204).send();
    } catch (err) {
      console.error("[nexrel/products/:id DELETE]", err);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
}
