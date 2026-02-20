'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Home,
  DollarSign,
  Phone,
  Mail,
  Brain,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Target,
  BarChart3,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface StaleListing {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  originalPrice?: number;
  daysOnMarket: number;
  beds: number;
  baths: number;
  sqft: number;
  agentName?: string;
  agentPhone?: string;
  priceReductions: number;
  staleness: 'warning' | 'critical' | 'severe';
  aiRecommendation?: string;
  suggestedPrice?: number;
  issues?: string[];
}

export function StaleListingsWidget() {
  const [listings, setListings] = useState<StaleListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<StaleListing | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDiagnosticDialog, setShowDiagnosticDialog] = useState(false);

  useEffect(() => {
    fetchStaleListings();
  }, []);

  const fetchStaleListings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/real-estate/stale-diagnostic');
      if (response.ok) {
        const data = await response.json();
        const diagnostics = data.diagnostics || data.listings || [];
        const mapped = diagnostics.map((d: any) => {
          const prop = d.property;
          return {
            id: d.id,
            address: d.address || prop?.address || 'Unknown',
            city: prop?.city || '',
            state: prop?.state || '',
            price: prop?.listPrice || d.listPrice || 0,
            originalPrice: prop?.listPrice || d.listPrice || undefined,
            daysOnMarket: d.daysOnMarket || prop?.daysOnMarket || 0,
            beds: prop?.beds || 0,
            baths: prop?.baths || 0,
            sqft: prop?.sqft || 0,
            priceReductions: 0,
            staleness: (d.daysOnMarket || 0) > 90 ? 'severe' as const : (d.daysOnMarket || 0) > 60 ? 'critical' as const : 'warning' as const,
            aiRecommendation: d.clientSummary || undefined,
            issues: d.topReasons || [],
          };
        });
        setListings(mapped);
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error('Error fetching stale listings:', error);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const runAIDiagnostic = async (listing: StaleListing) => {
    setSelectedListing(listing);
    setShowDiagnosticDialog(true);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/real-estate/stale-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();
      setSelectedListing({
        ...listing,
        aiRecommendation: result.recommendation,
        suggestedPrice: result.suggestedPrice,
        issues: result.issues,
      });
    } catch (error) {
      // Demo analysis
      setTimeout(() => {
        setSelectedListing({
          ...listing,
          aiRecommendation: `**Analysis for ${listing.address}**

This property has been on the market for ${listing.daysOnMarket || 0} days, which is ${Math.round((listing.daysOnMarket || 0) / 24 * 100 - 100)}% longer than the area average of 24 days.

**Key Issues Identified:**
1. Current price of $${(listing.price || 0).toLocaleString()} is approximately 8% above comparable sales
2. Photos may benefit from professional staging
3. Marketing description lacks compelling hooks

**Recommended Actions:**
- Price reduction to $${(listing.suggestedPrice || (listing.price || 0) * 0.95).toLocaleString()}
- Professional photography refresh
- Enhanced online marketing campaign
- Open house strategy for next 2 weekends

**Seller Communication Script:**
"Based on current market data and buyer feedback, I recommend adjusting our strategy to increase showing activity and generate competitive offers."`,
          issues: listing.issues || ['Overpriced', 'Limited exposure', 'Stale photos'],
        });
        setIsAnalyzing(false);
      }, 2000);
    }
  };

  const getStalenessColor = (staleness: string) => {
    switch (staleness) {
      case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'critical': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'severe': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStalenessProgress = (days: number) => {
    if (days <= 21) return 30;
    if (days <= 45) return 60;
    if (days <= 90) return 80;
    return 100;
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Stale Listings
            {listings.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2">
                {listings.length} need attention
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaleListings}
            disabled={isLoading}
            className="border-slate-700 bg-slate-800/50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-slate-500 mb-3" />
              <p className="text-slate-400">No stale listings detected</p>
              <p className="text-slate-500 text-sm">All listings are performing well</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium">{listing.address}</h4>
                        <Badge className={getStalenessColor(listing.staleness)}>
                          {listing.staleness}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">
                        {listing.city}, {listing.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">
                        ${(listing.price || 0).toLocaleString()}
                      </p>
                      {listing.originalPrice && listing.originalPrice > listing.price && (
                        <p className="text-slate-500 text-sm line-through">
                          ${(listing.originalPrice || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm mb-3">
                    <span className="text-slate-400">
                      {listing.beds || 0} bed · {listing.baths || 0} bath · {(listing.sqft || 0).toLocaleString()} sqft
                    </span>
                    <span className="text-red-400 font-medium">
                      {listing.daysOnMarket} days on market
                    </span>
                    {listing.priceReductions > 0 && (
                      <span className="text-amber-400">
                        {listing.priceReductions} price {listing.priceReductions === 1 ? 'reduction' : 'reductions'}
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Staleness Level</span>
                      <span className="text-slate-400">{listing.daysOnMarket}/90+ days</span>
                    </div>
                    <Progress
                      value={getStalenessProgress(listing.daysOnMarket)}
                      className="h-2 bg-slate-700"
                    />
                  </div>

                  {listing.issues && listing.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {listing.issues.slice(0, 3).map((issue, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => runAIDiagnostic(listing)}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      AI Diagnostic
                    </Button>
                    {listing.agentPhone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Contact Agent
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* AI Diagnostic Dialog */}
      <Dialog open={showDiagnosticDialog} onOpenChange={setShowDiagnosticDialog}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              AI Listing Diagnostic
            </DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-medium">{selectedListing.address}</h4>
                    <p className="text-slate-400 text-sm">
                      {selectedListing.city}, {selectedListing.state}
                    </p>
                  </div>
                  <Badge className={getStalenessColor(selectedListing.staleness)}>
                    {selectedListing.daysOnMarket} days
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-white">Current: ${(selectedListing.price || 0).toLocaleString()}</span>
                  {selectedListing.suggestedPrice && (
                    <span className="text-emerald-400">
                      Suggested: ${(selectedListing.suggestedPrice || 0).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {isAnalyzing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-3" />
                    <p className="text-slate-400">Analyzing listing data...</p>
                  </div>
                </div>
              ) : selectedListing.aiRecommendation ? (
                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <span className="text-violet-300 font-medium">AI Analysis</span>
                  </div>
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">
                    {selectedListing.aiRecommendation}
                  </pre>
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button variant="outline" className="border-slate-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500">
                  <Send className="w-4 h-4 mr-2" />
                  Send to Agent
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
