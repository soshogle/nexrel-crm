
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT /api/general-inventory/suppliers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, contactName, email, phone, address, website, notes } = body;

    // Verify ownership
    const existingSupplier = await prisma.generalInventorySupplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = await prisma.generalInventorySupplier.update({
      where: { id: params.id },
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        website,
        notes,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/general-inventory/suppliers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingSupplier = await prisma.generalInventorySupplier.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.generalInventorySupplier.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
