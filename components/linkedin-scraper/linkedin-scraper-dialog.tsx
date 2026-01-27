'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, Search, AlertTriangle, CheckCircle2, Users, TrendingUp } from 'lucide-react';

interface LinkedInScraperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function LinkedInScraperDialog({
  open,
  onOpenChange,
  onSuccess,
}: LinkedInScraperDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [limitStatus, setLimitStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Fetch weekly limit on mount
  useEffect(() => {
    if (open) {
      fetchLimitStatus();
      setResult(null); // Reset result when dialog opens
    }
  }, [open]);

  const fetchLimitStatus = async () => {
    try {
      const response = await fetch('/api/linkedin-scraper/limit');
      if (response.ok) {
        const data = await response.json();
        setLimitStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch limit status:', error);
    }
  };

  const handleScrape = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    if (!limitStatus?.allowed) {
      toast.error('Weekly scraping limit reached (50 leads/week)');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/linkedin-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery,
          maxResults,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scraping failed');
      }

      setResult(data);
      toast.success(`Successfully scraped ${data.leadsCreated} LinkedIn profiles!`);
      fetchLimitStatus(); // Refresh limit status

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error(error.message || 'Failed to scrape LinkedIn profiles');
      setResult({
        success: false,
        errors: [error.message],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSearchQuery('');
      setMaxResults(20);
      setResult(null);
      onOpenChange(false);
    }
  };

  const remainingLeads = limitStatus ? limitStatus.limit - limitStatus.used : 50;
  const usagePercent = limitStatus ? (limitStatus.used / limitStatus.limit) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="gradient-text text-2xl">LinkedIn B2B Lead Scraper</DialogTitle>
          <DialogDescription className="text-gray-400">
            Automatically find and import LinkedIn profiles as leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Weekly Limit Status */}
          {limitStatus && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Weekly Usage</span>
                <span className="font-medium text-white">
                  {limitStatus.used} / {limitStatus.limit} leads
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <div className="flex items-center gap-2 text-xs">
                {remainingLeads > 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-gray-400">{remainingLeads} leads remaining this week</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-red-400">Weekly limit reached - resets in {7 - new Date().getDay()} days</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="searchQuery" className="text-white">
              Search Query *
            </Label>
            <Input
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., CEO fintech startup San Francisco"
              disabled={isLoading}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500">
              Use job titles, industries, locations, or company names
            </p>
          </div>

          {/* Max Results */}
          <div className="space-y-2">
            <Label htmlFor="maxResults" className="text-white">
              Max Results
            </Label>
            <Input
              id="maxResults"
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
              min={1}
              max={Math.min(50, remainingLeads)}
              disabled={isLoading}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500">
              Maximum {Math.min(50, remainingLeads)} leads (limited by weekly quota)
            </p>
          </div>

          {/* Result Display */}
          {result && (
            <Alert className={result.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}>
              <AlertDescription className="space-y-2">
                {result.success ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-400">Scraping Complete!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          <strong>{result.leadsCreated}</strong> leads created
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          <strong>{result.leadsScraped}</strong> profiles scraped
                        </span>
                      </div>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2 text-xs text-yellow-400">
                        {result.errors.length} warnings occurred
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-400">Scraping Failed</span>
                    </div>
                    {result.errors && result.errors.map((error: string, index: number) => (
                      <p key={index} className="text-sm text-red-300 mt-1">
                        {error}
                      </p>
                    ))}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <Alert className="bg-blue-500/10 border-blue-500/50">
            <AlertDescription className="text-sm text-blue-300">
              <strong>How it works:</strong> This scraper uses Apify to extract public LinkedIn profile data based on your search query.
              Leads are automatically added to your CRM with available contact information.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-700"
          >
            Close
          </Button>
          <Button
            onClick={handleScrape}
            disabled={isLoading || !limitStatus?.allowed || !searchQuery.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Start Scraping
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
