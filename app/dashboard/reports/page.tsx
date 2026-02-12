'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { FileText, BarChart3, TrendingUp, Calendar, RefreshCw, Download, FileSpreadsheet, FileType } from 'lucide-react';
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

const REPORT_TYPE_ICONS: Record<string, React.ReactNode> = {
  sales: <BarChart3 className="h-5 w-5" />,
  leads: <TrendingUp className="h-5 w-5" />,
  revenue: <BarChart3 className="h-5 w-5" />,
  overview: <FileText className="h-5 w-5" />,
  custom: <FileText className="h-5 w-5" />,
};

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
      return <p className="text-muted-foreground whitespace-pre-wrap">{String(content)}</p>;
    }

    return (
      <div className="space-y-6">
        {content.summary && (
          <div>
            <p className="text-muted-foreground whitespace-pre-wrap">{content.summary}</p>
          </div>
        )}
        {content.metrics && typeof content.metrics === 'object' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(content.metrics).map(([key, value]) => (
              <Card key={key}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold mt-1">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {content.charts && Array.isArray(content.charts) && content.charts.length > 0 && (
          <div className="space-y-6">
            {content.charts.map((chart: any, i: number) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{chart.title || `Chart ${i + 1}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  {chart.data && (
                    <div className="space-y-2">
                      {chart.data.map((item: any, j: number) => (
                        <div key={j} className="flex justify-between items-center py-2 border-b last:border-0">
                          <span>{item.name}</span>
                          <span className="font-medium">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
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
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            AI-generated reports from your assistant. Ask the AI to create reports like &quot;Generate a sales report for last month&quot;.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Reports</CardTitle>
            <CardDescription>
              {reports.length} report{reports.length !== 1 ? 's' : ''} generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No reports yet</p>
                <p className="text-xs mt-2">Ask the AI assistant to create a report</p>
                <p className="text-xs">e.g. &quot;Generate a sales report for last month&quot;</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedReport?.id === report.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground">
                        {REPORT_TYPE_ICONS[report.reportType] || <FileText className="h-5 w-5" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{report.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {report.reportType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>
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
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <FileType className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('word')}>
                      <FileText className="h-4 w-4 mr-2" />
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
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Calendar className="h-16 w-16 mb-4 opacity-30" />
                <p>Select a report from the list or create one via the AI assistant</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
