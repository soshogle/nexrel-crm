export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const netSheets = await getCrmDb(ctx).rESellerNetSheet.findMany({
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
    return apiErrors.internal('Failed to fetch net sheets');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Address and sale price are required');
    }

    const netSheet = await getCrmDb(ctx).rESellerNetSheet.create({
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
    return apiErrors.internal('Failed to create net sheet');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return apiErrors.badRequest('Net sheet ID required');
    }

    const existing = await getCrmDb(ctx).rESellerNetSheet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('Net sheet not found');
    }

    const netSheet = await getCrmDb(ctx).rESellerNetSheet.update({
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
    return apiErrors.internal('Failed to update net sheet');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiErrors.badRequest('Net sheet ID required');
    }

    const existing = await getCrmDb(ctx).rESellerNetSheet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('Net sheet not found');
    }

    await getCrmDb(ctx).rESellerNetSheet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Net Sheet DELETE error:', error);
    return apiErrors.internal('Failed to delete net sheet');
  }
}