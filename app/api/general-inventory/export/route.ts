
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/general-inventory/export - Export inventory to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      orderBy: { sku: 'asc' },
    });

    // Generate CSV
    const headers = [
      'SKU',
      'Name',
      'Description',
      'Category',
      'Supplier',
      'Location',
      'Quantity',
      'Unit',
      'Reorder Level',
      'Reorder Quantity',
      'Cost Price',
      'Selling Price',
      'Barcode',
      'Notes',
    ];

    const csvRows = [
      headers.join(','),
      ...items.map((item) =>
        [
          escapeCSV(item.sku),
          escapeCSV(item.name),
          escapeCSV(item.description || ''),
          escapeCSV(item.category?.name || ''),
          escapeCSV(item.supplier?.name || ''),
          escapeCSV(item.location?.name || ''),
          item.quantity,
          escapeCSV(item.unit || ''),
          item.reorderLevel,
          item.reorderQuantity,
          item.costPrice || '',
          item.sellingPrice || '',
          escapeCSV(item.barcode || ''),
          escapeCSV(item.notes || ''),
        ].join(',')
      ),
    ];

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function escapeCSV(str: string): string {
  if (!str) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = str.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}
