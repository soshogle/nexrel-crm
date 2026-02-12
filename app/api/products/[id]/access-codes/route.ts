/**
 * Product access codes - for digital products
 * POST: Generate access codes
 * GET: List codes for product
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

function generateCode(template?: string | null): string {
  const code = randomBytes(4).toString('hex').toUpperCase();
  return template ? template.replace('{code}', code) : `KEY-${code}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { accessCodes: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const unredeemed = product.accessCodes.filter((c) => !c.redeemedAt);
    return NextResponse.json({
      success: true,
      total: product.accessCodes.length,
      unredeemed: unredeemed.length,
      codes: product.accessCodes.map((c) => ({
        id: c.id,
        code: c.code,
        redeemedAt: c.redeemedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching access codes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch codes' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(1, parseInt(body.count, 10) || 1), 100);

    const template = product.accessCodeTemplate || 'CODE-{code}';
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code = generateCode(template);
      while (codes.includes(code) || (await prisma.productAccessCode.findUnique({ where: { code } }))) {
        code = generateCode(template);
      }
      codes.push(code);
      await prisma.productAccessCode.create({
        data: { productId: params.id, code },
      });
    }

    return NextResponse.json({
      success: true,
      generated: count,
      codes,
    });
  } catch (error: any) {
    console.error('Error generating access codes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate codes' },
      { status: 500 }
    );
  }
}
