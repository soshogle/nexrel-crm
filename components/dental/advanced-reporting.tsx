/**
 * Advanced Reporting System
 * Comprehensive reporting and analytics for dental practices
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/lib/dental/clinic-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileDown, TrendingUp, TrendingDown, DollarSign, Users, Calendar as CalendarIcon, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface ReportData {
  period: string;
  revenue: number;
  patients: number;
  appointments: number;
  procedures: number;
  averageTicket: number;
  growthRate: number;
}

export function AdvancedReporting() {
  const { data: session } = useSession();
  const { activeClinic } = useClinic();
  const [reportType, setReportType] = useState<'revenue' | 'patients' | 'procedures' | 'comprehensive'>('comprehensive');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateReport();
  }, [reportType, dateRange, startDate, endDate, activeClinic]);

  const generateReport = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from API
      // For now, we'll generate mock data
      const data: ReportData[] = [];
      const periods = getPeriods(dateRange, startDate, endDate);

      periods.forEach((period) => {
        data.push({
          period,
          revenue: Math.random() * 50000 + 10000,
          patients: Math.floor(Math.random() * 100 + 20),
          appointments: Math.floor(Math.random() * 150 + 30),
          procedures: Math.floor(Math.random() * 200 + 50),
          averageTicket: Math.random() * 500 + 200,
          growthRate: (Math.random() - 0.5) * 20,
        });
      });

      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriods = (range: string, start?: Date, end?: Date): string[] => {
    const periods: string[] = [];
    const now = new Date();

    switch (range) {
      case 'today':
        return [format(now, 'MMM dd, yyyy')];
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push(format(date, 'MMM dd'));
        }
        return periods;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push(format(date, 'MMM dd'));
        }
        return periods;
      case 'quarter':
        for (let i = 2; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push(format(date, 'MMM yyyy'));
        }
        return periods;
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          periods.push(format(date, 'MMM yyyy'));
        }
        return periods;
      case 'custom':
        if (start && end) {
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          for (let i = 0; i <= days; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            periods.push(format(date, 'MMM dd'));
          }
        }
        return periods;
      default:
        return [];
    }
  };

  const exportReport = () => {
    // In a real implementation, this would generate CSV/PDF
    const csv = [
      ['Period', 'Revenue', 'Patients', 'Appointments', 'Procedures', 'Avg Ticket', 'Growth Rate'],
      ...reportData.map((d) => [
        d.period,
        d.revenue.toFixed(2),
        d.patients.toString(),
        d.appointments.toString(),
        d.procedures.toString(),
        d.averageTicket.toFixed(2),
        d.growthRate.toFixed(2) + '%',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const totalRevenue = reportData.reduce((sum, d) => sum + d.revenue, 0);
  const totalPatients = reportData.reduce((sum, d) => sum + d.patients, 0);
  const totalAppointments = reportData.reduce((sum, d) => sum + d.appointments, 0);
  const avgGrowthRate = reportData.length > 0
    ? reportData.reduce((sum, d) => sum + d.growthRate, 0) / reportData.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue Report</SelectItem>
                  <SelectItem value="patients">Patient Report</SelectItem>
                  <SelectItem value="procedures">Procedures Report</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button onClick={exportReport} className="w-full">
                <FileDown className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-1 mt-1">
              {avgGrowthRate > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs ${avgGrowthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgGrowthRate > 0 ? '+' : ''}{avgGrowthRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xs text-gray-500 mt-1">Active patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
            <p className="text-xs text-gray-500 mt-1">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${reportData.length > 0
                ? (totalRevenue / totalAppointments || 0).toFixed(2)
                : '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per appointment</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Report Data</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading report data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Period</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Patients</th>
                    <th className="text-right p-2">Appointments</th>
                    <th className="text-right p-2">Procedures</th>
                    <th className="text-right p-2">Avg Ticket</th>
                    <th className="text-right p-2">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">{row.period}</td>
                      <td className="text-right p-2">${row.revenue.toFixed(2)}</td>
                      <td className="text-right p-2">{row.patients}</td>
                      <td className="text-right p-2">{row.appointments}</td>
                      <td className="text-right p-2">{row.procedures}</td>
                      <td className="text-right p-2">${row.averageTicket.toFixed(2)}</td>
                      <td className={`text-right p-2 ${row.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.growthRate > 0 ? '+' : ''}{row.growthRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
