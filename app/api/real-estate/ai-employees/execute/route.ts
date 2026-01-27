export const dynamic = "force-dynamic";

/**
 * Execute Real Estate AI Employee Jobs
 * Handles specific job executions for RE AI employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { 
  executeSpeedToLead,
  executeFSBOOutreach,
  generateMarketReport,
  runStaleDiagnostic
} from '@/lib/ai-employees/real-estate';

/**
 * POST - Execute a specific AI Employee job
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobType, input } = body;

    if (!jobType || !input) {
      return NextResponse.json(
        { error: 'jobType and input are required' },
        { status: 400 }
      );
    }

    // Add userId to input
    const fullInput = { ...input, userId: session.user.id };

    let result;

    switch (jobType) {
      case 'speed_to_lead':
        if (!input.leadId || !input.phone) {
          return NextResponse.json(
            { error: 'leadId and phone are required for speed_to_lead' },
            { status: 400 }
          );
        }
        result = await executeSpeedToLead(fullInput);
        break;

      case 'fsbo_outreach':
        if (!input.fsboListingId || !input.sellerPhone) {
          return NextResponse.json(
            { error: 'fsboListingId and sellerPhone are required for fsbo_outreach' },
            { status: 400 }
          );
        }
        result = await executeFSBOOutreach(fullInput);
        break;

      case 'market_report':
        if (!input.region || !input.periodType) {
          return NextResponse.json(
            { error: 'region and periodType are required for market_report' },
            { status: 400 }
          );
        }
        result = await generateMarketReport(fullInput);
        break;

      case 'stale_diagnostic':
        if (!input.address || !input.listPrice || !input.daysOnMarket) {
          return NextResponse.json(
            { error: 'address, listPrice, and daysOnMarket are required for stale_diagnostic' },
            { status: 400 }
          );
        }
        result = await runStaleDiagnostic(fullInput);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown job type: ${jobType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      jobType,
      result
    });

  } catch (error) {
    console.error('RE AI Employee Execute error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute job' },
      { status: 500 }
    );
  }
}
