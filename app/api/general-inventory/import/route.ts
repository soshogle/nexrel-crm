import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { syncGeneralInventoryToProduct } from "@/lib/general-inventory/product-sync";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/general-inventory/import - Import items from CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await request.json();
    const { items, mode = "create" } = body; // mode: 'create' or 'update'

    if (!items || !Array.isArray(items) || items.length === 0) {
      return apiErrors.badRequest("No items provided");
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const item of items) {
      try {
        // Validate required fields
        if (!item.sku || !item.name) {
          results.failed++;
          results.errors.push({
            row: item._rowIndex || "unknown",
            error: "Missing required fields: SKU and Name",
            data: item,
          });
          continue;
        }

        // Check for duplicate SKU
        const existingItem = await db.generalInventoryItem.findFirst({
          where: {
            userId: session.user.id,
            sku: item.sku,
          },
        });

        if (existingItem && mode === "create") {
          results.skipped++;
          results.errors.push({
            row: item._rowIndex || "unknown",
            error: `SKU ${item.sku} already exists`,
            data: item,
          });
          continue;
        }

        // Get or create category if provided
        let categoryId = null;
        if (item.category) {
          const category = await db.generalInventoryCategory.findFirst({
            where: {
              userId: session.user.id,
              name: item.category,
            },
          });

          if (category) {
            categoryId = category.id;
          } else {
            // Create new category
            const newCategory = await db.generalInventoryCategory.create({
              data: {
                userId: session.user.id,
                name: item.category,
              },
            });
            categoryId = newCategory.id;
          }
        }

        // Get or create supplier if provided
        let supplierId = null;
        if (item.supplier) {
          const supplier = await db.generalInventorySupplier.findFirst({
            where: {
              userId: session.user.id,
              name: item.supplier,
            },
          });

          if (supplier) {
            supplierId = supplier.id;
          } else {
            // Create new supplier
            const newSupplier = await db.generalInventorySupplier.create({
              data: {
                userId: session.user.id,
                name: item.supplier,
              },
            });
            supplierId = newSupplier.id;
          }
        }

        // Get or create location if provided
        let locationId = null;
        if (item.location) {
          const location = await db.generalInventoryLocation.findFirst({
            where: {
              userId: session.user.id,
              name: item.location,
            },
          });

          if (location) {
            locationId = location.id;
          } else {
            // Create new location
            const newLocation = await db.generalInventoryLocation.create({
              data: {
                userId: session.user.id,
                name: item.location,
              },
            });
            locationId = newLocation.id;
          }
        }

        if (existingItem && mode === "update") {
          const newQuantity = item.quantity
            ? parseInt(item.quantity)
            : existingItem.quantity;
          // Update existing item
          await db.generalInventoryItem.update({
            where: { id: existingItem.id },
            data: {
              name: item.name,
              description: item.description || null,
              categoryId,
              supplierId,
              locationId,
              quantity: newQuantity,
              unit: item.unit || existingItem.unit,
              reorderLevel: item.reorderLevel
                ? parseInt(item.reorderLevel)
                : existingItem.reorderLevel,
              reorderQuantity: item.reorderQuantity
                ? parseInt(item.reorderQuantity)
                : existingItem.reorderQuantity,
              costPrice: item.costPrice
                ? parseFloat(item.costPrice)
                : existingItem.costPrice,
              sellingPrice: item.sellingPrice
                ? parseFloat(item.sellingPrice)
                : existingItem.sellingPrice,
              barcode: item.barcode || existingItem.barcode,
              imageUrl: item.imageUrl || existingItem.imageUrl,
              notes: item.notes || existingItem.notes,
            },
          });
          // Sync to Product and website when quantity changes
          syncGeneralInventoryToProduct(
            session.user.id,
            item.sku,
            newQuantity,
            existingItem.quantity,
          ).catch((err) => console.error("Import sync failed:", err));
        } else {
          // Create new item
          const newItem = await db.generalInventoryItem.create({
            data: {
              userId: session.user.id,
              sku: item.sku,
              name: item.name,
              description: item.description || null,
              categoryId,
              supplierId,
              locationId,
              quantity: item.quantity ? parseInt(item.quantity) : 0,
              unit: item.unit || "unit",
              reorderLevel: item.reorderLevel ? parseInt(item.reorderLevel) : 0,
              reorderQuantity: item.reorderQuantity
                ? parseInt(item.reorderQuantity)
                : 0,
              costPrice: item.costPrice ? parseFloat(item.costPrice) : null,
              sellingPrice: item.sellingPrice
                ? parseFloat(item.sellingPrice)
                : null,
              barcode: item.barcode || null,
              imageUrl: item.imageUrl || null,
              notes: item.notes || null,
            },
          });

          // Create initial stock adjustment if quantity > 0
          const initialQty = item.quantity ? parseInt(item.quantity) : 0;
          if (initialQty > 0) {
            await db.generalInventoryAdjustment.create({
              data: {
                userId: session.user.id,
                itemId: newItem.id,
                type: "INITIAL",
                quantity: initialQty,
                quantityBefore: 0,
                quantityAfter: initialQty,
                reason: "Initial stock from CSV import",
              },
            });
            // Sync to Product and website when creating with quantity
            syncGeneralInventoryToProduct(
              session.user.id,
              item.sku,
              initialQty,
              0,
            ).catch((err) => console.error("Import sync failed:", err));
          }
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: item._rowIndex || "unknown",
          error: error.message || "Unknown error",
          data: item,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.success} items successfully. ${results.failed} failed, ${results.skipped} skipped.`,
    });
  } catch (error: any) {
    console.error("Error importing items:", error);
    return apiErrors.internal(error.message || "Failed to import items");
  }
}
