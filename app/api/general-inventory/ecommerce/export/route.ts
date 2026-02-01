
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CSV Helper function
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// GET /api/general-inventory/ecommerce/export - Export inventory in various e-commerce formats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'shopify'; // shopify, woocommerce, bigcommerce, generic

    // Fetch all active inventory items
    const items = await prisma.generalInventoryItem.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        category: true,
        supplier: true,
        location: true,
      },
      orderBy: { name: 'asc' },
    });

    let csvContent = '';
    let filename = '';

    switch (format) {
      case 'shopify':
        filename = `shopify_inventory_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = generateShopifyCSV(items);
        break;

      case 'woocommerce':
        filename = `woocommerce_inventory_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = generateWooCommerceCSV(items);
        break;

      case 'bigcommerce':
        filename = `bigcommerce_inventory_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = generateBigCommerceCSV(items);
        break;

      case 'generic':
      default:
        filename = `ecommerce_inventory_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = generateGenericCSV(items);
        break;
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting e-commerce inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export inventory' },
      { status: 500 }
    );
  }
}

// Shopify CSV Format
function generateShopifyCSV(items: any[]): string {
  const headers = [
    'Handle',
    'Title',
    'Body (HTML)',
    'Vendor',
    'Product Category',
    'Type',
    'Tags',
    'Published',
    'Option1 Name',
    'Option1 Value',
    'Option2 Name',
    'Option2 Value',
    'Option3 Name',
    'Option3 Value',
    'Variant SKU',
    'Variant Grams',
    'Variant Inventory Tracker',
    'Variant Inventory Qty',
    'Variant Inventory Policy',
    'Variant Fulfillment Service',
    'Variant Price',
    'Variant Compare At Price',
    'Variant Requires Shipping',
    'Variant Taxable',
    'Variant Barcode',
    'Image Src',
    'Image Position',
    'Image Alt Text',
    'Gift Card',
    'SEO Title',
    'SEO Description',
    'Google Shopping / Google Product Category',
    'Google Shopping / Gender',
    'Google Shopping / Age Group',
    'Google Shopping / MPN',
    'Google Shopping / AdWords Grouping',
    'Google Shopping / AdWords Labels',
    'Google Shopping / Condition',
    'Google Shopping / Custom Product',
    'Google Shopping / Custom Label 0',
    'Google Shopping / Custom Label 1',
    'Google Shopping / Custom Label 2',
    'Google Shopping / Custom Label 3',
    'Google Shopping / Custom Label 4',
    'Variant Image',
    'Variant Weight Unit',
    'Variant Tax Code',
    'Cost per item',
    'Status',
  ];

  let csv = headers.map(escapeCSV).join(',') + '\n';

  items.forEach((item) => {
    const handle = item.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const row = [
      handle, // Handle
      item.name, // Title
      item.description || '', // Body (HTML)
      item.supplier?.name || '', // Vendor
      item.category?.name || '', // Product Category
      item.category?.name || '', // Type
      '', // Tags
      'TRUE', // Published
      'Title', // Option1 Name
      'Default Title', // Option1 Value
      '', // Option2 Name
      '', // Option2 Value
      '', // Option3 Name
      '', // Option3 Value
      item.sku, // Variant SKU
      '', // Variant Grams
      'shopify', // Variant Inventory Tracker
      item.quantity, // Variant Inventory Qty
      'deny', // Variant Inventory Policy
      'manual', // Variant Fulfillment Service
      item.sellingPrice || '', // Variant Price
      '', // Variant Compare At Price
      'TRUE', // Variant Requires Shipping
      'TRUE', // Variant Taxable
      item.barcode || '', // Variant Barcode
      item.imageUrl || '', // Image Src
      1, // Image Position
      item.name, // Image Alt Text
      'FALSE', // Gift Card
      item.name, // SEO Title
      item.description || '', // SEO Description
      '', // Google Shopping / Google Product Category
      '', // Gender
      '', // Age Group
      '', // MPN
      '', // AdWords Grouping
      '', // AdWords Labels
      'new', // Condition
      'FALSE', // Custom Product
      '', // Custom Label 0
      '', // Custom Label 1
      '', // Custom Label 2
      '', // Custom Label 3
      '', // Custom Label 4
      '', // Variant Image
      item.unit || 'kg', // Variant Weight Unit
      '', // Variant Tax Code
      item.costPrice || '', // Cost per item
      'active', // Status
    ];

    csv += row.map(escapeCSV).join(',') + '\n';
  });

  return csv;
}

// WooCommerce CSV Format
function generateWooCommerceCSV(items: any[]): string {
  const headers = [
    'ID',
    'Type',
    'SKU',
    'Name',
    'Published',
    'Is featured?',
    'Visibility in catalog',
    'Short description',
    'Description',
    'Date sale price starts',
    'Date sale price ends',
    'Tax status',
    'Tax class',
    'In stock?',
    'Stock',
    'Low stock amount',
    'Backorders allowed?',
    'Sold individually?',
    'Weight (kg)',
    'Length (cm)',
    'Width (cm)',
    'Height (cm)',
    'Allow customer reviews?',
    'Purchase note',
    'Sale price',
    'Regular price',
    'Categories',
    'Tags',
    'Shipping class',
    'Images',
    'Download limit',
    'Download expiry days',
    'Parent',
    'Upsells',
    'Cross-sells',
    'External URL',
    'Button text',
    'Position',
    'Meta: _barcode',
  ];

  let csv = headers.map(escapeCSV).join(',') + '\n';

  items.forEach((item) => {
    const row = [
      '', // ID (auto-generated by WooCommerce)
      'simple', // Type
      item.sku, // SKU
      item.name, // Name
      1, // Published
      0, // Is featured?
      'visible', // Visibility in catalog
      item.description ? item.description.substring(0, 100) : '', // Short description
      item.description || '', // Description
      '', // Date sale price starts
      '', // Date sale price ends
      'taxable', // Tax status
      '', // Tax class
      item.quantity > 0 ? 1 : 0, // In stock?
      item.quantity, // Stock
      item.reorderLevel || '', // Low stock amount
      0, // Backorders allowed?
      0, // Sold individually?
      '', // Weight
      '', // Length
      '', // Width
      '', // Height
      1, // Allow customer reviews?
      '', // Purchase note
      '', // Sale price
      item.sellingPrice || '', // Regular price
      item.category?.name || '', // Categories
      '', // Tags
      '', // Shipping class
      item.imageUrl || '', // Images
      '', // Download limit
      '', // Download expiry days
      '', // Parent
      '', // Upsells
      '', // Cross-sells
      '', // External URL
      '', // Button text
      0, // Position
      item.barcode || '', // Meta: _barcode
    ];

    csv += row.map(escapeCSV).join(',') + '\n';
  });

  return csv;
}

// BigCommerce CSV Format
function generateBigCommerceCSV(items: any[]): string {
  const headers = [
    'Product ID',
    'Product Name',
    'Product Type',
    'Product Code/SKU',
    'Bin Picking Number',
    'Brand Name',
    'Option Set',
    'Option Set Align',
    'Product Description',
    'Price',
    'Cost Price',
    'Retail Price',
    'Sale Price',
    'Fixed Shipping Cost',
    'Free Shipping',
    'Product Weight',
    'Product Width',
    'Product Height',
    'Product Depth',
    'Allow Purchases?',
    'Product Visible?',
    'Product Availability',
    'Track Inventory',
    'Current Stock Level',
    'Low Stock Level',
    'Category',
    'Product Image ID - 1',
    'Product Image File - 1',
    'Product Image Description - 1',
    'Product Image Is Thumbnail - 1',
    'Search Keywords',
    'Page Title',
    'Meta Description',
    'Product Condition',
    'Show Product Condition?',
    'Sort Order',
    'Product Tax Class',
    'Product UPC/EAN',
    'Stop Processing Rules',
    'Product URL',
    'Redirect Old URL?',
    'GPS Global Trade Item Number',
    'GPS Manufacturer Part Number',
    'GPS Gender',
    'GPS Age Group',
    'GPS Color',
    'GPS Size',
    'GPS Material',
    'GPS Pattern',
    'GPS Item Group ID',
    'GPS Category',
    'GPS Enabled',
  ];

  let csv = headers.map(escapeCSV).join(',') + '\n';

  items.forEach((item) => {
    const row = [
      '', // Product ID
      item.name, // Product Name
      'P', // Product Type
      item.sku, // Product Code/SKU
      '', // Bin Picking Number
      item.supplier?.name || '', // Brand Name
      '', // Option Set
      'right', // Option Set Align
      item.description || '', // Product Description
      item.sellingPrice || '', // Price
      item.costPrice || '', // Cost Price
      '', // Retail Price
      '', // Sale Price
      '', // Fixed Shipping Cost
      'N', // Free Shipping
      '', // Product Weight
      '', // Product Width
      '', // Product Height
      '', // Product Depth
      'Y', // Allow Purchases?
      'Y', // Product Visible?
      item.quantity > 0 ? 'available' : 'unavailable', // Product Availability
      'product', // Track Inventory
      item.quantity, // Current Stock Level
      item.reorderLevel || '', // Low Stock Level
      item.category?.name || '', // Category
      '', // Product Image ID - 1
      item.imageUrl || '', // Product Image File - 1
      item.name, // Product Image Description - 1
      'Y', // Product Image Is Thumbnail - 1
      '', // Search Keywords
      item.name, // Page Title
      item.description || '', // Meta Description
      'New', // Product Condition
      'Y', // Show Product Condition?
      0, // Sort Order
      '', // Product Tax Class
      item.barcode || '', // Product UPC/EAN
      'N', // Stop Processing Rules
      '', // Product URL
      'N', // Redirect Old URL?
      '', // GPS Global Trade Item Number
      '', // GPS Manufacturer Part Number
      '', // GPS Gender
      '', // GPS Age Group
      '', // GPS Color
      '', // GPS Size
      '', // GPS Material
      '', // GPS Pattern
      '', // GPS Item Group ID
      '', // GPS Category
      'N', // GPS Enabled
    ];

    csv += row.map(escapeCSV).join(',') + '\n';
  });

  return csv;
}

// Generic CSV Format (universal format)
function generateGenericCSV(items: any[]): string {
  const headers = [
    'SKU',
    'Product Name',
    'Description',
    'Category',
    'Supplier/Brand',
    'Current Stock',
    'Reorder Level',
    'Unit',
    'Cost Price',
    'Selling Price',
    'Barcode/UPC',
    'Location',
    'Image URL',
    'Notes',
  ];

  let csv = headers.map(escapeCSV).join(',') + '\n';

  items.forEach((item) => {
    const row = [
      item.sku,
      item.name,
      item.description || '',
      item.category?.name || '',
      item.supplier?.name || '',
      item.quantity,
      item.reorderLevel || '',
      item.unit || 'unit',
      item.costPrice || '',
      item.sellingPrice || '',
      item.barcode || '',
      item.location?.name || '',
      item.imageUrl || '',
      item.notes || '',
    ];

    csv += row.map(escapeCSV).join(',') + '\n';
  });

  return csv;
}
