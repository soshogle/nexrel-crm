
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET SUPPLIER BY ID
 */

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplier = await prisma.supplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            items: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('❌ Supplier fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

/**
 * UPDATE SUPPLIER
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Verify supplier exists
    const existing = await prisma.supplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: params.id },
      data: body,
    });

    console.log(`✅ Supplier updated: ${updatedSupplier.name}`);

    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error('❌ Supplier update error:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

/**
 * DELETE SUPPLIER
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            items: true,
            purchaseOrders: {
              where: {
                status: {
                  in: ['DRAFT', 'SENT', 'CONFIRMED'],
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check if supplier has active purchase orders
    if (supplier._count.purchaseOrders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with active purchase orders' },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    await prisma.supplier.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    console.log(`✅ Supplier deactivated: ${supplier.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Supplier delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
