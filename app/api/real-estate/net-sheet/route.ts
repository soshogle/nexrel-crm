export const dynamic = "force-dynamic";

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
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const netSheets = await prisma.rESellerNetSheet.findMany({
      where: {
        userId: session.user.id,
        ...(propertyId && { propertyId }),
        ...(leadId && { leadId }),
      },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            listPrice: true,
          },
        },
        lead: {
          select: {
            id: true,
            contactPerson: true,
          },
        },
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
      leadId,
      salePrice,
      mortgageBalance,
      commissionRate,
      closingCostRate,
      repairs,
      otherCredits,
      titleInsurance,
      escrowFees,
      transferTax,
      homeWarranty,
      otherCosts,
      notes,
    } = body;

    if (!salePrice) {
      return NextResponse.json({ error: 'Sale price required' }, { status: 400 });
    }

    const price = parseFloat(salePrice);
    const mortgage = mortgageBalance ? parseFloat(mortgageBalance) : 0;
    const commRate = commissionRate ? parseFloat(commissionRate) / 100 : 0.05; // Default 5%
    const closingRate = closingCostRate ? parseFloat(closingCostRate) / 100 : 0.02; // Default 2%
    const repairCost = repairs ? parseFloat(repairs) : 0;
    const credits = otherCredits ? parseFloat(otherCredits) : 0;
    const titleIns = titleInsurance ? parseFloat(titleInsurance) : price * 0.005;
    const escrow = escrowFees ? parseFloat(escrowFees) : 1500;
    const transfer = transferTax ? parseFloat(transferTax) : price * 0.01;
    const warranty = homeWarranty ? parseFloat(homeWarranty) : 0;
    const other = otherCosts ? parseFloat(otherCosts) : 0;

    // Calculate
    const commission = price * commRate;
    const closingCosts = price * closingRate;
    const totalDeductions = commission + closingCosts + repairCost + titleIns + escrow + transfer + warranty + other;
    const grossProceeds = price - mortgage;
    const netProceeds = grossProceeds - totalDeductions + credits;

    const netSheet = await prisma.rESellerNetSheet.create({
      data: {
        userId: session.user.id,
        propertyId,
        leadId,
        salePrice: price,
        mortgageBalance: mortgage,
        commissionRate: commRate * 100,
        commissionAmount: commission,
        closingCostRate: closingRate * 100,
        closingCostAmount: closingCosts,
        repairs: repairCost,
        otherCredits: credits,
        titleInsurance: titleIns,
        escrowFees: escrow,
        transferTax: transfer,
        homeWarranty: warranty,
        otherCosts: other,
        totalDeductions,
        grossProceeds,
        netProceeds,
        notes,
      },
    });

    return NextResponse.json({
      netSheet,
      summary: {
        salePrice: price,
        mortgagePayoff: mortgage,
        commission,
        closingCosts,
        repairs: repairCost,
        otherFees: titleIns + escrow + transfer + warranty + other,
        credits,
        totalDeductions,
        grossProceeds,
        netProceeds,
      },
      success: true,
    });
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

    // Recalculate if price changed
    let recalculated = {};
    if (updateData.salePrice) {
      const price = parseFloat(updateData.salePrice);
      const mortgage = updateData.mortgageBalance ? parseFloat(updateData.mortgageBalance) : existing.mortgageBalance || 0;
      const commRate = (existing.commissionRate || 5) / 100;
      const closingRate = (existing.closingCostRate || 2) / 100;

      const commission = price * commRate;
      const closingCosts = price * closingRate;
      const totalDeductions = commission + closingCosts + (existing.repairs || 0) +
        (existing.titleInsurance || 0) + (existing.escrowFees || 0) +
        (existing.transferTax || 0) + (existing.homeWarranty || 0) + (existing.otherCosts || 0);
      const grossProceeds = price - mortgage;
      const netProceeds = grossProceeds - totalDeductions + (existing.otherCredits || 0);

      recalculated = {
        commissionAmount: commission,
        closingCostAmount: closingCosts,
        totalDeductions,
        grossProceeds,
        netProceeds,
      };
    }

    const netSheet = await prisma.rESellerNetSheet.update({
      where: { id },
      data: {
        ...updateData,
        ...recalculated,
      },
    });

    return NextResponse.json({ netSheet, success: true });
  } catch (error) {
    console.error('Net Sheet PUT error:', error);
    return NextResponse.json({ error: 'Failed to update net sheet' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, message: 'RE feature initializing...' });
}
