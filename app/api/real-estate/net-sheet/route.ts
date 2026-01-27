export const dynamic = "force-dynamic";

/**
 * Seller Net Sheet Calculator API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateSellerNetSheet, getUserNetSheets } from '@/lib/real-estate/cma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const netSheets = await getUserNetSheets(session.user.id, limit);
    return NextResponse.json({ netSheets });
  } catch (error) {
    console.error('Net sheet GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch net sheets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.address || !body.salePrice) {
      return NextResponse.json(
        { error: 'Address and sale price required' },
        { status: 400 }
      );
    }

    const netSheet = await calculateSellerNetSheet(
      {
        address: body.address,
        city: body.city || '',
        state: body.state || '',
        salePrice: body.salePrice,
        mortgageBalance: body.mortgageBalance,
        secondMortgage: body.secondMortgage,
        heloc: body.heloc,
        listingAgentCommission: body.listingAgentCommission,
        buyerAgentCommission: body.buyerAgentCommission,
        titleInsurance: body.titleInsurance,
        escrowFees: body.escrowFees,
        attorneyFees: body.attorneyFees,
        transferTax: body.transferTax,
        transferTaxIsPercent: body.transferTaxIsPercent,
        recordingFees: body.recordingFees,
        hoaFees: body.hoaFees,
        prorations: body.prorations,
        repairCredits: body.repairCredits,
        sellerConcessions: body.sellerConcessions,
        homeWarranty: body.homeWarranty,
        otherFees: body.otherFees,
        otherCredits: body.otherCredits
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      netSheet
    });
  } catch (error) {
    console.error('Net sheet POST error:', error);
    return NextResponse.json(
      { error: 'Net sheet calculation failed' },
      { status: 500 }
    );
  }
}
