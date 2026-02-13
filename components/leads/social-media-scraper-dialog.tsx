'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Instagram, Facebook, Music, Sparkles, AlertCircle, CheckCircle2, Users, Hash, MapPin, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface SocialMediaScraperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ScrapingTemplate {
  id: string;
  name: string;
  description: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK';
  scraperType: string;
  defaultParams: Record<string, any>;
  icon: any;
}

const SCRAPING_TEMPLATES: ScrapingTemplate[] = [
  {
    id: 'instagram-followers',
    name: 'Instagram Followers',
    description: 'Scrape followers from competitor accounts',
    platform: 'INSTAGRAM',
    scraperType: 'apify/instagram-profile-scraper',
    defaultParams: { resultsLimit: 100, searchType: 'user' },
    icon: Instagram,
  },
  {
    id: 'instagram-hashtag',
    name: 'Instagram Hashtag',
    description: 'Get users posting with specific hashtags',
    platform: 'INSTAGRAM',
    scraperType: 'apify/instagram-hashtag-scraper',
    defaultParams: { resultsLimit: 100 },
    icon: Hash,
  },
  {
    id: 'instagram-location',
    name: 'Instagram Location',
    description: 'Users posting from specific locations',
    platform: 'INSTAGRAM',
    scraperType: 'apify/instagram-profile-scraper',
    defaultParams: { resultsLimit: 100, searchType: 'location' },
    icon: MapPin,
  },
  {
    id: 'facebook-group',
    name: 'Facebook Groups',
    description: 'Members from relevant Facebook groups',
    platform: 'FACEBOOK',
    scraperType: 'apify/facebook-groups-scraper',
    defaultParams: { resultsLimit: 100 },
    icon: Users,
  },
  {
    id: 'facebook-page',
    name: 'Facebook Page Fans',
    description: 'Followers of competitor pages',
    platform: 'FACEBOOK',
    scraperType: 'apify/facebook-pages-scraper',
    defaultParams: { resultsLimit: 100 },
    icon: Facebook,
  },
  {
    id: 'tiktok-hashtag',
    name: 'TikTok Hashtag',
    description: 'Users creating content with specific hashtags',
    platform: 'TIKTOK',
    scraperType: 'apify/tiktok-hashtag-scraper',
    defaultParams: { resultsLimit: 100 },
    icon: Music,
  },
  {
    id: 'tiktok-profile',
    name: 'TikTok Followers',
    description: 'Followers of competitor creators',
    platform: 'TIKTOK',
    scraperType: 'apify/tiktok-scraper',
    defaultParams: { resultsLimit: 100 },
    icon: TrendingUp,
  },
];

export default function SocialMediaScraperDialog({ open, onOpenChange, onSuccess }: SocialMediaScraperDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK'>('INSTAGRAM');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxResults, setMaxResults] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapingResults, setScrapingResults] = useState<any>(null);

  const filteredTemplates = SCRAPING_TEMPLATES.filter(t => t.platform === selectedPlatform);
  const currentTemplate = SCRAPING_TEMPLATES.find(t => t.id === selectedTemplate);

  const handleScrape = async () => {
    if (!selectedTemplate || !searchQuery) {
      toast.error('Please select a template and enter a search query');
      return;
    }

    setIsLoading(true);
    setScrapingResults(null);

    try {
      const response = await fetch('/api/social-media/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          scraperType: currentTemplate?.scraperType,
          searchQuery,
          maxResults,
          templateId: selectedTemplate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Scraping failed');
      }

      const data = await response.json();
      setScrapingResults(data);
      
      toast.success(
        `Successfully scraped ${data.leadsCreated || 0} leads from ${selectedPlatform}`,
        { duration: 5000 }
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error(error.message || 'Failed to scrape social media');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setMaxResults(100);
    setScrapingResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Social Media Soshogle Lead Finder
          </DialogTitle>
          <DialogDescription>
            Extract B2C leads from Instagram, Facebook, and TikTok using Soshogle AI Lead Finder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Selection */}
          <div>
            <Label className="mb-3 block">Select Platform</Label>
            <Tabs value={selectedPlatform} onValueChange={(v: any) => {
              setSelectedPlatform(v);
              setSelectedTemplate('');
              handleReset();
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="INSTAGRAM" className="gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="FACEBOOK" className="gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </TabsTrigger>
                <TabsTrigger value="TIKTOK" className="gap-2">
                  <Music className="h-4 w-4" />
                  TikTok
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Template Selection */}
          <div>
            <Label className="mb-3 block">Choose Soshogle Lead Finder Template</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-purple-500 ${
                      selectedTemplate === template.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Search Configuration */}
          {selectedTemplate && (
            <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
              <div>
                <Label htmlFor="searchQuery">Search Query</Label>
                <Input
                  id="searchQuery"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    selectedTemplate.includes('hashtag')
                      ? 'Enter hashtag (e.g., #fitness)'
                      : selectedTemplate.includes('location')
                      ? 'Enter location (e.g., New York)'
                      : 'Enter username or page name'
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="maxResults">Maximum Results</Label>
                <Select
                  value={maxResults.toString()}
                  onValueChange={(v) => setMaxResults(parseInt(v))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 leads</SelectItem>
                    <SelectItem value="100">100 leads</SelectItem>
                    <SelectItem value="250">250 leads</SelectItem>
                    <SelectItem value="500">500 leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentTemplate && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-sm text-blue-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Using: {currentTemplate.scraperType}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This will extract profile data including names, bios, follower counts, and engagement metrics
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          {scrapingResults && (
            <Card className="border-green-500/20 bg-green-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Scraping Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Profiles Scraped:</span>
                  <span className="font-semibold">{scrapingResults.profilesScraped || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Leads Created:</span>
                  <span className="font-semibold text-green-400">
                    {scrapingResults.leadsCreated || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duplicates Skipped:</span>
                  <span className="font-semibold">{scrapingResults.duplicatesSkipped || 0}</span>
                </div>
                {scrapingResults.runId && (
                  <div className="mt-3 pt-3 border-t border-green-500/20">
                    <span className="text-xs text-gray-500">Run ID: {scrapingResults.runId}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Close
            </Button>
            <div className="flex gap-2">
              {scrapingResults && (
                <Button variant="outline" onClick={handleReset} disabled={isLoading}>
                  Start New Scrape
                </Button>
              )}
              <Button
                onClick={handleScrape}
                disabled={!selectedTemplate || !searchQuery || isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>Start Scraping</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
