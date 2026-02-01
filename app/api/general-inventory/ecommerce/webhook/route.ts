
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Generic webhook endpoint for e-commerce platforms to update inventory
 * POST /api/general-inventory/ecommerce/webhook
 * 
 * Expected payload format:
 * {
 *   "api_key": "your-api-key",
 *   "action": "order_created" | "stock_update" | "product_update",
 *   "sku": "ITEM-SKU",
 *   "quantity_change": -2,  // negative for sales, positive for restocks
 *   "order_id": "ORDER-123",  // optional
 *   "platform": "shopify" | "woocommerce" | "bigcommerce" | "custom"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, action, sku, quantity_change, order_id, platform, product_data } = body;

    // Validate API key (simple key validation - in production use proper auth)
    if (!api_key) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // Find user by API key (you should store this in User model or create EcommerceIntegration model)
    // For now, we'll use a simple lookup - this should be enhanced with proper API key management
    const user = await prisma.user.findFirst({
      where: {
        // Assuming you store API keys in user metadata or a separate table
        // This is a placeholder - implement proper API key storage
        email: { contains: '@' }, // Temporary fallback
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Find the inventory item by SKU
    const item = await prisma.generalInventoryItem.findFirst({
      where: {
        sku,
        userId: user.id,
        isActive: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: `Item with SKU ${sku} not found`, sku },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'order_created':
      case 'stock_update':
        // Update inventory quantity
        const newQuantity = Math.max(0, item.quantity + (quantity_change || 0));

        // Update the item
        result = await prisma.generalInventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQuantity },
        });

        // Create adjustment record
        await prisma.generalInventoryAdjustment.create({
          data: {
            itemId: item.id,
            userId: user.id,
            type: quantity_change < 0 ? 'SALE' : 'PURCHASE',
            quantity: Math.abs(quantity_change),
            quantityBefore: item.quantity,
            quantityAfter: newQuantity,
            reason: `E-commerce ${action} from ${platform || 'unknown platform'}`,
            reference: order_id || '',
            notes: JSON.stringify(body),
          },
        });

        console.log(`✅ E-commerce webhook: ${action} for SKU ${sku}, quantity change: ${quantity_change}`);

        return NextResponse.json({
          success: true,
          message: `Stock updated for SKU ${sku}`,
          sku,
          previous_quantity: item.quantity,
          new_quantity: newQuantity,
          quantity_change,
        });

      case 'product_update':
        // Update product details if provided
        const updateData: any = {};
        if (product_data) {
          if (product_data.name) updateData.name = product_data.name;
          if (product_data.description) updateData.description = product_data.description;
          if (product_data.price) updateData.sellingPrice = parseFloat(product_data.price);
          if (product_data.cost) updateData.costPrice = parseFloat(product_data.cost);
          if (product_data.barcode) updateData.barcode = product_data.barcode;
          if (product_data.image_url) updateData.imageUrl = product_data.image_url;
        }

        if (Object.keys(updateData).length > 0) {
          result = await prisma.generalInventoryItem.update({
            where: { id: item.id },
            data: updateData,
          });

          return NextResponse.json({
            success: true,
            message: `Product updated for SKU ${sku}`,
            sku,
            updated_fields: Object.keys(updateData),
          });
        } else {
          return NextResponse.json(
            { error: 'No product data provided for update' },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ E-commerce webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification (some platforms require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  const verify_token = searchParams.get('verify_token');

  // Simple verification for platforms like Facebook/Shopify that use challenge verification
  if (challenge && verify_token) {
    // In production, validate the verify_token
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'active',
    message: 'E-commerce webhook endpoint is active',
    supported_actions: ['order_created', 'stock_update', 'product_update'],
    supported_platforms: ['shopify', 'woocommerce', 'bigcommerce', 'custom'],
  });
}
