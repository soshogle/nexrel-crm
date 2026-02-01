/**
 * API endpoint for triggering lead research
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadResearcher } from '@/lib/ai-employees/lead-researcher';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('[Lead Research API] POST request received');
  try {
    const session = await getServerSession(authOptions);
    console.log('[Lead Research API] Session:', session?.user?.id ? 'Found' : 'Not found');

    if (!session?.user?.id) {
      console.log('[Lead Research API] Unauthorized - no session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[Lead Research API] Body:', JSON.stringify(body));
    const { leadId, businessName, website, industry } = body;

    if (!leadId && !businessName) {
      return NextResponse.json(
        { error: 'Either leadId or businessName is required' },
        { status: 400 }
      );
    }

    // If leadId is provided, fetch lead data
    let leadData;
    if (leadId) {
      leadData = await prisma.lead.findUnique({
        where: { id: leadId }
      });

      if (!leadData) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }

      if (leadData.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Start research
    const result = await leadResearcher.research({
      userId: session.user.id,
      leadId: leadId || undefined,
      businessName: leadData?.businessName || businessName,
      website: leadData?.website || website,
      industry: industry || undefined
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Lead research API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start lead research' },
      { status: 500 }
    );
  }
}
