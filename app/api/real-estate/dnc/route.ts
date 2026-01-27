export const dynamic = "force-dynamic";

/**
 * Do Not Call (DNC) List API
 * Manage DNC entries for compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REDNCSource } from '@prisma/client';

/**
 * GET - Check if a phone number is on DNC list
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const country = searchParams.get('country') || 'US';

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalized = phone.replace(/\D/g, '');
    const last10 = normalized.slice(-10);

    // Check internal DNC list
    const dncEntry = await prisma.rEDNCEntry.findFirst({
      where: {
        OR: [
          { phoneNumber: normalized },
          { phoneNumber: last10 },
          { phoneNumber: { contains: last10 } }
        ]
      }
    });

    if (dncEntry) {
      return NextResponse.json({
        onDNC: true,
        source: dncEntry.source,
        reason: dncEntry.reason,
        addedAt: dncEntry.addedAt,
        expiresAt: dncEntry.expiresAt
      });
    }

    // TODO: Check external DNC registries
    // Canadian DNCL API integration
    // US FTC DNC registry integration

    return NextResponse.json({
      onDNC: false,
      message: 'Number is clear to call'
    });

  } catch (error) {
    console.error('DNC check error:', error);
    return NextResponse.json(
      { error: 'Failed to check DNC status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add number to DNC list
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, source, reason, country, expiresAt } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalized = phone.replace(/\D/g, '');

    // Check if already exists
    const existing = await prisma.rEDNCEntry.findFirst({
      where: { phoneNumber: normalized }
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Number already on DNC list',
        entry: existing
      });
    }

    // Add to DNC list
    const entry = await prisma.rEDNCEntry.create({
      data: {
        phoneNumber: normalized,
        source: (source as REDNCSource) || 'MANUAL_UPLOAD',
        reason: reason || 'User requested',
        country: country || 'US',
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Number added to DNC list',
      entry
    });

  } catch (error) {
    console.error('DNC add error:', error);
    return NextResponse.json(
      { error: 'Failed to add to DNC list' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove number from DNC list
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalized = phone.replace(/\D/g, '');

    // Only allow removing internal entries (not CANADIAN_DNCL or US_FTC)
    const entry = await prisma.rEDNCEntry.findFirst({
      where: { phoneNumber: normalized }
    });

    if (!entry) {
      return NextResponse.json({
        success: false,
        message: 'Number not found on DNC list'
      });
    }

    if (entry.source === 'CANADIAN_DNCL' || entry.source === 'US_FTC') {
      return NextResponse.json(
        { error: 'Cannot remove official registry entries' },
        { status: 403 }
      );
    }

    await prisma.rEDNCEntry.delete({
      where: { id: entry.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Number removed from DNC list'
    });

  } catch (error) {
    console.error('DNC remove error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from DNC list' },
      { status: 500 }
    );
  }
}
