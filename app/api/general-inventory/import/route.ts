
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/general-inventory/import - Import items from CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, mode = 'create' } = body; // mode: 'create' or 'update'

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
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
            row: item._rowIndex || 'unknown',
            error: 'Missing required fields: SKU and Name',
            data: item,
          });
          continue;
        }

        // Check for duplicate SKU
        const existingItem = await prisma.generalInventoryItem.findFirst({
          where: {
            userId: session.user.id,
            sku: item.sku,
          },
        });

        if (existingItem && mode === 'create') {
          results.skipped++;
          results.errors.push({
            row: item._rowIndex || 'unknown',
            error: `SKU ${item.sku} already exists`,
            data: item,
          });
          continue;
        }

        // Get or create category if provided
        let categoryId = null;
        if (item.category) {
          const category = await prisma.generalInventoryCategory.findFirst({
            where: {
              userId: session.user.id,
              name: item.category,
            },
          });
          
          if (category) {
            categoryId = category.id;
          } else {
            // Create new category
            const newCategory = await prisma.generalInventoryCategory.create({
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
          const supplier = await prisma.generalInventorySupplier.findFirst({
            where: {
              userId: session.user.id,
              name: item.supplier,
            },
          });
          
          if (supplier) {
            supplierId = supplier.id;
          } else {
            // Create new supplier
            const newSupplier = await prisma.generalInventorySupplier.create({
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
          const location = await prisma.generalInventoryLocation.findFirst({
            where: {
              userId: session.user.id,
              name: item.location,
            },
          });
          
          if (location) {
            locationId = location.id;
          } else {
            // Create new location
            const newLocation = await prisma.generalInventoryLocation.create({
              data: {
                userId: session.user.id,
                name: item.location,
              },
            });
            locationId = newLocation.id;
          }
        }

        if (existingItem && mode === 'update') {
          // Update existing item
          await prisma.generalInventoryItem.update({
            where: { id: existingItem.id },
            data: {
              name: item.name,
              description: item.description || null,
              categoryId,
              supplierId,
              locationId,
              quantity: item.quantity ? parseInt(item.quantity) : existingItem.quantity,
              unit: item.unit || existingItem.unit,
              reorderLevel: item.reorderLevel ? parseInt(item.reorderLevel) : existingItem.reorderLevel,
              reorderQuantity: item.reorderQuantity ? parseInt(item.reorderQuantity) : existingItem.reorderQuantity,
              costPrice: item.costPrice ? parseFloat(item.costPrice) : existingItem.costPrice,
              sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : existingItem.sellingPrice,
              barcode: item.barcode || existingItem.barcode,
              imageUrl: item.imageUrl || existingItem.imageUrl,
              notes: item.notes || existingItem.notes,
            },
          });
        } else {
          // Create new item
          const newItem = await prisma.generalInventoryItem.create({
            data: {
              userId: session.user.id,
              sku: item.sku,
              name: item.name,
              description: item.description || null,
              categoryId,
              supplierId,
              locationId,
              quantity: item.quantity ? parseInt(item.quantity) : 0,
              unit: item.unit || 'unit',
              reorderLevel: item.reorderLevel ? parseInt(item.reorderLevel) : 0,
              reorderQuantity: item.reorderQuantity ? parseInt(item.reorderQuantity) : 0,
              costPrice: item.costPrice ? parseFloat(item.costPrice) : null,
              sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : null,
              barcode: item.barcode || null,
              imageUrl: item.imageUrl || null,
              notes: item.notes || null,
            },
          });

          // Create initial stock adjustment if quantity > 0
          if (item.quantity && parseInt(item.quantity) > 0) {
            await prisma.generalInventoryAdjustment.create({
              data: {
                userId: session.user.id,
                itemId: newItem.id,
                type: 'INITIAL',
                quantity: parseInt(item.quantity),
                quantityBefore: 0,
                quantityAfter: parseInt(item.quantity),
                reason: 'Initial stock from CSV import',
              },
            });
          }
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: item._rowIndex || 'unknown',
          error: error.message || 'Unknown error',
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
    console.error('Error importing items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import items' },
      { status: 500 }
    );
  }
}
