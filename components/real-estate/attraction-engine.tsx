'use client';

import { useState } from 'react';
import {
  Users,
  Home,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Copy,
  Download,
  RefreshCw,
  MapPin,
  DollarSign,
  Calendar,
  Target,
  FileText,
  Share2,
  CheckCircle2,
  Loader2,
  Building,
  BarChart3,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface BuyerReport {
  title: string;
  opportunities: Array<{
    type: string;
    description: string;
    potentialSavings?: string;
    urgency: 'high' | 'medium' | 'low';
  }>;
  marketInsight: string;
  buyerTips: string[];
  socialPost: string;
  emailTeaser: string;
  callToAction: string;
}

interface SellerReport {
  title: string;
  demandIndicators: Array<{
    indicator: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    insight: string;
  }>;
  equityEstimate: string;
  timingAdvice: string;
  sellerTips: string[];
  socialPost: string;
  emailTeaser: string;
  callToAction: string;
}

export function AttractionEngine() {
  const [activeTab, setActiveTab] = useState('buyer');
  const [isGenerating, setIsGenerating] = useState(false);
  const [buyerReport, setBuyerReport] = useState<BuyerReport | null>(null);
  const [sellerReport, setSellerReport] = useState<SellerReport | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [region, setRegion] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [propertyType, setPropertyType] = useState('single-family');

  const generateBuyerReport = async () => {
    if (!region) {
      toast.error('Please enter a region/neighborhood');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/real-estate/attraction/buyer-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, priceRange, propertyType }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      const data = await response.json();
      setBuyerReport(data.report);
      toast.success('Buyer Opportunities Report generated!');
    } catch (error) {
      console.error('Error generating buyer report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSellerReport = async () => {
    if (!region) {
      toast.error('Please enter a region/neighborhood');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/real-estate/attraction/seller-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, priceRange, propertyType }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      const data = await response.json();
      setSellerReport(data.report);
      toast.success('Seller Demand Report generated!');
    } catch (error) {
      console.error('Error generating seller report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Attraction Engine</h2>
          <p className="text-gray-600">Generate lead magnets to attract buyers and sellers</p>
        </div>
      </div>

      {/* Region Input */}
      <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="region" className="text-sm font-medium">Target Region/Neighborhood</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="region"
                  placeholder="e.g., Plateau Mont-Royal, Montreal"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="priceRange" className="text-sm font-medium">Price Range</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-300k">Under $300K</SelectItem>
                  <SelectItem value="300k-500k">$300K - $500K</SelectItem>
                  <SelectItem value="500k-750k">$500K - $750K</SelectItem>
                  <SelectItem value="750k-1m">$750K - $1M</SelectItem>
                  <SelectItem value="over-1m">Over $1M</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="propertyType" className="text-sm font-medium">Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-family">Single Family</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="multi-family">Multi-Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="buyer" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Buyer Attraction
          </TabsTrigger>
          <TabsTrigger value="seller" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <Home className="w-4 h-4 mr-2" />
            Seller Attraction
          </TabsTrigger>
        </TabsList>

        {/* Buyer Attraction Tab */}
        <TabsContent value="buyer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Hidden Buyer Opportunities Report
              </CardTitle>
              <CardDescription>
                AI-generated report highlighting overlooked buying opportunities to share with prospects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={generateBuyerReport}
                disabled={isGenerating || !region}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Generate Buyer Report</>
                )}
              </Button>

              {buyerReport && (
                <div className="space-y-6 pt-4 border-t">
                  <h3 className="text-xl font-bold text-gray-900">{buyerReport.title}</h3>
                  
                  {/* Opportunities */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">🎯 This Week&apos;s Opportunities</h4>
                    {buyerReport.opportunities.map((opp, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className={getUrgencyColor(opp.urgency)}>{opp.urgency} urgency</Badge>
                            <p className="font-medium mt-1">{opp.type}</p>
                            <p className="text-sm text-gray-600">{opp.description}</p>
                          </div>
                          {opp.potentialSavings && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {opp.potentialSavings}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Market Insight */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">📊 Market Insight</h4>
                    <p className="text-gray-600">{buyerReport.marketInsight}</p>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">💡 Buyer Tips</h4>
                    <ul className="space-y-1">
                      {buyerReport.buyerTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Social Post */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700">📱 Social Media Post</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(buyerReport.socialPost, 'Social post')}
                      >
                        {copied === 'Social post' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={buyerReport.socialPost}
                      readOnly
                      className="bg-white min-h-[100px]"
                    />
                  </div>

                  {/* Email Teaser */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700">✉️ Email/Newsletter Teaser</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(buyerReport.emailTeaser, 'Email teaser')}
                      >
                        {copied === 'Email teaser' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={buyerReport.emailTeaser}
                      readOnly
                      className="bg-white"
                    />
                  </div>

                  {/* CTA */}
                  <div className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg text-white">
                    <p className="font-semibold">Call to Action:</p>
                    <p>{buyerReport.callToAction}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seller Attraction Tab */}
        <TabsContent value="seller" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Seller Demand & Equity Report
              </CardTitle>
              <CardDescription>
                AI-generated report showing seller opportunities and market demand to attract listings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={generateSellerReport}
                disabled={isGenerating || !region}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Generate Seller Report</>
                )}
              </Button>

              {sellerReport && (
                <div className="space-y-6 pt-4 border-t">
                  <h3 className="text-xl font-bold text-gray-900">{sellerReport.title}</h3>
                  
                  {/* Demand Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">📈 Market Demand Indicators</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sellerReport.demandIndicators.map((ind, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">{ind.indicator}</span>
                            {getTrendIcon(ind.trend)}
                          </div>
                          <p className="text-xl font-bold text-gray-900">{ind.value}</p>
                          <p className="text-xs text-gray-500">{ind.insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equity Estimate */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Equity Opportunity</h4>
                    </div>
                    <p className="text-gray-700">{sellerReport.equityEstimate}</p>
                  </div>

                  {/* Timing Advice */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-violet-600" />
                      <h4 className="font-semibold text-gray-700">Timing Advice</h4>
                    </div>
                    <p className="text-gray-600">{sellerReport.timingAdvice}</p>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">💡 Seller Tips</h4>
                    <ul className="space-y-1">
                      {sellerReport.sellerTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Social Post */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700">📱 Social Media Post</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(sellerReport.socialPost, 'Social post')}
                      >
                        {copied === 'Social post' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={sellerReport.socialPost}
                      readOnly
                      className="bg-white min-h-[100px]"
                    />
                  </div>

                  {/* Email Teaser */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700">✉️ Email/Newsletter Teaser</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(sellerReport.emailTeaser, 'Email teaser')}
                      >
                        {copied === 'Email teaser' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={sellerReport.emailTeaser}
                      readOnly
                      className="bg-white"
                    />
                  </div>

                  {/* CTA */}
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white">
                    <p className="font-semibold">Call to Action:</p>
                    <p>{sellerReport.callToAction}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
