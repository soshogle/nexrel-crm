'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { FileText, BarChart3, TrendingUp, Calendar, RefreshCw, Download, FileSpreadsheet, FileType, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { exportReportToExcel, exportReportToPDF, exportReportToWord } from '@/lib/report-export';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const REPORT_TYPE_ICONS: Record<string, React.ReactNode> = {
  sales: <BarChart3 className="h-5 w-5" />,
  leads: <TrendingUp className="h-5 w-5" />,
  revenue: <BarChart3 className="h-5 w-5" />,
  overview: <FileText className="h-5 w-5" />,
  custom: <FileText className="h-5 w-5" />,
};

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const reportIdFromUrl = searchParams.get('id');
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/generated');
      if (res.ok) {
        const data = await res.json();
        const reportList = data.reports || [];
        setReports(reportList);
        if (reportList.length > 0) {
          const toSelect = reportIdFromUrl
            ? reportList.find((r: any) => r.id === reportIdFromUrl) || reportList[0]
            : reportList[0];
          setSelectedReport(toSelect);
        } else {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }, [reportIdFromUrl]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReports();
    }
  }, [status, fetchReports]);

  const handleExport = async (format: 'excel' | 'pdf' | 'word') => {
    if (!selectedReport) return;
    try {
      const reportForExport = {
        id: selectedReport.id,
        title: selectedReport.title,
        reportType: selectedReport.reportType,
        period: selectedReport.period,
        createdAt: selectedReport.createdAt,
        content: (selectedReport.content as any) || {},
      };
      if (format === 'excel') {
        exportReportToExcel(reportForExport);
      } else if (format === 'pdf') {
        exportReportToPDF(reportForExport);
      } else {
        await exportReportToWord(reportForExport);
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const renderReportContent = (content: any) => {
    if (!content) return null;

    if (typeof content !== 'object') {
      return <p className="text-gray-600 whitespace-pre-wrap">{String(content)}</p>;
    }

    return (
      <div className="space-y-6">
        {content.summary && (
          <div className="p-4 rounded-xl bg-white/60 border border-purple-200/50">
            <p className="text-gray-600 whitespace-pre-wrap">{content.summary}</p>
          </div>
        )}
        {content.agentStats && Array.isArray(content.agentStats) && content.agentStats.length > 0 && (
          <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Voice Agent Usage
              </CardTitle>
              <CardDescription>
                Which agents are used the most and where they&apos;re assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {content.agentStats.map((agent: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl border border-purple-200/50 bg-white/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{agent.name}</p>
                        <p className="text-xs text-gray-500">
                          {agent.totalCalls} calls · {agent.campaigns} campaigns · {agent.aiEmployees} AI employees
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">{agent.totalCalls}</p>
                      <p className="text-xs text-gray-500">total calls</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {content.metrics && typeof content.metrics === 'object' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(content.metrics).map(([key, value], idx) => (
              <div
                key={key}
                className={cn(
                  'text-center p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg',
                  idx % 3 === 0 && 'border-purple-200/50 bg-gradient-to-br from-white/90 to-purple-50/30',
                  idx % 3 === 1 && 'border-blue-200/50 bg-gradient-to-br from-white/90 to-blue-50/30',
                  idx % 3 === 2 && 'border-pink-200/50 bg-gradient-to-br from-white/90 to-pink-50/30'
                )}
              >
                <p className="text-sm text-gray-600 capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </p>
              </div>
            ))}
          </div>
        )}
        {content.charts && Array.isArray(content.charts) && content.charts.length > 0 && (
          <div className="space-y-6">
            {content.charts.map((chart: any, i: number) => (
              <Card
                key={i}
                className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm"
              >
                <CardHeader>
                  <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {chart.title || `Chart ${i + 1}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chart.data && chart.data.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {chart.data.length <= 6 ? (
                          <PieChart>
                            <Pie
                              data={chart.data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              dataKey="value"
                              animationDuration={1000}
                            >
                              {chart.data.map((_: any, j: number) => (
                                <Cell key={j} fill={CHART_COLORS[j % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(v: any) => (typeof v === 'number' && String(chart.title).toLowerCase().includes('revenue') ? `$${v.toLocaleString()}` : v)}
                            />
                          </PieChart>
                        ) : (
                          <BarChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(v: any) => (typeof v === 'number' && String(chart.title).toLowerCase().includes('revenue') ? `$${v.toLocaleString()}` : v)}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={1000} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chart.data?.map((item: any, j: number) => (
                        <div key={j} className="flex justify-between items-center py-2 px-3 bg-white/50 rounded-lg">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="font-semibold text-purple-600">
                            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!content.summary && !content.metrics && (!content.charts || content.charts.length === 0) && (
          <pre className="text-sm bg-white/60 p-4 rounded-xl border border-purple-200/50 overflow-auto max-h-96">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
        <div className="relative z-10 space-y-6 p-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2 rounded-lg" />
            <Skeleton className="h-5 w-96 rounded-lg" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      {/* Animated background effects - matching AI Brain */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              <FileText className="h-10 w-10 text-purple-600" />
              AI Reports
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              AI-generated reports from your assistant. Ask the AI to create reports like &quot;Generate a sales report for last month&quot;.
            </p>
          </div>
          <Button
            onClick={fetchReports}
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Reports List Sidebar */}
          <Card className="lg:col-span-1 border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Your Reports
              </CardTitle>
              <CardDescription>
                {reports.length} report{reports.length !== 1 ? 's' : ''} generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-purple-100/80 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-purple-600 opacity-70" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No reports yet</p>
                  <p className="text-xs text-gray-500 mt-2">Ask the AI assistant to create a report</p>
                  <p className="text-xs text-purple-600 mt-1 font-medium">e.g. &quot;Generate a sales report for last month&quot;</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border-2 transition-all duration-200',
                        selectedReport?.id === report.id
                          ? 'border-purple-500 bg-purple-50/80 shadow-md'
                          : 'border-transparent hover:bg-white/60 hover:border-purple-200/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          'mt-0.5 p-1 rounded-lg',
                          selectedReport?.id === report.id ? 'text-purple-600' : 'text-gray-500'
                        )}>
                          {REPORT_TYPE_ICONS[report.reportType] || <FileText className="h-5 w-5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-800">{report.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-xs',
                                selectedReport?.id === report.id && 'bg-purple-100 text-purple-700 border-purple-200'
                              )}
                            >
                              {report.reportType}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Detail */}
          <Card className="lg:col-span-2 border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {selectedReport ? selectedReport.title : 'Select a report'}
                  </CardTitle>
                  <CardDescription>
                    {selectedReport && (
                      <>
                        {selectedReport.reportType} • {selectedReport.period || 'All time'} •{' '}
                        {formatDistanceToNow(new Date(selectedReport.createdAt), { addSuffix: true })}
                      </>
                    )}
                  </CardDescription>
                </div>
                {selectedReport && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-purple-200">
                      <DropdownMenuItem onClick={() => handleExport('excel')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>
                        <FileType className="h-4 w-4 mr-2 text-red-600" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('word')}>
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        Export as Word
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedReport ? (
                renderReportContent(selectedReport.content as any)
              ) : (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-20 h-20 rounded-full bg-purple-100/80 flex items-center justify-center mb-4">
                    <Calendar className="h-10 w-10 text-purple-600 opacity-60" />
                  </div>
                  <p className="text-gray-600">Select a report from the list or create one via the AI assistant</p>
                  <p className="text-sm text-purple-600 mt-2 font-medium">Try: &quot;Generate a sales report for last month&quot;</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
