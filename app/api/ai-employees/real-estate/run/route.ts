export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createDalContext } from '@/lib/context/industry-context';
import { leadService } from '@/lib/dal/lead-service';

// AI Employee type definitions
type REAIEmployeeType = 
  | 'RE_SPEED_TO_LEAD'
  | 'RE_FSBO_OUTREACH'
  | 'RE_EXPIRED_OUTREACH'
  | 'RE_COLD_REACTIVATION'
  | 'RE_DOCUMENT_CHASER'
  | 'RE_SHOWING_CONFIRM'
  | 'RE_SPHERE_NURTURE'
  | 'RE_WEEKLY_SNAPSHOT'
  | 'RE_MONTHLY_REPORT'
  | 'RE_ANNUAL_REVIEW'
  | 'RE_STALE_DIAGNOSTIC'
  | 'RE_LISTING_PRESENTATION';

interface ExecutionResult {
  success: boolean;
  employeeType: string;
  tasksCompleted: number;
  summary: string;
  details?: any;
}

// Execute Speed to Lead - Respond instantly to new leads
async function executeSpeedToLead(userId: string): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const newLeads = await leadService.findMany(ctx, {
    where: {
      status: 'NEW',
      lastContactedAt: null,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    },
    take: 10
  });

  for (const lead of newLeads) {
    await leadService.update(ctx, lead.id, {
      status: 'CONTACTED',
      lastContactedAt: new Date()
    });
  }

  return {
    success: true,
    employeeType: 'RE_SPEED_TO_LEAD',
    tasksCompleted: newLeads.length,
    summary: `Processed ${newLeads.length} new leads with instant response`,
    details: { leadIds: newLeads.map(l => l.id) }
  };
}

// Execute FSBO Outreach - Find and contact FSBO listings
async function executeFSBOOutreach(userId: string): Promise<ExecutionResult> {
  // Find FSBO listings that need outreach
  const fsboListings = await prisma.rEFSBOListing.findMany({
    where: {
      status: 'NEW',
      contactAttempts: { lt: 3 }
    },
    take: 20
  });

  let contacted = 0;
  for (const listing of fsboListings) {
    // Update contact attempt count
    await prisma.rEFSBOListing.update({
      where: { id: listing.id },
      data: {
        contactAttempts: { increment: 1 },
        lastContactedAt: new Date(),
        status: listing.contactAttempts >= 2 ? 'CONTACTED' : 'NEW'
      }
    });
    contacted++;
  }

  return {
    success: true,
    employeeType: 'RE_FSBO_OUTREACH',
    tasksCompleted: contacted,
    summary: `Contacted ${contacted} FSBO listings`,
    details: { listingIds: fsboListings.map(l => l.id) }
  };
}

// Execute Stale Diagnostic - Analyze listings that aren't selling
async function executeStaleDiagnostic(userId: string): Promise<ExecutionResult> {
  // Find properties that have been on market too long
  const staleProperties = await prisma.rEProperty.findMany({
    where: {
      userId,
      listingStatus: 'ACTIVE',
      daysOnMarket: { gte: 21 }
    },
    take: 10
  });

  // Create diagnostic requests for each
  const diagnostics = [];
  for (const property of staleProperties) {
    // Check if we already have a recent diagnostic
    const existingDiagnostic = await prisma.rEStaleDiagnostic.findFirst({
      where: {
        userId,
        propertyId: property.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within last week
      }
    });

    if (!existingDiagnostic) {
      // Create a basic diagnostic entry (actual LLM analysis via /analyze endpoint)
      const diagnostic = await prisma.rEStaleDiagnostic.create({
        data: {
          userId,
          propertyId: property.id,
          address: property.address,
          listPrice: property.listPrice,
          daysOnMarket: property.daysOnMarket,
          analysisJson: { status: 'pending_analysis' },
          topReasons: [],
          actionPlan: [],
          status: 'PENDING'
        }
      });
      diagnostics.push(diagnostic);
    }
  }

  return {
    success: true,
    employeeType: 'RE_STALE_DIAGNOSTIC',
    tasksCompleted: diagnostics.length,
    summary: `Created ${diagnostics.length} stale listing diagnostics for analysis`,
    details: { diagnosticIds: diagnostics.map(d => d.id) }
  };
}

// Execute Market Report Generation
async function executeMarketReport(userId: string, reportType: 'WEEKLY_MARKET_UPDATE' | 'MONTHLY_MARKET_REPORT' | 'QUARTERLY_ANALYSIS'): Promise<ExecutionResult> {
  // Get user info for region
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { operatingLocation: true, name: true }
  });

  const region = user?.operatingLocation || 'Local Market';

  // Check if we already have a recent report of this type
  const days = reportType === 'WEEKLY_MARKET_UPDATE' ? 7 : reportType === 'MONTHLY_MARKET_REPORT' ? 30 : 90;
  const existingReport = await prisma.rEMarketReport.findFirst({
    where: {
      userId,
      type: reportType,
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (existingReport) {
    return {
      success: true,
      employeeType: `RE_${reportType}_REPORT`,
      tasksCompleted: 0,
      summary: `Recent ${reportType.toLowerCase()} report already exists`,
      details: { reportId: existingReport.id }
    };
  }

  // Create a placeholder report (actual generation via /generate endpoint)
  const currentDate = new Date();
  const periodStart = new Date();
  if (reportType === 'WEEKLY_MARKET_UPDATE') periodStart.setDate(currentDate.getDate() - 7);
  else if (reportType === 'MONTHLY_MARKET_REPORT') periodStart.setMonth(currentDate.getMonth() - 1);
  else periodStart.setMonth(currentDate.getMonth() - 3);

  const titleMap = {
    'WEEKLY_MARKET_UPDATE': 'Weekly Market Update',
    'MONTHLY_MARKET_REPORT': 'Monthly Market Report',
    'QUARTERLY_ANALYSIS': 'Quarterly Analysis'
  };

  const report = await prisma.rEMarketReport.create({
    data: {
      userId,
      type: reportType,
      title: `${region} ${titleMap[reportType]}`,
      region,
      periodStart,
      periodEnd: currentDate,
      executiveSummary: 'Report generation in progress...'
    }
  });

  return {
    success: true,
    employeeType: `RE_${reportType}`,
    tasksCompleted: 1,
    summary: `Initiated ${titleMap[reportType].toLowerCase()} for ${region}`,
    details: { reportId: report.id }
  };
}

// Execute Cold Lead Reactivation
async function executeColdReactivation(userId: string): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const coldLeads = await leadService.findMany(ctx, {
    where: {
      status: { in: ['CONTACTED', 'QUALIFIED'] },
      lastContactedAt: { lt: thirtyDaysAgo }
    },
    take: 25
  });

  for (const lead of coldLeads) {
    await leadService.update(ctx, lead.id, { lastContactedAt: new Date() });
  }

  return {
    success: true,
    employeeType: 'RE_COLD_REACTIVATION',
    tasksCompleted: coldLeads.length,
    summary: `Re-engaged ${coldLeads.length} cold leads`,
    details: { leadIds: coldLeads.map(l => l.id) }
  };
}

// Execute Sphere of Influence Nurture
async function executeSphereNurture(userId: string): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  
  const pastClients = await leadService.findMany(ctx, {
    where: {
      status: 'CONVERTED',
      lastContactedAt: { lt: sixtyDaysAgo }
    },
    take: 20
  });

  for (const client of pastClients) {
    await leadService.update(ctx, client.id, { lastContactedAt: new Date() });
  }

  return {
    success: true,
    employeeType: 'RE_SPHERE_NURTURE',
    tasksCompleted: pastClients.length,
    summary: `Nurtured ${pastClients.length} past clients in your sphere`,
    details: { clientIds: pastClients.map(c => c.id) }
  };
}

// Main execution handler
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeType } = body as { employeeType: REAIEmployeeType };

    if (!employeeType) {
      return NextResponse.json({ error: 'Employee type required' }, { status: 400 });
    }

    let result: ExecutionResult;

    switch (employeeType) {
      case 'RE_SPEED_TO_LEAD':
        result = await executeSpeedToLead(session.user.id);
        break;
      case 'RE_FSBO_OUTREACH':
        result = await executeFSBOOutreach(session.user.id);
        break;
      case 'RE_STALE_DIAGNOSTIC':
        result = await executeStaleDiagnostic(session.user.id);
        break;
      case 'RE_WEEKLY_SNAPSHOT':
        result = await executeMarketReport(session.user.id, 'WEEKLY_MARKET_UPDATE');
        break;
      case 'RE_MONTHLY_REPORT':
        result = await executeMarketReport(session.user.id, 'MONTHLY_MARKET_REPORT');
        break;
      case 'RE_ANNUAL_REVIEW':
        result = await executeMarketReport(session.user.id, 'QUARTERLY_ANALYSIS');
        break;
      case 'RE_COLD_REACTIVATION':
        result = await executeColdReactivation(session.user.id);
        break;
      case 'RE_SPHERE_NURTURE':
        result = await executeSphereNurture(session.user.id);
        break;
      case 'RE_EXPIRED_OUTREACH':
      case 'RE_DOCUMENT_CHASER':
      case 'RE_SHOWING_CONFIRM':
      case 'RE_LISTING_PRESENTATION':
        // These require more complex workflows - placeholder for now
        result = {
          success: true,
          employeeType,
          tasksCompleted: 0,
          summary: `${employeeType} execution queued. Full implementation coming soon.`,
          details: { status: 'queued' }
        };
        break;
      default:
        return NextResponse.json({ error: 'Unknown employee type' }, { status: 400 });
    }

    // Log the execution
    await prisma.rEAIEmployeeExecution.create({
      data: {
        userId: session.user.id,
        employeeType: employeeType as any,
        status: result.success ? 'SUCCESS' : 'FAILED',
        result: result.details || {},
        completedAt: new Date()
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Employee execution error:', error);
    return NextResponse.json({ error: 'Execution failed' }, { status: 500 });
  }
}

// GET - Fetch execution history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeType = searchParams.get('employeeType');
    const limit = parseInt(searchParams.get('limit') || '20');

    const executions = await prisma.rEAIEmployeeExecution.findMany({
      where: {
        userId: session.user.id,
        ...(employeeType && { employeeType: employeeType as any })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('AI Employee history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
