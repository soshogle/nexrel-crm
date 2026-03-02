'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Users,
  ClipboardList,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductionReportDashboardProps {
  clinicId?: string;
}

interface ReportDataItem {
  period: string;
  revenue: number;
  patients: number;
  appointments: number;
  procedures: number;
  averageTicket: number;
  growthRate: number;
}

interface ReportSummary {
  totalRevenue: number;
  totalPatients: number;
  totalAppointments: number;
  totalProcedures: number;
  averageTicket: number;
  avgGrowthRate: number;
}

type DateRangeOption = 'today' | 'week' | 'month' | 'quarter' | 'year';

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const CAD_FORMATTER = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ProductionReportDashboard({ clinicId }: ProductionReportDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>('month');
  const [data, setData] = useState<ReportDataItem[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        reportType: 'comprehensive',
        dateRange,
        ...(clinicId && { clinicId }),
      });
      const response = await fetch(`/api/dental/reports?${params}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to load report');
      setData(json.data ?? []);
      setSummary(json.summary ?? null);
    } catch (error: any) {
      console.error('Error fetching production report:', error);
      toast.error(error.message || 'Failed to load production report');
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, clinicId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const maxRevenue = data.length > 0 ? Math.max(...data.map((d) => d.revenue), 1) : 1;

  if (loading && !summary) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Production Report</h2>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary ? CAD_FORMATTER.format(summary.totalRevenue) : '—'}
            </div>
            {summary && summary.avgGrowthRate !== 0 && (
              <GrowthBadge value={summary.avgGrowthRate} />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patients Seen
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? NUMBER_FORMATTER.format(summary.totalPatients) : '—'}
            </div>
            {summary && summary.avgGrowthRate !== 0 && (
              <GrowthBadge value={summary.avgGrowthRate} />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Procedures Completed
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? NUMBER_FORMATTER.format(summary.totalProcedures) : '—'}
            </div>
            {summary && summary.avgGrowthRate !== 0 && (
              <GrowthBadge value={summary.avgGrowthRate} />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Ticket
            </CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? CAD_FORMATTER.format(summary.averageTicket) : '—'}
            </div>
            {summary && summary.avgGrowthRate !== 0 && (
              <GrowthBadge value={summary.avgGrowthRate} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Period</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-muted-foreground">
              No data for selected period
            </div>
          ) : (
            <div className="flex h-[240px] items-end gap-2 overflow-x-auto pb-8">
              {data.map((item, idx) => {
                const barHeightPx = maxRevenue > 0 ? (item.revenue / maxRevenue) * 200 : 0;
                return (
                  <div
                    key={`${item.period}-${idx}`}
                    className="flex min-w-[48px] flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full max-w-[60px] rounded-t bg-gradient-to-t from-purple-600 to-purple-400 transition-all"
                      style={{ height: `${Math.max(barHeightPx, 4)}px` }}
                      title={CAD_FORMATTER.format(item.revenue)}
                    />
                    <span className="text-xs text-muted-foreground truncate max-w-full text-center">
                      {item.period}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Period Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No breakdown data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Patients</TableHead>
                  <TableHead className="text-right">Appointments</TableHead>
                  <TableHead className="text-right">Procedures</TableHead>
                  <TableHead className="text-right">Avg Ticket</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, idx) => (
                  <TableRow
                    key={`${item.period}-${idx}`}
                    className={idx % 2 === 1 ? 'bg-muted/30' : ''}
                  >
                    <TableCell className="font-medium">{item.period}</TableCell>
                    <TableCell className="text-right">
                      {CAD_FORMATTER.format(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {NUMBER_FORMATTER.format(item.patients)}
                    </TableCell>
                    <TableCell className="text-right">
                      {NUMBER_FORMATTER.format(item.appointments)}
                    </TableCell>
                    <TableCell className="text-right">
                      {NUMBER_FORMATTER.format(item.procedures)}
                    </TableCell>
                    <TableCell className="text-right">
                      {CAD_FORMATTER.format(item.averageTicket)}
                    </TableCell>
                    <TableCell className="text-right">
                      <GrowthBadge value={item.growthRate} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Provider Production Availability */}
      <Card className="shadow-sm border-dashed">
        <CardContent className="flex items-center gap-4 py-12">
          <div className="rounded-full bg-purple-100 p-4">
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-muted-foreground">
              Provider breakdown unavailable
            </p>
            <p className="text-sm text-muted-foreground">
              This report currently shows verified clinic-level production totals.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <Badge
      variant="outline"
      className={`mt-1 gap-0.5 ${
        isPositive
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>{value >= 0 ? '+' : ''}{value.toFixed(1)}%</span>
    </Badge>
  );
}
