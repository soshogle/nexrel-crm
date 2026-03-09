import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

/**
 * GET POS PRODUCTS
 * List all products available for sale in POS
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const inStock = searchParams.get("inStock");

    const where: any = {
      userId: session.user.id,
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    // Get products from inventory that can be sold
    const products = await getCrmDb(ctx).inventoryItem.findMany({
      where: {
        ...where,
        sellingPrice: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        description: true,
        category: true,
        unit: true,
        currentStock: true,
        minimumStock: true,
        sellingPrice: true,
        costPerUnit: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Filter by stock if requested
    const filteredProducts =
      inStock === "true"
        ? products.filter((p) => Number(p.currentStock) > 0)
        : products;

    return NextResponse.json(filteredProducts);
  } catch (error) {
    console.error("❌ POS products fetch error:", error);
    return apiErrors.internal("Failed to fetch products");
  }
}

/**
 * CREATE POS PRODUCT
 * Create a new product for POS (creates inventory item with selling price)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const {
      name,
      sku,
      description,
      category,
      unit,
      initialStock,
      minimumStock,
      costPerUnit,
      sellingPrice,
    } = body;

    // Validate required fields
    if (!name || !sku || !category || !sellingPrice) {
      return apiErrors.badRequest(
        "Name, SKU, category, and selling price are required",
      );
    }

    // Check if SKU already exists
    const existingSku = await getCrmDb(ctx).inventoryItem.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return apiErrors.badRequest("SKU already exists");
    }

    // Create inventory item with selling price
    const product = await getCrmDb(ctx).inventoryItem.create({
      data: {
        userId: session.user.id,
        name,
        sku,
        description,
        category: category || "OTHER",
        unit: unit || "PIECE",
        currentStock: initialStock || 0,
        minimumStock: minimumStock || 0,
        reorderQuantity: minimumStock || 10,
        costPerUnit: costPerUnit || 0,
        sellingPrice,
        isActive: true,
      },
    });

    console.log(`✅ POS product created: ${name} (${sku})`);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("❌ POS product creation error:", error);
    return apiErrors.internal("Failed to create product");
  }
}
