export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REDiagnosticStatus } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
        property: {
          include: {
            priceChanges: {
              select: {
                changeType: true,
                oldPrice: true,
                newPrice: true,
                detectedAt: true,
              },
              orderBy: { detectedAt: 'desc' },
              take: 20,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ diagnostics });
  } catch (error) {
    console.error('Stale Diagnostic GET error:', error);
    return apiErrors.internal('Failed to fetch diagnostics');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Address and daysOnMarket are required');
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
    return apiErrors.internal('Failed to create diagnostic');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { id, status, agentNotes, ...rest } = body;

    if (!id) {
      return apiErrors.badRequest('Diagnostic ID required');
    }

    const existing = await prisma.rEStaleDiagnostic.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('Diagnostic not found');
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
    return apiErrors.internal('Failed to update diagnostic');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiErrors.badRequest('Diagnostic ID required');
    }

    const existing = await prisma.rEStaleDiagnostic.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound('Diagnostic not found');
    }

    await prisma.rEStaleDiagnostic.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stale Diagnostic DELETE error:', error);
    return apiErrors.internal('Failed to delete diagnostic');
  }
}