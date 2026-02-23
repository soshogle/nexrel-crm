
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PUT /api/general-inventory/suppliers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.notFound('Supplier not found');
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
    return apiErrors.internal(error.message);
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
      return apiErrors.unauthorized();
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
      return apiErrors.notFound('Supplier not found');
    }

    // Soft delete by setting isActive to false
    await prisma.generalInventorySupplier.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return apiErrors.internal(error.message);
  }
}
