export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const netSheets = await prisma.rESellerNetSheet.findMany({
      where: {
        userId: session.user.id,
        ...(propertyId && { propertyId }),
      },
      include: {
        property: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ netSheets });
  } catch (error) {
    console.error('Net Sheet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch net sheets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      propertyId,
      address,
      salePrice,
      mortgagePayoff,
      commissionRate,
      commissionAmount,
      listingAgentComm,
      buyerAgentComm,
      closingCosts,
      titleInsurance,
      transferTax,
      repairs,
      stagingCosts,
      otherCosts,
      estimatedNet,
    } = body;

    if (!address || !salePrice) {
      return NextResponse.json(
        { error: 'Address and sale price are required' },
        { status: 400 }
      );
    }

    const netSheet = await prisma.rESellerNetSheet.create({
      data: {
        userId: session.user.id,
        propertyId: propertyId || null,
        address,
        salePrice: parseFloat(salePrice),
        mortgagePayoff: mortgagePayoff ? parseFloat(mortgagePayoff) : null,
        commissionRate: commissionRate ? parseFloat(commissionRate) : 5.0,
        commissionAmount: commissionAmount ? parseFloat(commissionAmount) : null,
        listingAgentComm: listingAgentComm ? parseFloat(listingAgentComm) : null,
        buyerAgentComm: buyerAgentComm ? parseFloat(buyerAgentComm) : null,
        closingCosts: closingCosts ? parseFloat(closingCosts) : null,
        titleInsurance: titleInsurance ? parseFloat(titleInsurance) : null,
        transferTax: transferTax ? parseFloat(transferTax) : null,
        repairs: repairs ? parseFloat(repairs) : null,
        stagingCosts: stagingCosts ? parseFloat(stagingCosts) : null,
        otherCosts: otherCosts ? parseFloat(otherCosts) : null,
        estimatedNet: estimatedNet ? parseFloat(estimatedNet) : null,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json({ netSheet, success: true });
  } catch (error) {
    console.error('Net Sheet POST error:', error);
    return NextResponse.json({ error: 'Failed to create net sheet' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Net sheet ID required' }, { status: 400 });
    }

    const existing = await prisma.rESellerNetSheet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Net sheet not found' }, { status: 404 });
    }

    const netSheet = await prisma.rESellerNetSheet.update({
      where: { id },
      data: {
        ...(updateData.salePrice !== undefined && { salePrice: parseFloat(updateData.salePrice) }),
        ...(updateData.mortgagePayoff !== undefined && { mortgagePayoff: parseFloat(updateData.mortgagePayoff) }),
        ...(updateData.commissionRate !== undefined && { commissionRate: parseFloat(updateData.commissionRate) }),
        ...(updateData.estimatedNet !== undefined && { estimatedNet: parseFloat(updateData.estimatedNet) }),
      },
    });

    return NextResponse.json({ netSheet, success: true });
  } catch (error) {
    console.error('Net Sheet PUT error:', error);
    return NextResponse.json({ error: 'Failed to update net sheet' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Net sheet ID required' }, { status: 400 });
    }

    const existing = await prisma.rESellerNetSheet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Net sheet not found' }, { status: 404 });
    }

    await prisma.rESellerNetSheet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Net Sheet DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete net sheet' }, { status: 500 });
  }
}