/**
 * Dental Reports API
 * Aggregates real data for reporting and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ReportParams {
  reportType: 'revenue' | 'patients' | 'procedures' | 'comprehensive';
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  clinicId?: string;
}

interface ReportData {
  period: string;
  revenue: number;
  patients: number;
  appointments: number;
  procedures: number;
  averageTicket: number;
  growthRate: number;
}

/**
 * Calculate date range based on selection
 */
function getDateRange(dateRange: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  
  switch (dateRange) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case 'week':
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now),
      };
    case 'month':
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
      };
    case 'quarter':
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    case 'custom':
      if (startDate && endDate) {
        return {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate)),
        };
      }
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
      };
    default:
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
      };
  }
}

/**
 * Get period breakdown for grouping data
 */
function getPeriods(dateRange: string, start: Date, end: Date): Array<{ period: string; start: Date; end: Date }> {
  const periods: Array<{ period: string; start: Date; end: Date }> = [];
  
  switch (dateRange) {
    case 'today':
      periods.push({
        period: format(start, 'MMM dd, yyyy'),
        start,
        end,
      });
      break;
    case 'week':
      for (let i = 6; i >= 0; i--) {
        const date = subDays(end, i);
        periods.push({
          period: format(date, 'MMM dd'),
          start: startOfDay(date),
          end: endOfDay(date),
        });
      }
      break;
    case 'month':
      for (let i = 29; i >= 0; i--) {
        const date = subDays(end, i);
        periods.push({
          period: format(date, 'MMM dd'),
          start: startOfDay(date),
          end: endOfDay(date),
        });
      }
      break;
    case 'quarter':
      for (let i = 2; i >= 0; i--) {
        const date = subMonths(end, i);
        periods.push({
          period: format(date, 'MMM yyyy'),
          start: startOfMonth(date),
          end: endOfMonth(date),
        });
      }
      break;
    case 'year':
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(end, i);
        periods.push({
          period: format(date, 'MMM yyyy'),
          start: startOfMonth(date),
          end: endOfMonth(date),
        });
      }
      break;
    case 'custom':
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 30) {
        // Daily breakdown for short ranges
        for (let i = 0; i <= days; i++) {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          periods.push({
            period: format(date, 'MMM dd'),
            start: startOfDay(date),
            end: endOfDay(date),
          });
        }
      } else {
        // Weekly breakdown for longer ranges
        const weeks = Math.ceil(days / 7);
        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(start);
          weekStart.setDate(weekStart.getDate() + i * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          if (weekEnd > end) weekEnd.setTime(end.getTime());
          periods.push({
            period: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`,
            start: startOfDay(weekStart),
            end: endOfDay(weekEnd),
          });
        }
      }
      break;
  }
  
  return periods;
}

/**
 * GET /api/dental/reports - Generate reports
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = (searchParams.get('reportType') || 'comprehensive') as ReportParams['reportType'];
    const dateRange = (searchParams.get('dateRange') || 'month') as ReportParams['dateRange'];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const clinicId = searchParams.get('clinicId') || undefined;

    // Calculate date range
    const { start, end } = getDateRange(dateRange, startDate, endDate);
    const periods = getPeriods(dateRange, start, end);

    // Build base where clause for clinic filtering
    const clinicWhere: any = clinicId ? { clinicId } : {};

    // Fetch data for each period
    const reportData: ReportData[] = [];

    for (const period of periods) {
      // Revenue from invoices and payments
      // For clinic filtering, we need to check if lead has appointments/procedures with that clinic
      let invoiceWhere: any = {
        userId: session.user.id,
        issueDate: {
          gte: period.start,
          lte: period.end,
        },
      };

      // If clinicId is provided, we'll filter invoices by checking if the lead has appointments/procedures with that clinic
      if (clinicId) {
        // Get lead IDs that have appointments or procedures with this clinic
        const clinicLeadIds = await prisma.bookingAppointment.findMany({
          where: {
            userId: session.user.id,
            clinicId,
          },
          select: {
            leadId: true,
          },
          distinct: ['leadId'],
        });
        const clinicLeadIdsSet = new Set(clinicLeadIds.map(a => a.leadId).filter(Boolean));
        
        invoiceWhere.leadId = {
          in: Array.from(clinicLeadIdsSet),
        };
      }

      const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          totalAmount: true,
          paidAmount: true,
          leadId: true,
        },
      });

      // Payments - similar filtering
      let paymentWhere: any = {
        userId: session.user.id,
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
        status: 'COMPLETED',
      };

      if (clinicId) {
        const clinicLeadIds = await prisma.bookingAppointment.findMany({
          where: {
            userId: session.user.id,
            clinicId,
          },
          select: {
            leadId: true,
          },
          distinct: ['leadId'],
        });
        const clinicLeadIdsSet = new Set(clinicLeadIds.map(a => a.leadId).filter(Boolean));
        
        paymentWhere.leadId = {
          in: Array.from(clinicLeadIdsSet),
        };
      }

      const payments = await prisma.payment.findMany({
        where: paymentWhere,
        select: {
          amount: true,
        },
      });

      // Calculate revenue (use paid amount from invoices + completed payments)
      const revenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) +
                     payments.reduce((sum, p) => sum + p.amount, 0);

      // Patients (unique leads with appointments or procedures in this period)
      const patientIds = new Set<string>();
      
      // From appointments
      // If clinicId is provided, filter by checking if lead has procedures with that clinic
      let appointmentWhere: any = {
        userId: session.user.id,
        appointmentDate: {
          gte: period.start,
          lte: period.end,
        },
      };

      if (clinicId) {
        // Get lead IDs that have procedures with this clinic
        const clinicProcedures = await (prisma as any).dentalProcedure.findMany({
          where: {
            userId: session.user.id,
            clinicId,
          },
          select: {
            leadId: true,
          },
          distinct: ['leadId'],
        });
        const clinicLeadIds = new Set(clinicProcedures.map((p: any) => p.leadId).filter(Boolean));
        
        if (clinicLeadIds.size > 0) {
          appointmentWhere.leadId = {
            in: Array.from(clinicLeadIds),
          };
        } else {
          // No leads with procedures for this clinic, return empty
          appointmentWhere.leadId = { in: [] };
        }
      }

      const appointments = await prisma.bookingAppointment.findMany({
        where: appointmentWhere,
        select: {
          leadId: true,
        },
      });
      appointments.forEach(apt => {
        if (apt.leadId) patientIds.add(apt.leadId);
      });

      // From procedures
      const procedures = await (prisma as any).dentalProcedure.findMany({
        where: {
          userId: session.user.id,
          performedDate: {
            gte: period.start,
            lte: period.end,
          },
          ...clinicWhere,
        },
        select: {
          leadId: true,
        },
      });
      procedures.forEach((proc: any) => {
        if (proc.leadId) patientIds.add(proc.leadId);
      });

      // From invoices
      invoices.forEach(inv => {
        if (inv.leadId) patientIds.add(inv.leadId);
      });

      const patients = patientIds.size;

      // Appointments count
      const appointmentsCount = appointments.length;

      // Procedures count
      const proceduresCount = procedures.length;

      // Average ticket (revenue / appointments)
      const averageTicket = appointmentsCount > 0 ? revenue / appointmentsCount : 0;

      // Calculate growth rate (compare to previous period)
      let growthRate = 0;
      if (reportData.length > 0) {
        const previousRevenue = reportData[reportData.length - 1].revenue;
        if (previousRevenue > 0) {
          growthRate = ((revenue - previousRevenue) / previousRevenue) * 100;
        }
      }

      reportData.push({
        period: period.period,
        revenue,
        patients,
        appointments: appointmentsCount,
        procedures: proceduresCount,
        averageTicket,
        growthRate,
      });
    }

    // Calculate summary metrics
    const totalRevenue = reportData.reduce((sum, d) => sum + d.revenue, 0);
    const totalPatients = new Set<string>();
    const totalAppointments = reportData.reduce((sum, d) => sum + d.appointments, 0);
    const totalProcedures = reportData.reduce((sum, d) => sum + d.procedures, 0);

    // Get unique patients across all periods
    let allAppointmentsWhere: any = {
      userId: session.user.id,
      appointmentDate: {
        gte: start,
        lte: end,
      },
    };

    if (clinicId) {
      const clinicProcedures = await (prisma as any).dentalProcedure.findMany({
        where: {
          userId: session.user.id,
          clinicId,
        },
        select: {
          leadId: true,
        },
        distinct: ['leadId'],
      });
      const clinicLeadIds = new Set(clinicProcedures.map((p: any) => p.leadId).filter(Boolean));
      
      if (clinicLeadIds.size > 0) {
        allAppointmentsWhere.leadId = {
          in: Array.from(clinicLeadIds),
        };
      } else {
        allAppointmentsWhere.leadId = { in: [] };
      }
    }

    const allAppointments = await prisma.bookingAppointment.findMany({
      where: allAppointmentsWhere,
      select: {
        leadId: true,
      },
    });
    allAppointments.forEach(apt => {
      if (apt.leadId) totalPatients.add(apt.leadId);
    });

    const allProcedures = await (prisma as any).dentalProcedure.findMany({
      where: {
        userId: session.user.id,
        performedDate: {
          gte: start,
          lte: end,
        },
        ...clinicWhere,
      },
      select: {
        leadId: true,
      },
    });
    allProcedures.forEach((proc: any) => {
      if (proc.leadId) totalPatients.add(proc.leadId);
    });

    const avgGrowthRate = reportData.length > 0
      ? reportData.reduce((sum, d) => sum + d.growthRate, 0) / reportData.length
      : 0;

    return NextResponse.json({
      success: true,
      reportType,
      dateRange,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      clinicId,
      data: reportData,
      summary: {
        totalRevenue,
        totalPatients: totalPatients.size,
        totalAppointments,
        totalProcedures,
        averageTicket: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
        avgGrowthRate,
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
