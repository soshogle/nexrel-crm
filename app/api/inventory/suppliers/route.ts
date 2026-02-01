
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET SUPPLIERS
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const where: any = { userId: session.user.id };
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            items: true,
            purchaseOrders: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('❌ Suppliers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

/**
 * CREATE SUPPLIER
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      taxId,
      paymentTerms,
      notes,
      rating,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        userId: session.user.id,
        name,
        contactPerson,
        email,
        phone,
        address,
        taxId,
        paymentTerms,
        notes,
        rating,
      },
    });

    console.log(`✅ Supplier created: ${name}`);

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error('❌ Supplier creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
