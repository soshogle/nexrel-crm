'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  Home,
  DollarSign,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  BarChart,
  FileText,
  Download,
  Send,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Plus,
  X,
  Check,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Loader2,
  Building,
  Car,
  TreePine,
  Waves,
  Star,
  Info,
  Edit,
  Calculator,
  ListChecks,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  lotSize: number;
  garage: number;
  pool: boolean;
  condition: string;
  features: string[];
}

interface ComparableProperty {
  id: string;
  address: string;
  distance: number;
  salePrice: number;
  saleDate: string;
  daysOnMarket: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  pricePerSqft: number;
  adjustedPrice: number;
  adjustments: {
    category: string;
    amount: number;
    reason: string;
  }[];
  similarity: number;
  source: string;
}

interface CMAResult {
  suggestedListPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  confidence: number;
  comparables: ComparableProperty[];
  marketAnalysis: string;
  recommendations: string[];
  aiInsights: string;
}

export function CMAPanel() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [propertyData, setPropertyData] = useState<PropertyData>({
    address: '',
    city: '',
    state: '',
    zip: '',
    propertyType: 'single_family',
    beds: 3,
    baths: 2,
    sqft: 1800,
    yearBuilt: 2000,
    lotSize: 0.25,
    garage: 2,
    pool: false,
    condition: 'good',
    features: [],
  });
  const [cmaResult, setCMAResult] = useState<CMAResult | null>(null);
  const [editingComp, setEditingComp] = useState<string | null>(null);
  const [showNetSheet, setShowNetSheet] = useState(false);
  
  // Google Places autocomplete state
  const [addressPredictions, setAddressPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Load Google Maps script
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

  // Handle address input change
  const handleAddressChange = useCallback((value: string) => {
    setPropertyData(prev => ({ ...prev, address: value }));
    
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

  // Handle prediction selection
  const handleSelectPrediction = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'formatted_address'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let zip = '';

          place.address_components?.forEach((component) => {
            if (component.types.includes('street_number')) streetNumber = component.long_name;
            if (component.types.includes('route')) route = component.long_name;
            if (component.types.includes('locality')) city = component.long_name;
            if (component.types.includes('administrative_area_level_1')) state = component.short_name;
            if (component.types.includes('postal_code')) zip = component.long_name;
          });

          setPropertyData(prev => ({
            ...prev,
            address: `${streetNumber} ${route}`.trim(),
            city,
            state,
            zip,
          }));
        }
        setShowAddressPredictions(false);
        setAddressPredictions([]);
      }
    );
  }, []);

  const propertyFeatures = [
    'Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Updated Kitchen',
    'Updated Bathrooms', 'Finished Basement', 'Central AC', 'Fireplace',
    'Smart Home', 'Solar Panels', 'New Roof', 'New HVAC',
  ];

  const handleAnalyze = async () => {
    if (!propertyData.address) {
      toast.error('Please enter a property address');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/real-estate/cma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectProperty: {
            address: `${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zip}`,
            propertyType: propertyData.propertyType,
            beds: propertyData.beds,
            baths: propertyData.baths,
            sqft: propertyData.sqft,
            yearBuilt: propertyData.yearBuilt,
            lotSize: propertyData.lotSize * 43560, // Convert acres to sqft
            condition: propertyData.condition,
            features: propertyData.features,
          },
          searchRadius: 2,
          maxComps: 6,
          lookbackMonths: 6,
        }),
      });

      if (!response.ok) {
        throw new Error('CMA generation failed');
      }

      const result = await response.json();
      
      // API returns { success: true, cma: {...} }
      const cma = result.cma || result;
      
      // Transform API response to component format
      setCMAResult({
        suggestedListPrice: cma.suggestedPrice?.suggested || cma.suggestedListPrice || 485000,
        priceRangeLow: cma.suggestedPrice?.low || cma.priceRange?.low || 465000,
        priceRangeHigh: cma.suggestedPrice?.high || cma.priceRange?.high || 505000,
        confidence: cma.confidenceScore || cma.confidence || 85,
        comparables: (cma.comparables || []).map((comp: any, i: number) => ({
          id: comp.id || `comp-${i}`,
          address: comp.address,
          distance: comp.distance || 0.5,
          salePrice: comp.price || comp.salePrice,
          saleDate: comp.saleDate || comp.closedDate || new Date().toISOString(),
          daysOnMarket: comp.daysOnMarket || 15,
          beds: comp.bedrooms || comp.beds,
          baths: comp.bathrooms || comp.baths,
          sqft: comp.squareFeet || comp.sqft,
          yearBuilt: comp.yearBuilt,
          pricePerSqft: comp.pricePerSqft || (comp.price && comp.squareFeet ? Math.round(comp.price / comp.squareFeet) : 0),
          adjustedPrice: comp.adjustedPrice,
          adjustments: comp.adjustments || [],
          similarity: comp.similarity || 90,
          source: comp.source || 'MLS',
        })),
        marketAnalysis: cma.aiAnalysis || cma.executiveSummary || '',
        recommendations: cma.recommendations || cma.keyStrengths || [],
        aiInsights: cma.aiAnalysis || cma.executiveSummary || 'No AI insights available',
      });
      
      setShowResults(true);
      toast.success('CMA analysis complete!');
    } catch (error) {
      console.error('CMA analysis error:', error);
      toast.error('CMA analysis requires MLS data integration. Please configure your MLS connection in settings.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleFeature = (feature: string) => {
    setPropertyData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!showResults ? (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Input Form */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-6 h-6 text-violet-400" />
                  AI-Powered CMA Generator
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Generate comprehensive market analysis with AI insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                          step >= s
                            ? 'bg-gradient-to-br from-violet-500 to-purple-500 text-white'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {step > s ? <Check className="w-5 h-5" /> : s}
                      </div>
                      {s < 3 && (
                        <div
                          className={`w-24 md:w-32 h-1 mx-2 rounded ${
                            step > s ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-slate-800'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step 1: Address */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-white">Property Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 relative">
                        <Label className="text-slate-300">Street Address</Label>
                        <Input
                          ref={addressInputRef}
                          placeholder="Start typing an address..."
                          value={propertyData.address}
                          onChange={(e) => handleAddressChange(e.target.value)}
                          onFocus={() => addressPredictions.length > 0 && setShowAddressPredictions(true)}
                          onBlur={() => setTimeout(() => setShowAddressPredictions(false), 200)}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white"
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
                      <div>
                        <Label className="text-slate-300">City</Label>
                        <Input
                          placeholder="City"
                          value={propertyData.city}
                          onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-300">State</Label>
                          <Input
                            placeholder="CA"
                            value={propertyData.state}
                            onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
                            className="mt-1 bg-slate-800/50 border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-300">ZIP</Label>
                          <Input
                            placeholder="90210"
                            value={propertyData.zip}
                            onChange={(e) => setPropertyData({ ...propertyData, zip: e.target.value })}
                            className="mt-1 bg-slate-800/50 border-slate-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setStep(2)}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Property Details */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-white">Property Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-slate-300">Property Type</Label>
                        <Select
                          value={propertyData.propertyType}
                          onValueChange={(v) => setPropertyData({ ...propertyData, propertyType: v })}
                        >
                          <SelectTrigger className="mt-1 bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single_family">Single Family</SelectItem>
                            <SelectItem value="condo">Condo/Townhouse</SelectItem>
                            <SelectItem value="multi_family">Multi-Family</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Bedrooms</Label>
                        <Select
                          value={propertyData.beds.toString()}
                          onValueChange={(v) => setPropertyData({ ...propertyData, beds: parseInt(v) })}
                        >
                          <SelectTrigger className="mt-1 bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Bathrooms</Label>
                        <Select
                          value={propertyData.baths.toString()}
                          onValueChange={(v) => setPropertyData({ ...propertyData, baths: parseFloat(v) })}
                        >
                          <SelectTrigger className="mt-1 bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((n) => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Year Built</Label>
                        <Input
                          type="number"
                          placeholder="2000"
                          value={propertyData.yearBuilt}
                          onChange={(e) => setPropertyData({ ...propertyData, yearBuilt: parseInt(e.target.value) || 2000 })}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-slate-300">Square Feet</Label>
                        <Input
                          type="number"
                          placeholder="1800"
                          value={propertyData.sqft}
                          onChange={(e) => setPropertyData({ ...propertyData, sqft: parseInt(e.target.value) || 0 })}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Lot Size (acres)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.25"
                          value={propertyData.lotSize}
                          onChange={(e) => setPropertyData({ ...propertyData, lotSize: parseFloat(e.target.value) || 0 })}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Garage Spaces</Label>
                        <Select
                          value={propertyData.garage.toString()}
                          onValueChange={(v) => setPropertyData({ ...propertyData, garage: parseInt(v) })}
                        >
                          <SelectTrigger className="mt-1 bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4].map((n) => (
                              <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300">Condition</Label>
                        <Select
                          value={propertyData.condition}
                          onValueChange={(v) => setPropertyData({ ...propertyData, condition: v })}
                        >
                          <SelectTrigger className="mt-1 bg-slate-800/50 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={propertyData.pool}
                        onCheckedChange={(v) => setPropertyData({ ...propertyData, pool: v })}
                      />
                      <Label className="text-slate-300">Has Pool</Label>
                    </div>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="border-slate-700"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep(3)}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Features & Analyze */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-white">Features & Upgrades</h3>
                    <div className="flex flex-wrap gap-2">
                      {propertyFeatures.map((feature) => (
                        <Button
                          key={feature}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFeature(feature)}
                          className={`transition-all ${
                            propertyData.features.includes(feature)
                              ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {propertyData.features.includes(feature) && (
                            <Check className="w-3 h-3 mr-1" />
                          )}
                          {feature}
                        </Button>
                      ))}
                    </div>

                    {/* Analysis Options */}
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-4">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        AI Analysis Options
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <Label className="text-slate-300 text-sm">Include market trends</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <Label className="text-slate-300 text-sm">Generate recommendations</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <Label className="text-slate-300 text-sm">Pricing strategy analysis</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setStep(2)}
                        className="border-slate-700"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 min-w-[200px]"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Generate CMA
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">CMA Results</h2>
                <p className="text-slate-400">{propertyData.address}, {propertyData.city}, {propertyData.state}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowResults(false); setStep(1); }}
                  className="border-slate-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Analysis
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNetSheet(true)}
                  className="border-slate-700"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Net Sheet
                </Button>
                <Button className="bg-gradient-to-r from-violet-500 to-purple-500">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Price Recommendation Card */}
            {cmaResult && (
              <Card className="bg-gradient-to-br from-slate-900/80 via-violet-900/20 to-slate-900/80 border-violet-500/30 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500" />
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                          <Target className="w-8 h-8 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm">Suggested List Price</p>
                          <p className="text-4xl font-bold text-white">
                            ${cmaResult.suggestedListPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">Price Range</span>
                            <span className="text-white">
                              ${cmaResult.priceRangeLow.toLocaleString()} - ${cmaResult.priceRangeHigh.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                              style={{ width: '50%', marginLeft: '25%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <p className="text-slate-400 text-sm mb-2">Confidence Score</p>
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            fill="none"
                            stroke="#334155"
                            strokeWidth="8"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeDasharray={`${cmaResult.confidence * 2.51} 251`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">{cmaResult.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparables Grid */}
            {cmaResult && (
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Home className="w-5 h-5 text-violet-400" />
                    Comparable Properties ({cmaResult.comparables.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {cmaResult.comparables.map((comp) => (
                      <Card key={comp.id} className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-white">{comp.address}</p>
                              <p className="text-sm text-slate-400">{comp.distance} mi away</p>
                            </div>
                            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                              {comp.similarity}% match
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <Bed className="w-4 h-4 mx-auto text-slate-400" />
                              <p className="text-sm text-white">{comp.beds}</p>
                            </div>
                            <div>
                              <Bath className="w-4 h-4 mx-auto text-slate-400" />
                              <p className="text-sm text-white">{comp.baths}</p>
                            </div>
                            <div>
                              <Square className="w-4 h-4 mx-auto text-slate-400" />
                              <p className="text-sm text-white">{comp.sqft.toLocaleString()}</p>
                            </div>
                            <div>
                              <Calendar className="w-4 h-4 mx-auto text-slate-400" />
                              <p className="text-sm text-white">{comp.yearBuilt}</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-700">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Sale Price</span>
                              <span className="text-white font-medium">${comp.salePrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">$/sqft</span>
                              <span className="text-white">${comp.pricePerSqft}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Adjusted</span>
                              <span className="text-emerald-400 font-medium">${comp.adjustedPrice.toLocaleString()}</span>
                            </div>
                          </div>
                          {comp.adjustments.length > 0 && (
                            <div className="text-xs space-y-1">
                              {comp.adjustments.slice(0, 2).map((adj, i) => (
                                <div key={i} className="flex justify-between text-slate-400">
                                  <span>{adj.category}</span>
                                  <span className={adj.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {adj.amount > 0 ? '+' : ''}${adj.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insights - Clean White/Black/Purple Design */}
            {cmaResult && (
              <div className="space-y-6">
                {/* Main AI Analysis Card */}
                <Card className="bg-white border border-gray-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-lg">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      AI Market Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Parse and render markdown-style content */}
                    {cmaResult.aiInsights.split('\n\n').map((section, idx) => {
                      if (section.startsWith('## ')) {
                        const title = section.replace('## ', '').split('\n')[0];
                        const content = section.split('\n').slice(1).join('\n');
                        return (
                          <div key={idx} className="space-y-2 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              {title.includes('Summary') && <FileText className="w-4 h-4 text-violet-600" />}
                              {title.includes('Market Overview') && <TrendingUp className="w-4 h-4 text-violet-600" />}
                              {title.includes('Pricing') && <DollarSign className="w-4 h-4 text-violet-600" />}
                              {title.includes('Strategy') && <Target className="w-4 h-4 text-violet-600" />}
                              {title.includes('Competitive') && <BarChart className="w-4 h-4 text-violet-600" />}
                              {title.includes('Strengths') && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                              {title.includes('Concerns') && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                              {title.includes('Actions') && <ListChecks className="w-4 h-4 text-violet-600" />}
                              {title.includes('Tips') && <Lightbulb className="w-4 h-4 text-amber-500" />}
                              {title}
                            </h4>
                            <div className="text-gray-700 text-sm leading-relaxed pl-6">
                              {content.split('\n').map((line, lineIdx) => (
                                <p key={lineIdx} className={`py-0.5 ${line.startsWith('✓') ? 'text-emerald-700 font-medium' : line.startsWith('⚠') ? 'text-amber-700 font-medium' : line.startsWith('💡') ? 'text-violet-700 font-medium' : ''}`}>
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </CardContent>
                </Card>

                {/* Quick Stats and Recommendations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Market Stats - Black Card */}
                  <Card className="bg-gray-900 border-0 shadow-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                        Market Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Avg Days on Market</span>
                        <span className="text-white font-semibold">{cmaResult.comparables.length > 0 ? Math.round(cmaResult.comparables.reduce((a, c) => a + c.daysOnMarket, 0) / cmaResult.comparables.length) : 21} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Active Listings</span>
                        <span className="text-white font-semibold">{cmaResult.comparables.filter(c => c.source === 'active').length || 1}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Recent Sales</span>
                        <span className="text-white font-semibold">{cmaResult.comparables.filter(c => c.source !== 'active').length || cmaResult.comparables.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Price/Sqft Avg</span>
                        <span className="text-violet-400 font-semibold">${cmaResult.comparables.length > 0 ? Math.round(cmaResult.comparables.reduce((a, c) => a + c.pricePerSqft, 0) / cmaResult.comparables.length) : Math.round(cmaResult.suggestedListPrice / 1500)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Strengths - Purple Gradient Card */}
                  <Card className="bg-gradient-to-br from-violet-600 to-purple-700 border-0 shadow-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Property Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {cmaResult.recommendations.slice(0, 4).map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                            <span className="text-white/90 text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Recommended Actions - Black Card */}
                  <Card className="bg-gray-900 border-0 shadow-xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        Action Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {['Professional photography', 'Deep clean & declutter', 'Minor repairs', 'Stage key rooms'].map((action, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">{i + 1}</span>
                            </div>
                            <span className="text-gray-300 text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Net Sheet Dialog */}
      <Dialog open={showNetSheet} onOpenChange={setShowNetSheet}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Seller Net Sheet Calculator</DialogTitle>
          </DialogHeader>
          <SellerNetSheetCalculator
            initialPrice={cmaResult?.suggestedListPrice || 485000}
            propertyAddress={`${propertyData.address}, ${propertyData.city}, ${propertyData.state}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
