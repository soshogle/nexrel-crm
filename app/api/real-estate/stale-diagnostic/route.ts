export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REDiagnosticStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as REDiagnosticStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const diagnostics = await prisma.rEStaleDiagnostic.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        property: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ diagnostics });
  } catch (error) {
    console.error('Stale Diagnostic GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
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
      fsboListingId,
      address,
      listPrice,
      daysOnMarket,
      analysisJson,
      topReasons,
      actionPlan,
      clientSummary,
      agentNotes,
      sellerEmailDraft,
      callScript,
    } = body;

    if (!address || daysOnMarket === undefined) {
      return NextResponse.json(
        { error: 'Address and daysOnMarket are required' },
        { status: 400 }
      );
    }

    const diagnostic = await prisma.rEStaleDiagnostic.create({
      data: {
        userId: session.user.id,
        propertyId: propertyId || null,
        fsboListingId: fsboListingId || null,
        address,
        listPrice: listPrice ? parseFloat(listPrice) : null,
        daysOnMarket: parseInt(daysOnMarket),
        analysisJson: analysisJson || {},
        topReasons: topReasons || [],
        actionPlan: actionPlan || [],
        clientSummary,
        agentNotes,
        sellerEmailDraft,
        callScript,
        status: 'PENDING',
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json({ diagnostic, success: true });
  } catch (error) {
    console.error('Stale Diagnostic POST error:', error);
    return NextResponse.json({ error: 'Failed to create diagnostic' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, agentNotes, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'Diagnostic ID required' }, { status: 400 });
    }

    const existing = await prisma.rEStaleDiagnostic.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Diagnostic not found' }, { status: 404 });
    }

    const diagnostic = await prisma.rEStaleDiagnostic.update({
      where: { id },
      data: {
        ...(status && { status: status as REDiagnosticStatus }),
        ...(agentNotes !== undefined && { agentNotes }),
        ...(status === 'REVIEWED' && { reviewedAt: new Date() }),
        ...(status === 'ACTIONED' && { actionedAt: new Date() }),
      },
    });

    return NextResponse.json({ diagnostic, success: true });
  } catch (error) {
    console.error('Stale Diagnostic PUT error:', error);
    return NextResponse.json({ error: 'Failed to update diagnostic' }, { status: 500 });
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
      return NextResponse.json({ error: 'Diagnostic ID required' }, { status: 400 });
    }

    const existing = await prisma.rEStaleDiagnostic.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Diagnostic not found' }, { status: 404 });
    }

    await prisma.rEStaleDiagnostic.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stale Diagnostic DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete diagnostic' }, { status: 500 });
  }
}