'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Home, DollarSign, Share2, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MarketReport {
  id: string;
  type: string;
  title: string;
  region: string;
  periodStart: string;
  periodEnd: string;
  executiveSummary?: string | null;
  keyHighlights?: unknown;
  buyerInsights?: string | null;
  sellerInsights?: string | null;
  predictions?: unknown;
  socialCaption?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
}

export default function MarketInsightsPage() {
  const [marketReports, setMarketReports] = useState<MarketReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json())
      .then((d) => {
        const sites = d?.websites ?? [];
        if (sites.length > 0) setWebsiteId(sites[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/real-estate/market-reports?limit=50')
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d) => setMarketReports(d.reports ?? []))
      .catch(() => setMarketReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  const publishToSecretProperties = async (report: MarketReport) => {
    if (!websiteId) {
      toast.error('No website found. Create a website first.');
      return;
    }
    setPublishingId(report.id);
    try {
      const content = {
        executiveSummary: report.executiveSummary,
        keyHighlights: report.keyHighlights,
        buyerInsights: report.buyerInsights,
        sellerInsights: report.sellerInsights,
        predictions: report.predictions,
      };
      const res = await fetch(`/api/websites/${websiteId}/secret-reports/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'MARKET_INSIGHT',
          title: report.title,
          region: report.region,
          content,
          executiveSummary: report.executiveSummary || null,
          pdfUrl: report.pdfUrl || null,
          sourceReportId: report.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to publish');
      }
      toast.success('Report published to Secret Properties page!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to publish');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-500 rounded-xl">
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Market Insights</h1>
          <p className="text-muted-foreground">Real-time market data and trends</p>
        </div>
      </div>

      {/* Market Reports - Publish to Secret Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Market Reports
          </CardTitle>
          <CardDescription>
            AI-generated market reports. Publish any report to your Secret Properties page to capture leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : marketReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No market reports yet.</p>
              <p className="text-sm mt-1">Create reports via the AI assistant or Market Report generator.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {marketReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{report.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.region} • {report.type} • {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => publishToSecretProperties(report)}
                    disabled={!websiteId || publishingId === report.id}
                    className="ml-4 shrink-0"
                  >
                    {publishingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Publish to Secret Properties
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Median Home Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$425,000</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              +5.2% YoY
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Days on Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingDown className="h-4 w-4 mr-1" />
              -3 days
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <div className="flex items-center text-red-500 text-sm">
              <TrendingDown className="h-4 w-4 mr-1" />
              -8.3% MoM
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <div className="flex items-center text-green-500 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12.1% MoM
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Market Trends</CardTitle>
          <CardDescription>Historical and projected market data for your area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Market Charts Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Interactive charts showing price trends, inventory levels, and market predictions 
              will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
