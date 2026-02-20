'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp, FileText, MapPin, Calculator, Loader2, Trash2,
  DollarSign, Home, ArrowUpDown, Eye, Clock, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface CMAReport {
  id: string;
  address: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  suggestedPrice: number | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  pricePerSqft: number | null;
  comparables: any[];
  adjustments: any;
  createdAt: string;
}

interface CMAResult {
  id: string;
  subject: any;
  comparables: any[];
  suggestedPrice: number;
  priceRange: { low: number; mid: number; high: number };
  pricePerSqft: number;
  confidence: string;
  executiveSummary: string;
  positioningStrategy: string;
  keyStrengths: string[];
  potentialConcerns: string[];
  marketOverview: string;
  pricingRationale: string;
  recommendedActions: string[];
  avgDaysOnMarket: number;
  marketTrend: string;
  sellerTips: string[];
}

export default function CMAToolsPage() {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [sqft, setSqft] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reports, setReports] = useState<CMAReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CMAReport | null>(null);
  const [generatedResult, setGeneratedResult] = useState<CMAResult | null>(null);

  const [addressPredictions, setAddressPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setIsGoogleMapsLoaded(true);
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(mapDiv);
        return;
      }
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          setIsGoogleMapsLoaded(true);
          autocompleteService.current = new google.maps.places.AutocompleteService();
          const mapDiv = document.createElement('div');
          placesService.current = new google.maps.places.PlacesService(mapDiv);
        });
        return;
      }
      const apiKey = 'AIzaSyDBBXN9otEolVDPCQKYCJq8KwM-zH6HgVI';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
        autocompleteService.current = new google.maps.places.AutocompleteService();
        const mapDiv = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(mapDiv);
      };
      document.head.appendChild(script);
    };
    loadGoogleMaps();
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/real-estate/cma');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);
    if (!value || value.length < 3 || !autocompleteService.current || !isGoogleMapsLoaded) {
      setAddressPredictions([]);
      setShowAddressPredictions(false);
      return;
    }
    autocompleteService.current.getPlacePredictions(
      { input: value, types: ['address'] },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setAddressPredictions(predictions);
          setShowAddressPredictions(true);
        } else {
          setAddressPredictions([]);
          setShowAddressPredictions(false);
        }
      }
    );
  }, [isGoogleMapsLoaded]);

  const handleSelectPrediction = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'formatted_address'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let streetNumber = '';
          let route = '';
          let newCity = '';
          let newState = '';
          let newZip = '';
          place.address_components?.forEach((component) => {
            if (component.types.includes('street_number')) streetNumber = component.long_name;
            if (component.types.includes('route')) route = component.long_name;
            if (component.types.includes('locality')) newCity = component.long_name;
            if (component.types.includes('administrative_area_level_1')) newState = component.short_name;
            if (component.types.includes('postal_code')) newZip = component.long_name;
          });
          setAddress(`${streetNumber} ${route}`.trim());
          setCity(newCity);
          setState(newState);
          setZip(newZip);
        }
        setShowAddressPredictions(false);
        setAddressPredictions([]);
      }
    );
  }, []);

  const handleGenerate = async () => {
    if (!address.trim()) {
      toast.error('Please enter a property address');
      return;
    }
    if (!beds || !baths || !sqft) {
      toast.error('Please fill in beds, baths, and square footage');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/real-estate/cma/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          beds: parseInt(beds),
          baths: parseFloat(baths),
          sqft: parseInt(sqft),
          yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const result = await res.json();
      setGeneratedResult(result);
      toast.success('CMA report generated!');
      fetchReports();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate CMA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/real-estate/cma?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        toast.success('Report deleted');
      }
    } catch {
      toast.error('Failed to delete report');
    }
  };

  const fmt = (n: number | null | undefined) =>
    n ? `$${n.toLocaleString()}` : '—';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-500 rounded-xl">
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">CMA Tools</h1>
          <p className="text-muted-foreground">Generate Comparative Market Analysis reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New CMA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Create New CMA
            </CardTitle>
            <CardDescription>Enter property details to generate a market analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                placeholder="Start typing an address..."
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => addressPredictions.length > 0 && setShowAddressPredictions(true)}
                onBlur={() => setTimeout(() => setShowAddressPredictions(false), 200)}
                autoComplete="off"
              />
              {showAddressPredictions && addressPredictions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {addressPredictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                      onMouseDown={() => handleSelectPrediction(prediction)}
                    >
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{prediction.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beds">Bedrooms *</Label>
                <Input id="beds" type="number" placeholder="3" value={beds} onChange={(e) => setBeds(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baths">Bathrooms *</Label>
                <Input id="baths" type="number" placeholder="2" value={baths} onChange={(e) => setBaths(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqft">Square Feet *</Label>
                <Input id="sqft" type="number" placeholder="1500" value={sqft} onChange={(e) => setSqft(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year Built</Label>
                <Input id="year" type="number" placeholder="2000" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="h-4 w-4" /> Generate CMA Report</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent CMA Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent CMA Reports
            </CardTitle>
            <CardDescription>Your generated market analyses</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReports ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No CMA Reports Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Create your first Comparative Market Analysis to help clients understand property values.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium truncate">{report.address}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {report.beds && <span>{report.beds} bed</span>}
                            {report.baths && <span>{report.baths} bath</span>}
                            {report.sqft && <span>{report.sqft.toLocaleString()} sqft</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="secondary" className="font-mono">
                              {fmt(report.suggestedPrice)}
                            </Badge>
                            {report.suggestedPriceMin && report.suggestedPriceMax && (
                              <span className="text-xs text-muted-foreground">
                                Range: {fmt(report.suggestedPriceMin)} – {fmt(report.suggestedPriceMax)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(report.createdAt).toLocaleDateString()} · {(report.comparables as any[])?.length || 0} comps
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(report.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated Result Display */}
      {generatedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              CMA Results — {generatedResult.subject?.address}
            </CardTitle>
            <CardDescription>
              Confidence: <Badge variant={generatedResult.confidence === 'high' ? 'default' : 'secondary'}>{generatedResult.confidence}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-red-500/10 rounded-xl text-center border border-red-500/20">
                <p className="text-sm text-muted-foreground mb-1">Low</p>
                <p className="text-2xl font-bold text-red-400">{fmt(generatedResult.priceRange.low)}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-xl text-center border border-green-500/20">
                <p className="text-sm text-muted-foreground mb-1">Suggested Price</p>
                <p className="text-2xl font-bold text-green-400">{fmt(generatedResult.suggestedPrice)}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmt(generatedResult.pricePerSqft)}/sqft</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-xl text-center border border-blue-500/20">
                <p className="text-sm text-muted-foreground mb-1">High</p>
                <p className="text-2xl font-bold text-blue-400">{fmt(generatedResult.priceRange.high)}</p>
              </div>
            </div>

            {/* Analysis */}
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Executive Summary</h4>
                <p className="text-sm text-muted-foreground">{generatedResult.executiveSummary}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Market Overview</h4>
                <p className="text-sm text-muted-foreground">{generatedResult.marketOverview}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/10">
                  <h4 className="font-semibold mb-2 text-green-500">Key Strengths</h4>
                  <ul className="space-y-1">
                    {generatedResult.keyStrengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/10">
                  <h4 className="font-semibold mb-2 text-orange-500">Potential Concerns</h4>
                  <ul className="space-y-1">
                    {generatedResult.potentialConcerns.map((c, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Recommended Actions</h4>
                <ul className="space-y-1">
                  {generatedResult.recommendedActions.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Comparables Table */}
            {generatedResult.comparables?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Comparable Properties ({generatedResult.comparables.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Address</th>
                        <th className="text-right py-2 px-3 font-medium">Price</th>
                        <th className="text-right py-2 px-3 font-medium">Adj. Price</th>
                        <th className="text-center py-2 px-3 font-medium">Bed/Bath</th>
                        <th className="text-right py-2 px-3 font-medium">Sqft</th>
                        <th className="text-center py-2 px-3 font-medium">DOM</th>
                        <th className="text-center py-2 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedResult.comparables.map((comp: any, i: number) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 px-3">{comp.address}</td>
                          <td className="py-2 px-3 text-right font-mono">{fmt(comp.price)}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">{fmt(comp.adjustedPrice)}</td>
                          <td className="py-2 px-3 text-center">{comp.beds}/{comp.baths}</td>
                          <td className="py-2 px-3 text-right">{comp.sqft?.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">{comp.daysOnMarket}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={comp.status === 'sold' ? 'default' : comp.status === 'pending' ? 'secondary' : 'outline'}>
                              {comp.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button variant="outline" onClick={() => setGeneratedResult(null)}>
              Close Results
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CMA Report — {selectedReport?.address}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Low</p>
                    <p className="font-bold">{fmt(selectedReport.suggestedPriceMin)}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Suggested</p>
                    <p className="font-bold text-lg">{fmt(selectedReport.suggestedPrice)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">High</p>
                    <p className="font-bold">{fmt(selectedReport.suggestedPriceMax)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-muted-foreground">Beds</p>
                    <p className="font-semibold">{selectedReport.beds ?? '—'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-muted-foreground">Baths</p>
                    <p className="font-semibold">{selectedReport.baths ?? '—'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-muted-foreground">Sqft</p>
                    <p className="font-semibold">{selectedReport.sqft?.toLocaleString() ?? '—'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-muted-foreground">$/Sqft</p>
                    <p className="font-semibold">{fmt(selectedReport.pricePerSqft)}</p>
                  </div>
                </div>
                {(selectedReport.comparables as any[])?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Comparables ({(selectedReport.comparables as any[]).length})</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Address</th>
                            <th className="text-right py-2 px-2">Price</th>
                            <th className="text-right py-2 px-2">Adj.</th>
                            <th className="text-center py-2 px-2">B/B</th>
                            <th className="text-right py-2 px-2">Sqft</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedReport.comparables as any[]).map((c: any, i: number) => (
                            <tr key={i} className="border-b border-border/50 text-xs">
                              <td className="py-1.5 px-2">{c.address}</td>
                              <td className="py-1.5 px-2 text-right font-mono">{fmt(c.price)}</td>
                              <td className="py-1.5 px-2 text-right font-mono">{fmt(c.adjustedPrice)}</td>
                              <td className="py-1.5 px-2 text-center">{c.beds}/{c.baths}</td>
                              <td className="py-1.5 px-2 text-right">{c.sqft?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
