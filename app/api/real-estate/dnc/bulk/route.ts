export const dynamic = "force-dynamic";

/**
 * Bulk DNC Import API
 * Import DNC lists from files or external sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REDNCSource } from '@prisma/client';

/**
 * POST - Bulk import DNC entries
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumbers, source, country } = body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return NextResponse.json(
        { error: 'phoneNumbers array is required' },
        { status: 400 }
      );
    }

    if (phoneNumbers.length > 10000) {
      return NextResponse.json(
        { error: 'Maximum 10,000 numbers per import' },
        { status: 400 }
      );
    }

    const dncSource = (source as REDNCSource) || 'MANUAL_UPLOAD';
    const dncCountry = country || 'US';

    // Normalize all phone numbers
    const normalizedNumbers = phoneNumbers
      .map((p: string) => p.replace(/\D/g, ''))
      .filter((p: string) => p.length >= 10);

    // Get existing entries to avoid duplicates
    const existing = await prisma.rEDNCEntry.findMany({
      where: {
        phoneNumber: { in: normalizedNumbers }
      },
      select: { phoneNumber: true }
    });

    const existingSet = new Set(existing.map(e => e.phoneNumber));
    const newNumbers = normalizedNumbers.filter(n => !existingSet.has(n));

    // Bulk create
    if (newNumbers.length > 0) {
      await prisma.rEDNCEntry.createMany({
        data: newNumbers.map(phone => ({
          phoneNumber: phone,
          source: dncSource,
          country: dncCountry,
          reason: 'Bulk import'
        })),
        skipDuplicates: true
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        submitted: phoneNumbers.length,
        valid: normalizedNumbers.length,
        alreadyExists: existing.length,
        imported: newNumbers.length
      }
    });

  } catch (error) {
    console.error('Bulk DNC import error:', error);
    return NextResponse.json(
      { error: 'Failed to import DNC list' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get DNC statistics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stats by source
    const stats = await prisma.rEDNCEntry.groupBy({
      by: ['source', 'country'],
      _count: true
    });

    const totalCount = await prisma.rEDNCEntry.count();

    // Get recent additions
    const recentAdditions = await prisma.rEDNCEntry.findMany({
      orderBy: { addedAt: 'desc' },
      take: 10,
      select: {
        phoneNumber: true,
        source: true,
        addedAt: true
      }
    });

    return NextResponse.json({
      totalCount,
      bySource: stats,
      recentAdditions: recentAdditions.map(r => ({
        ...r,
        phoneNumber: r.phoneNumber.slice(0, 3) + '***' + r.phoneNumber.slice(-4) // Mask for privacy
      }))
    });

  } catch (error) {
    console.error('DNC stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get DNC statistics' },
      { status: 500 }
    );
  }
}
