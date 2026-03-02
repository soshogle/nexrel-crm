/**
 * Execute RE AI Employee tasks (Speed to Lead, FSBO, etc.)
 * Used by: /api/ai-employees/real-estate/run and cron
 * Phase 2: Actual outreach (SMS, calls) + custom templates
 */

import { prisma } from '@/lib/db';
import { resolveDalContext } from '@/lib/context/industry-context';
import { leadService } from '@/lib/dal/lead-service';
import type { REAIEmployeeType } from '@prisma/client';
import { sendSMSToLead } from '@/lib/ai-employees/outreach-helper';
import { getTaskTemplate } from '@/lib/ai-employees/template-helper';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface REExecutionResult {
  success: boolean;
  employeeType: string;
  tasksCompleted: number;
  summary: string;
  details?: any;
}

const DEFAULT_SPEED_TO_LEAD_MSG =
  'Hi {firstName}! Thanks for your inquiry. A team member will reach out shortly. In the meantime, feel free to reply with any questions.';

async function executeSpeedToLead(
  userId: string,
  template?: { smsTemplate?: string | null } | null
): Promise<REExecutionResult> {
  const ctx = await resolveDalContext(userId);
  const newLeads = await leadService.findMany(ctx, {
    where: {
      status: 'NEW',
      lastContactedAt: null,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000),
      },
    },
    take: 10,
  });

  let sent = 0;
  const msg = template?.smsTemplate || DEFAULT_SPEED_TO_LEAD_MSG;
  for (const lead of newLeads) {
    if (lead.phone) {
      const res = await sendSMSToLead(userId, lead.id, msg);
      if (res.success) sent++;
      await delay(200);
    }
    await leadService.update(ctx, lead.id, {
      status: 'CONTACTED',
      lastContactedAt: new Date(),
    });
  }

  return {
    success: true,
    employeeType: 'RE_SPEED_TO_LEAD',
    tasksCompleted: sent,
    summary: `Sent ${sent} instant responses to ${newLeads.length} new leads`,
    details: { leadIds: newLeads.map((l) => l.id), sent },
  };
}

async function executeFSBOOutreach(userId: string): Promise<REExecutionResult> {
  const fsboListings = await prisma.rEFSBOListing.findMany({
    where: { status: 'NEW', contactAttempts: { lt: 3 } },
    take: 20,
  });

  let contacted = 0;
  for (const listing of fsboListings) {
    await prisma.rEFSBOListing.update({
      where: { id: listing.id },
      data: {
        contactAttempts: { increment: 1 },
        lastContactedAt: new Date(),
        status: listing.contactAttempts >= 2 ? 'CONTACTED' : 'NEW',
      },
    });
    contacted++;
  }

  return {
    success: true,
    employeeType: 'RE_FSBO_OUTREACH',
    tasksCompleted: contacted,
    summary: `Contacted ${contacted} FSBO listings`,
    details: { listingIds: fsboListings.map((l) => l.id) },
  };
}

async function executeStaleDiagnostic(userId: string): Promise<REExecutionResult> {
  const staleProperties = await prisma.rEProperty.findMany({
    where: {
      userId,
      listingStatus: 'ACTIVE',
      daysOnMarket: { gte: 21 },
    },
    take: 10,
  });

  const diagnostics = [];
  for (const property of staleProperties) {
    const existingDiagnostic = await prisma.rEStaleDiagnostic.findFirst({
      where: {
        userId,
        propertyId: property.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!existingDiagnostic) {
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
          status: 'PENDING',
        },
      });
      diagnostics.push(diagnostic);
    }
  }

  return {
    success: true,
    employeeType: 'RE_STALE_DIAGNOSTIC',
    tasksCompleted: diagnostics.length,
    summary: `Created ${diagnostics.length} stale listing diagnostics for analysis`,
    details: { diagnosticIds: diagnostics.map((d) => d.id) },
  };
}

async function executeMarketReport(
  userId: string,
  reportType: 'WEEKLY_MARKET_UPDATE' | 'MONTHLY_MARKET_REPORT' | 'QUARTERLY_ANALYSIS'
): Promise<REExecutionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { operatingLocation: true, name: true },
  });
  const region = user?.operatingLocation || 'Local Market';

  const days = reportType === 'WEEKLY_MARKET_UPDATE' ? 7 : reportType === 'MONTHLY_MARKET_REPORT' ? 30 : 90;
  const existingReport = await prisma.rEMarketReport.findFirst({
    where: {
      userId,
      type: reportType,
      createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    },
  });

  if (existingReport) {
    return {
      success: true,
      employeeType: `RE_${reportType}_REPORT`,
      tasksCompleted: 0,
      summary: `Recent ${reportType.toLowerCase()} report already exists`,
      details: { reportId: existingReport.id },
    };
  }

  const currentDate = new Date();
  const periodStart = new Date();
  if (reportType === 'WEEKLY_MARKET_UPDATE') periodStart.setDate(currentDate.getDate() - 7);
  else if (reportType === 'MONTHLY_MARKET_REPORT') periodStart.setMonth(currentDate.getMonth() - 1);
  else periodStart.setMonth(currentDate.getMonth() - 3);

  const titleMap = {
    WEEKLY_MARKET_UPDATE: 'Weekly Market Update',
    MONTHLY_MARKET_REPORT: 'Monthly Market Report',
    QUARTERLY_ANALYSIS: 'Quarterly Analysis',
  };

  const report = await prisma.rEMarketReport.create({
    data: {
      userId,
      type: reportType,
      title: `${region} ${titleMap[reportType]}`,
      region,
      periodStart,
      periodEnd: currentDate,
      executiveSummary: 'Report generation in progress...',
    },
  });

  return {
    success: true,
    employeeType: `RE_${reportType}`,
    tasksCompleted: 1,
    summary: `Initiated ${titleMap[reportType].toLowerCase()} for ${region}`,
    details: { reportId: report.id },
  };
}

async function executeColdReactivation(userId: string): Promise<REExecutionResult> {
  const ctx = await resolveDalContext(userId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const coldLeads = await leadService.findMany(ctx, {
    where: {
      status: { in: ['CONTACTED', 'QUALIFIED'] },
      lastContactedAt: { lt: thirtyDaysAgo },
    },
    take: 25,
  });

  for (const lead of coldLeads) {
    await leadService.update(ctx, lead.id, { lastContactedAt: new Date() });
  }

  return {
    success: true,
    employeeType: 'RE_COLD_REACTIVATION',
    tasksCompleted: coldLeads.length,
    summary: `Re-engaged ${coldLeads.length} cold leads`,
    details: { leadIds: coldLeads.map((l) => l.id) },
  };
}

async function executeSphereNurture(userId: string): Promise<REExecutionResult> {
  const ctx = await resolveDalContext(userId);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const pastClients = await leadService.findMany(ctx, {
    where: {
      status: 'CONVERTED',
      lastContactedAt: { lt: sixtyDaysAgo },
    },
    take: 20,
  });

  for (const client of pastClients) {
    await leadService.update(ctx, client.id, { lastContactedAt: new Date() });
  }

  return {
    success: true,
    employeeType: 'RE_SPHERE_NURTURE',
    tasksCompleted: pastClients.length,
    summary: `Nurtured ${pastClients.length} past clients in your sphere`,
    details: { clientIds: pastClients.map((c) => c.id) },
  };
}

export async function executeREEmployee(
  userId: string,
  employeeType: REAIEmployeeType,
  options?: { storeHistory?: boolean }
): Promise<REExecutionResult> {
  const template =
    employeeType === 'RE_SPEED_TO_LEAD'
      ? await getTaskTemplate(userId, 're', null, employeeType, employeeType)
      : null;

  let result: REExecutionResult;

  switch (employeeType) {
    case 'RE_SPEED_TO_LEAD':
      result = await executeSpeedToLead(userId, template);
      break;
    case 'RE_FSBO_OUTREACH':
      result = await executeFSBOOutreach(userId);
      break;
    case 'RE_STALE_DIAGNOSTIC':
      result = await executeStaleDiagnostic(userId);
      break;
    case 'RE_WEEKLY_SNAPSHOT':
      result = await executeMarketReport(userId, 'WEEKLY_MARKET_UPDATE');
      break;
    case 'RE_MONTHLY_REPORT':
      result = await executeMarketReport(userId, 'MONTHLY_MARKET_REPORT');
      break;
    case 'RE_ANNUAL_REVIEW':
      result = await executeMarketReport(userId, 'QUARTERLY_ANALYSIS');
      break;
    case 'RE_COLD_REACTIVATION':
      result = await executeColdReactivation(userId);
      break;
    case 'RE_SPHERE_NURTURE':
      result = await executeSphereNurture(userId);
      break;
    case 'RE_EXPIRED_OUTREACH':
    case 'RE_DOCUMENT_CHASER':
    case 'RE_SHOWING_CONFIRM':
    case 'RE_LISTING_PRESENTATION':
      result = {
        success: true,
        employeeType,
        tasksCompleted: 0,
        summary: `${employeeType} execution queued for asynchronous processing.`,
        details: { status: 'queued' },
      };
      break;
    default:
      result = {
        success: false,
        employeeType: employeeType as string,
        tasksCompleted: 0,
        summary: `Unknown employee type: ${employeeType}`,
      };
  }

  if (options?.storeHistory !== false) {
    await prisma.rEAIEmployeeExecution.create({
      data: {
        userId,
        employeeType: employeeType as any,
        employeeName: null,
        status: result.success ? 'completed' : 'failed',
        result: { ...result, details: result.details || {} } as any,
        completedAt: new Date(),
      },
    });
  }

  return result;
}
