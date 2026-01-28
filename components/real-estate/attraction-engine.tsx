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
  Bed,
  Bath,
  Square,
  Clock,
  Heart,
  Briefcase,
  Ruler,
  TreeDeciduous,
  Car,
  Waves,
  Sun,
  School,
  Footprints,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { PlaceAutocomplete, PlaceData } from '@/components/ui/place-autocomplete';
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

const PROPERTY_FEATURES = [
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'garage', label: 'Garage', icon: Car },
  { id: 'backyard', label: 'Large Backyard', icon: TreeDeciduous },
  { id: 'basement', label: 'Finished Basement', icon: Building },
  { id: 'solar', label: 'Solar Panels', icon: Sun },
  { id: 'schools', label: 'Top Schools Nearby', icon: School },
  { id: 'walkable', label: 'Walkable Area', icon: Footprints },
  { id: 'newConstruction', label: 'New Construction', icon: Building },
];

export function AttractionEngine() {
  const [activeTab, setActiveTab] = useState('buyer');
  const [isGenerating, setIsGenerating] = useState(false);
  const [buyerReport, setBuyerReport] = useState<BuyerReport | null>(null);
  const [sellerReport, setSellerReport] = useState<SellerReport | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Location state with Google Places data
  const [region, setRegion] = useState('');
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);

  // Basic filters
  const [priceRange, setPriceRange] = useState('');
  const [propertyType, setPropertyType] = useState('single-family');

  // Advanced Buyer filters
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sqftMin, setSqftMin] = useState('');
  const [sqftMax, setSqftMax] = useState('');
  const [yearBuiltMin, setYearBuiltMin] = useState('');
  const [buyerTimeline, setBuyerTimeline] = useState('3-6months');
  const [buyerMotivation, setBuyerMotivation] = useState('moderate');
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(false);
  const [investorBuyer, setInvestorBuyer] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Advanced Seller filters
  const [yearsOwned, setYearsOwned] = useState('');
  const [homeCondition, setHomeCondition] = useState('good');
  const [sellerTimeline, setSellerTimeline] = useState('flexible');
  const [sellerMotivation, setSellerMotivation] = useState('exploring');
  const [hasEquity, setHasEquity] = useState(true);
  const [recentRenovations, setRecentRenovations] = useState(false);

  const handleLocationChange = (value: string, data?: PlaceData) => {
    setRegion(value);
    if (data) setPlaceData(data);
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

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
        body: JSON.stringify({
          region,
          placeData,
          priceRange,
          propertyType,
          bedrooms,
          bathrooms,
          sqftMin,
          sqftMax,
          yearBuiltMin,
          buyerTimeline,
          buyerMotivation,
          firstTimeBuyer,
          investorBuyer,
          selectedFeatures,
        }),
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
        body: JSON.stringify({
          region,
          placeData,
          priceRange,
          propertyType,
          yearsOwned,
          homeCondition,
          sellerTimeline,
          sellerMotivation,
          hasEquity,
          recentRenovations,
        }),
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Attraction Engine</h2>
          <p className="text-gray-600 dark:text-gray-400">Generate lead magnets to attract buyers and sellers</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
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
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Sparkles className="w-5 h-5" />
                Hidden Buyer Opportunities Report
              </CardTitle>
              <CardDescription>
                Generate a detailed report highlighting overlooked buying opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Location with Google Places */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Target Location
                </Label>
                <PlaceAutocomplete
                  value={region}
                  onChange={handleLocationChange}
                  placeholder="Search city, neighborhood, or area..."
                  types="(cities)"
                />
                {placeData?.city && (
                  <p className="text-xs text-gray-500">
                    📍 {placeData.city}{placeData.state ? `, ${placeData.state}` : ''}{placeData.country ? `, ${placeData.country}` : ''}
                  </p>
                )}
              </div>

              {/* Basic Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Price Range</Label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-200k">Under $200K</SelectItem>
                      <SelectItem value="200k-300k">$200K - $300K</SelectItem>
                      <SelectItem value="300k-500k">$300K - $500K</SelectItem>
                      <SelectItem value="500k-750k">$500K - $750K</SelectItem>
                      <SelectItem value="750k-1m">$750K - $1M</SelectItem>
                      <SelectItem value="1m-2m">$1M - $2M</SelectItem>
                      <SelectItem value="over-2m">Over $2M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-family">Single Family</SelectItem>
                      <SelectItem value="condo">Condo/Apartment</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="multi-family">Multi-Family</SelectItem>
                      <SelectItem value="land">Land/Lot</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Buyer Timeline</Label>
                  <Select value={buyerTimeline} onValueChange={setBuyerTimeline}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP (0-30 days)</SelectItem>
                      <SelectItem value="1-3months">1-3 Months</SelectItem>
                      <SelectItem value="3-6months">3-6 Months</SelectItem>
                      <SelectItem value="6-12months">6-12 Months</SelectItem>
                      <SelectItem value="exploring">Just Exploring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Bed className="w-3 h-3" /> Bedrooms
                  </Label>
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Bath className="w-3 h-3" /> Bathrooms
                  </Label>
                  <Select value={bathrooms} onValueChange={setBathrooms}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Square className="w-3 h-3" /> Min Sq Ft
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1500"
                    value={sqftMin}
                    onChange={(e) => setSqftMin(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Year Built (Min)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2000"
                    value={yearBuiltMin}
                    onChange={(e) => setYearBuiltMin(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Buyer Profile */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Buyer Profile</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={firstTimeBuyer} onCheckedChange={(c) => setFirstTimeBuyer(!!c)} />
                    <span className="text-sm">First-Time Buyer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={investorBuyer} onCheckedChange={(c) => setInvestorBuyer(!!c)} />
                    <span className="text-sm">Investor/Flipper</span>
                  </label>
                </div>
                <div>
                  <Label className="text-sm font-medium">Motivation Level</Label>
                  <Select value={buyerMotivation} onValueChange={setBuyerMotivation}>
                    <SelectTrigger className="mt-1 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Just browsing</SelectItem>
                      <SelectItem value="moderate">Moderate - Casually looking</SelectItem>
                      <SelectItem value="high">High - Ready to buy</SelectItem>
                      <SelectItem value="urgent">Urgent - Must buy ASAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Must-Have Features */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Must-Have Features (select all that apply)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PROPERTY_FEATURES.map((feature) => (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => toggleFeature(feature.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedFeatures.includes(feature.id)
                          ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <feature.icon className="w-4 h-4" />
                      {feature.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateBuyerReport}
                disabled={isGenerating || !region}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-6 text-lg"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Report...</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" /> Generate Buyer Opportunities Report</>
                )}
              </Button>

              {/* Results */}
              {buyerReport && (
                <div className="space-y-6 pt-6 border-t">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{buyerReport.title}</h3>
                  
                  {/* Opportunities */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">🎯 This Week&apos;s Opportunities</h4>
                    {buyerReport.opportunities.map((opp, idx) => (
                      <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getUrgencyColor(opp.urgency)}>{opp.urgency} urgency</Badge>
                              <span className="font-medium text-gray-900 dark:text-white">{opp.type}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{opp.description}</p>
                          </div>
                          {opp.potentialSavings && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                              {opp.potentialSavings}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Market Insight */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 Market Insight</h4>
                    <p className="text-gray-600 dark:text-gray-400">{buyerReport.marketInsight}</p>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">💡 Buyer Tips</h4>
                    <ul className="space-y-1">
                      {buyerReport.buyerTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Social Post */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">📱 Social Media Post</h4>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(buyerReport.socialPost, 'Social post')}>
                        {copied === 'Social post' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea value={buyerReport.socialPost} readOnly className="bg-white dark:bg-gray-900 min-h-[100px]" />
                  </div>

                  {/* Email Teaser */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">✉️ Email/Newsletter Teaser</h4>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(buyerReport.emailTeaser, 'Email teaser')}>
                        {copied === 'Email teaser' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea value={buyerReport.emailTeaser} readOnly className="bg-white dark:bg-gray-900" />
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
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Sparkles className="w-5 h-5" />
                Seller Demand & Equity Report
              </CardTitle>
              <CardDescription>
                Generate a compelling report showing seller opportunities and market demand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Location with Google Places */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Target Location
                </Label>
                <PlaceAutocomplete
                  value={region}
                  onChange={handleLocationChange}
                  placeholder="Search city, neighborhood, or area..."
                  types="(cities)"
                />
                {placeData?.city && (
                  <p className="text-xs text-gray-500">
                    📍 {placeData.city}{placeData.state ? `, ${placeData.state}` : ''}{placeData.country ? `, ${placeData.country}` : ''}
                  </p>
                )}
              </div>

              {/* Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Home Value Range</Label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any value" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-300k">Under $300K</SelectItem>
                      <SelectItem value="300k-500k">$300K - $500K</SelectItem>
                      <SelectItem value="500k-750k">$500K - $750K</SelectItem>
                      <SelectItem value="750k-1m">$750K - $1M</SelectItem>
                      <SelectItem value="1m-2m">$1M - $2M</SelectItem>
                      <SelectItem value="over-2m">Over $2M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-family">Single Family</SelectItem>
                      <SelectItem value="condo">Condo/Apartment</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="multi-family">Multi-Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Seller Timeline</Label>
                  <Select value={sellerTimeline} onValueChange={setSellerTimeline}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP - Need to sell fast</SelectItem>
                      <SelectItem value="1-3months">1-3 Months</SelectItem>
                      <SelectItem value="3-6months">3-6 Months</SelectItem>
                      <SelectItem value="flexible">Flexible timing</SelectItem>
                      <SelectItem value="exploring">Just exploring options</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seller Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Years Owned
                  </Label>
                  <Select value={yearsOwned} onValueChange={setYearsOwned}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-2">0-2 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-10">5-10 years</SelectItem>
                      <SelectItem value="10-20">10-20 years</SelectItem>
                      <SelectItem value="20+">20+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Home Condition</Label>
                  <Select value={homeCondition} onValueChange={setHomeCondition}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent - Move-in ready</SelectItem>
                      <SelectItem value="good">Good - Minor updates needed</SelectItem>
                      <SelectItem value="fair">Fair - Needs some work</SelectItem>
                      <SelectItem value="poor">Needs major renovation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Motivation Level</Label>
                  <Select value={sellerMotivation} onValueChange={setSellerMotivation}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exploring">Exploring - Curious about value</SelectItem>
                      <SelectItem value="considering">Considering - Thinking about it</SelectItem>
                      <SelectItem value="ready">Ready - Want to list soon</SelectItem>
                      <SelectItem value="motivated">Highly Motivated - Must sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seller Situation */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Seller Situation</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={hasEquity} onCheckedChange={(c) => setHasEquity(!!c)} />
                    <span className="text-sm">Has significant equity</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={recentRenovations} onCheckedChange={(c) => setRecentRenovations(!!c)} />
                    <span className="text-sm">Recent renovations/upgrades</span>
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateSellerReport}
                disabled={isGenerating || !region}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6 text-lg"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Report...</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" /> Generate Seller Demand Report</>
                )}
              </Button>

              {/* Results */}
              {sellerReport && (
                <div className="space-y-6 pt-6 border-t">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{sellerReport.title}</h3>
                  
                  {/* Demand Indicators */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">📈 Market Demand Indicators</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sellerReport.demandIndicators.map((ind, idx) => (
                        <div key={idx} className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{ind.indicator}</span>
                            {getTrendIcon(ind.trend)}
                          </div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{ind.value}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{ind.insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equity Estimate */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-green-800 dark:text-green-400">Equity Opportunity</h4>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{sellerReport.equityEstimate}</p>
                  </div>

                  {/* Timing Advice */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-violet-600" />
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">Timing Advice</h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{sellerReport.timingAdvice}</p>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">💡 Seller Tips</h4>
                    <ul className="space-y-1">
                      {sellerReport.sellerTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Social Post */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">📱 Social Media Post</h4>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(sellerReport.socialPost, 'Social post')}>
                        {copied === 'Social post' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea value={sellerReport.socialPost} readOnly className="bg-white dark:bg-gray-900 min-h-[100px]" />
                  </div>

                  {/* Email Teaser */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">✉️ Email/Newsletter Teaser</h4>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(sellerReport.emailTeaser, 'Email teaser')}>
                        {copied === 'Email teaser' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea value={sellerReport.emailTeaser} readOnly className="bg-white dark:bg-gray-900" />
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
