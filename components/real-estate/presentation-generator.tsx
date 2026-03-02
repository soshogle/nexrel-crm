'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocaleLabels } from '@/hooks/use-locale-labels';
import {
  PresentationIcon,
  Sparkles,
  Home,
  Image,
  FileText,
  Download,
  Send,
  Eye,
  Plus,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  LayoutTemplate,
  Palette,
  Type,
  Images,
  BarChart3,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Wand2,
  RefreshCw,
  Copy,
  Share2,
  GraduationCap,
  ShoppingBag,
  Trees,
  Train,
  Utensils,
  Building2,
  Heart,
  X,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'listing' | 'buyer' | 'market' | 'luxury';
  slides: number;
  popular?: boolean;
  icon: any;
}

interface SlideContent {
  id: string;
  type: 'cover' | 'property' | 'features' | 'gallery' | 'area' | 'market' | 'contact' | 'custom';
  title: string;
  subtitle?: string;
  content?: string;
  bulletPoints?: string[];
  stats?: { label: string; value: string }[];
  imageUrl?: string;
  imageUrls?: string[];
  enabled: boolean;
}

interface AreaResearch {
  schools: { name: string; type: string; rating?: string; distance?: string }[];
  transportation: { type: string; name: string; distance?: string }[];
  shopping: { name: string; type: string; distance?: string }[];
  dining: { name: string; type: string; distance?: string }[];
  parks: { name: string; features?: string; distance?: string }[];
  healthcare: { name: string; type: string; distance?: string }[];
  entertainment: { name: string; type: string; distance?: string }[];
  demographics: {
    population?: string;
    medianIncome?: string;
    medianAge?: string;
    crimeRate?: string;
  };
  walkScore?: number;
  bikeScore?: number;
  transitScore?: number;
  summary: string;
}

interface GeneratedPresentation {
  id: string;
  title: string;
  subtitle: string;
  slides: SlideContent[];
  html?: string;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

export function PresentationGenerator() {
  const locale = useLocaleLabels();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookedUpProperty, setLookedUpProperty] = useState<Record<string, unknown> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PresentationTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [generatedPresentation, setGeneratedPresentation] = useState<GeneratedPresentation | null>(null);
  const [areaResearch, setAreaResearch] = useState<AreaResearch | null>(null);
  
  const [propertyInfo, setPropertyInfo] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    beds: '',
    baths: '',
    sqft: '',
    lotSize: '',
    yearBuilt: '',
    propertyType: 'Single Family',
    description: '',
    features: [] as string[],
    photos: [] as string[],
  });

  const [agentInfo, setAgentInfo] = useState({
    name: '',
    title: 'Real Estate Professional',
    phone: '',
    email: '',
    company: '',
  });

  // Server-side Places autocomplete state
  const [addressPredictions, setAddressPredictions] = useState<PlacePrediction[]>([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);

  // Handle address input change
  const handleAddressChange = useCallback((value: string) => {
    setPropertyInfo(prev => ({ ...prev, address: value }));

    if (!value || value.length < 3) {
      setAddressPredictions([]);
      setShowAddressPredictions(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}&types=address`);
        if (!res.ok) {
          setAddressPredictions([]);
          setShowAddressPredictions(false);
          return;
        }
        const data = await res.json();
        const preds = Array.isArray(data?.predictions) ? data.predictions : [];
        setAddressPredictions(preds);
        setShowAddressPredictions(preds.length > 0);
      } catch {
        setAddressPredictions([]);
        setShowAddressPredictions(false);
      }
    })();
  }, []);

  // Handle prediction selection
  const handleSelectPrediction = useCallback(async (prediction: PlacePrediction) => {
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(prediction.place_id)}`);
      if (res.ok) {
        const data = await res.json();
        const place = data?.place;
        setPropertyInfo(prev => ({
          ...prev,
          address: place?.description || prediction.description,
          city: place?.city || '',
          state: place?.state || '',
          zipCode: place?.zip || '',
        }));
      } else {
        setPropertyInfo(prev => ({ ...prev, address: prediction.description }));
      }
    } catch {
      setPropertyInfo(prev => ({ ...prev, address: prediction.description }));
    } finally {
      setShowAddressPredictions(false);
      setAddressPredictions([]);
    }
  }, []);

  const templates: PresentationTemplate[] = [
    {
      id: 'listing',
      name: 'Listing Presentation',
      description: 'Professional presentation for listing appointments',
      category: 'listing',
      slides: 8,
      popular: true,
      icon: Home,
    },
    {
      id: 'buyer',
      name: 'Buyer Presentation',
      description: 'Showcase properties to potential buyers',
      category: 'buyer',
      slides: 6,
      icon: Heart,
    },
    {
      id: 'market',
      name: 'Market Analysis',
      description: 'Data-driven CMA presentation',
      category: 'market',
      slides: 7,
      icon: BarChart3,
    },
    {
      id: 'luxury',
      name: 'Luxury Property',
      description: 'Premium design for high-end listings',
      category: 'luxury',
      slides: 10,
      icon: Building2,
    },
  ];

  const propertyFeatures = [
    'Open Floor Plan', 'Updated Kitchen', 'Primary Suite', 'Smart Home',
    'Pool/Spa', 'Mountain Views', 'Gourmet Kitchen', 'Home Office',
    'Wine Cellar', 'Guest House', 'RV Parking', 'Solar Panels',
    'Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Fireplace',
    'Attached Garage', 'Central Air', 'New Roof', 'Large Backyard',
  ];

  const toggleFeature = (feature: string) => {
    setPropertyInfo(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleResearchArea = async () => {
    if (!propertyInfo.address || !propertyInfo.city) {
      toast.error('Please enter property address and city first');
      return;
    }

    setIsResearching(true);
    try {
      const response = await fetch('/api/real-estate/presentation/area-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: propertyInfo.address,
          city: propertyInfo.city,
          state: propertyInfo.state,
          propertyType: propertyInfo.propertyType,
        }),
      });

      if (!response.ok) throw new Error('Research failed');

      const data = await response.json();
      setAreaResearch(data.research);
      toast.success('Area research complete!');
    } catch (error) {
      console.error('Area research error:', error);
      toast.error('Failed to research area. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    if (!propertyInfo.address || !propertyInfo.city) {
      toast.error('Please enter property address and city');
      return;
    }

    setIsGenerating(true);

    try {
      // Research area if not done yet
      let research = areaResearch;
      if (!research) {
        const researchResponse = await fetch('/api/real-estate/presentation/area-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: propertyInfo.address,
            city: propertyInfo.city,
            state: propertyInfo.state,
            propertyType: propertyInfo.propertyType,
          }),
        });
        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          research = researchData.research;
          setAreaResearch(research);
        }
      }

      // Generate presentation
      const response = await fetch('/api/real-estate/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationType: selectedTemplate.id,
          propertyData: {
            ...propertyInfo,
            price: propertyInfo.price ? parseInt(propertyInfo.price.replace(/[^0-9]/g, '')) : 0,
            beds: parseInt(propertyInfo.beds) || 0,
            baths: parseFloat(propertyInfo.baths) || 0,
            sqft: parseInt(propertyInfo.sqft?.replace(/[^0-9]/g, '')) || 0,
            yearBuilt: parseInt(propertyInfo.yearBuilt) || undefined,
            photos: propertyInfo.photos || [],
          },
          areaResearch: research,
          agentInfo,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      setGeneratedPresentation(result.presentation);
      toast.success('Presentation generated successfully!');
      setStep(4);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate presentation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedPresentation) return;

    try {
      toast.info('Generating PDF...');
      const response = await fetch('/api/real-estate/presentation/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentation: generatedPresentation }),
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${generatedPresentation.title || 'presentation'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded!');
      } else {
        // Client-side HTML approach
        const data = await response.json();
        if (data.html) {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(data.html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
          }
        }
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const renderSlidePreview = (slide: SlideContent, index: number) => {
    const isActive = index === currentSlideIndex;
    const imgUrl = (slide as any).imageUrl || (slide as any).imageUrls?.[0];
    return (
      <div
        key={slide.id}
        className={`relative aspect-video rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
          isActive
            ? 'border-orange-500 shadow-lg shadow-orange-500/20'
            : 'border-purple-200 hover:border-purple-300'
        }`}
        onClick={() => setCurrentSlideIndex(index)}
      >
        {imgUrl && (
          <img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className={`absolute inset-0 p-4 flex flex-col justify-end ${imgUrl ? 'bg-gradient-to-t from-black/80 via-transparent to-transparent' : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}>
          <div className="text-xs text-purple-400 font-medium mb-1">{slide.type.toUpperCase()}</div>
          <div className="text-sm text-white font-semibold truncate">{slide.title}</div>
          {slide.subtitle && (
            <div className="text-xs text-slate-300 truncate mt-0.5">{slide.subtitle}</div>
          )}
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          {index + 1}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Template', icon: LayoutTemplate },
              { num: 2, label: 'Property Info', icon: Home },
              { num: 3, label: 'Area Research', icon: MapPin },
              { num: 4, label: 'Generate', icon: Sparkles },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`flex items-center gap-2 cursor-pointer transition-all ${
                    step >= s.num ? 'text-purple-600' : 'text-gray-500'
                  }`}
                  onClick={() => s.num < step && setStep(s.num)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step >= s.num
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-gray-900'
                        : 'bg-white border border-purple-200'
                    }`}
                  >
                    {step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className="hidden md:inline font-medium">{s.label}</span>
                </div>
                {i < 3 && (
                  <div
                    className={`w-16 md:w-24 h-1 mx-4 rounded ${
                      step > s.num ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gray-100'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700" />
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-purple-600" />
                Choose a Template
              </CardTitle>
              <CardDescription>Select a presentation style for your property</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                      selectedTemplate?.id === template.id
                        ? 'border-orange-500 bg-purple-600/10'
                        : 'border-purple-200 bg-white/80 hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {template.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-purple-600">Popular</Badge>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-4">
                      <template.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-gray-900 font-semibold mb-1">{template.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileText className="w-4 h-4" />
                      {template.slides} slides
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute top-4 right-4">
                        <Check className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedTemplate}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Property Info */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700" />
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Home className="w-6 h-6 text-purple-600" />
                Property Information
              </CardTitle>
              <CardDescription>Enter the property details or look up online to auto-fill</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Address Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex gap-2">
                  <div className="flex-1 relative">
                  <Label className="text-gray-700">Street Address *</Label>
                  <Input
                    value={propertyInfo.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => addressPredictions.length > 0 && setShowAddressPredictions(true)}
                    onBlur={() => setTimeout(() => setShowAddressPredictions(false), 200)}
                    placeholder="Start typing an address..."
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    autoComplete="off"
                  />
                  {showAddressPredictions && addressPredictions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-purple-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {addressPredictions.map((prediction) => (
                        <button
                          key={prediction.place_id}
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-purple-50 flex items-center gap-2"
                          onMouseDown={() => handleSelectPrediction(prediction)}
                        >
                          <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span>{prediction.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!propertyInfo.address?.trim() && !propertyInfo.city?.trim()) {
                        toast.error('Enter address or city first');
                        return;
                      }
                      setIsLookingUp(true);
                      try {
                        const res = await fetch('/api/real-estate/presentation/property-lookup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            address: propertyInfo.address,
                            city: propertyInfo.city,
                            state: propertyInfo.state,
                          }),
                        });
                        const data = await res.json();
                        if (data.found && data.property) {
                          const p = data.property;
                          setLookedUpProperty(p);
                          setPropertyInfo(prev => ({
                            ...prev,
                            address: p.address || prev.address,
                            city: p.city || prev.city,
                            state: p.state || prev.state,
                            zipCode: p.zipCode || prev.zipCode,
                            price: p.price || prev.price,
                            beds: p.beds || prev.beds,
                            baths: p.baths || prev.baths,
                            sqft: p.sqft || prev.sqft,
                            lotSize: p.lotSize || prev.lotSize,
                            yearBuilt: p.yearBuilt || prev.yearBuilt,
                            propertyType: p.propertyType || prev.propertyType,
                            description: p.description || prev.description,
                            features: p.features?.length ? p.features : prev.features,
                            photos: p.photos?.length ? p.photos : prev.photos,
                          }));
                          toast.success('Property data found and filled!');
                        } else {
                          toast.info(data.message || 'No listing found. Enter details manually.');
                        }
                      } catch {
                        toast.error('Lookup failed');
                      } finally {
                        setIsLookingUp(false);
                      }
                    }}
                    disabled={isLookingUp}
                    className="self-end shrink-0 h-10"
                  >
                    {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    {isLookingUp ? 'Looking up...' : 'Look up'}
                  </Button>
                </div>
                {lookedUpProperty && (
                  <div className="md:col-span-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const p = lookedUpProperty as any;
                        const zip = p.zipCode || propertyInfo.zipCode;
                        if (!zip?.trim()) {
                          toast.error('Enter ZIP/postal code to add to listings');
                          return;
                        }
                        try {
                          const res = await fetch('/api/real-estate/properties', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              address: p.address || propertyInfo.address,
                              unit: p.unit,
                              city: p.city || propertyInfo.city,
                              state: p.state || propertyInfo.state,
                              zip: zip,
                              country: p.country || 'US',
                              listPrice: p.price ? parseInt(String(p.price).replace(/[^0-9]/g, '')) : undefined,
                              beds: p.beds ? parseInt(p.beds) : undefined,
                              baths: p.baths ? parseFloat(p.baths) : undefined,
                              sqft: p.sqft ? parseInt(String(p.sqft).replace(/[^0-9]/g, '')) : undefined,
                              lotSize: p.lotSize ? parseInt(String(p.lotSize).replace(/[^0-9]/g, '')) : undefined,
                              yearBuilt: p.yearBuilt ? parseInt(p.yearBuilt) : undefined,
                              propertyType: p.propertyType || 'SINGLE_FAMILY',
                              mlsNumber: p.mlsNumber,
                              photos: p.photos || [],
                              virtualTourUrl: p.virtualTourUrl,
                              description: p.description,
                              features: p.features || [],
                              lat: p.latitude,
                              lng: p.longitude,
                            }),
                          });
                          if (!res.ok) throw new Error((await res.json()).error || 'Failed');
                          toast.success('Added to Listings!');
                          setLookedUpProperty(null);
                        } catch (e) {
                          toast.error((e as Error)?.message || 'Failed to add');
                        }
                      }}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Listings
                    </Button>
                  </div>
                )}
                <div>
                  <Label className="text-gray-700">City *</Label>
                  <Input
                    value={propertyInfo.city}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, city: e.target.value }))}
                    placeholder={locale.cityPlaceholder}
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700">{locale.stateLabel}</Label>
                    <Input
                      value={propertyInfo.state}
                      onChange={(e) => setPropertyInfo(prev => ({ ...prev, state: e.target.value }))}
                      placeholder={locale.statePlaceholder}
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{locale.zipLabel}</Label>
                    <Input
                      value={propertyInfo.zipCode}
                      onChange={(e) => setPropertyInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder={locale.zipPlaceholder}
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-700">Price</Label>
                  <Input
                    value={propertyInfo.price}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="$500,000"
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Beds</Label>
                  <Input
                    type="number"
                    value={propertyInfo.beds}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, beds: e.target.value }))}
                    placeholder="4"
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Baths</Label>
                  <Input
                    value={propertyInfo.baths}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, baths: e.target.value }))}
                    placeholder="2.5"
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Sq Ft</Label>
                  <Input
                    value={propertyInfo.sqft}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, sqft: e.target.value }))}
                    placeholder="2,500"
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Year Built</Label>
                  <Input
                    value={propertyInfo.yearBuilt}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, yearBuilt: e.target.value }))}
                    placeholder="2005"
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Lot Size</Label>
                  <Input
                    value={propertyInfo.lotSize}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, lotSize: e.target.value }))}
                    placeholder="0.25 acres"
                    className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-gray-700">Property Type</Label>
                  <Select
                    value={propertyInfo.propertyType}
                    onValueChange={(value) => setPropertyInfo(prev => ({ ...prev, propertyType: value }))}
                  >
                    <SelectTrigger className="bg-white/80 border-purple-200 text-gray-900 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single Family">Single Family</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-gray-700">Property Description</Label>
                <Textarea
                  value={propertyInfo.description}
                  onChange={(e) => setPropertyInfo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the property highlights, upgrades, and unique features..."
                  className="bg-white/80 border-purple-200 text-gray-900 mt-1 min-h-[100px]"
                />
              </div>

              {/* Features */}
              <div>
                <Label className="text-gray-700 mb-3 block">Property Features</Label>
                <div className="flex flex-wrap gap-2">
                  {propertyFeatures.map((feature) => (
                    <Badge
                      key={feature}
                      variant="outline"
                      className={`cursor-pointer transition-all ${
                        propertyInfo.features.includes(feature)
                          ? 'bg-purple-600/20 border-orange-500 text-orange-300'
                          : 'border-purple-300 text-gray-600 hover:border-slate-500'
                      }`}
                      onClick={() => toggleFeature(feature)}
                    >
                      {propertyInfo.features.includes(feature) && <Check className="w-3 h-3 mr-1" />}
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Agent Info */}
              <div className="border-t border-purple-200 pt-6">
                <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                  <PresentationIcon className="w-5 h-5 text-purple-600" />
                  Agent Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-700">Your Name</Label>
                    <Input
                      value={agentInfo.name}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Smith"
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Phone</Label>
                    <Input
                      value={agentInfo.phone}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Email</Label>
                    <Input
                      value={agentInfo.email}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@realestate.com"
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-700">Company</Label>
                    <Input
                      value={agentInfo.company}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="ABC Realty"
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Title</Label>
                    <Input
                      value={agentInfo.title}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Real Estate Agent"
                      className="bg-white/80 border-purple-200 text-gray-900 mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-purple-200">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!propertyInfo.address || !propertyInfo.city}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Area Research */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-purple-600" />
                    Area Research
                  </CardTitle>
                  <CardDescription>Real neighborhood data from Google Places for your presentation</CardDescription>
                </div>
                <Button
                  onClick={handleResearchArea}
                  disabled={isResearching}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {isResearching ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Researching...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-2" /> Research Area</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!areaResearch ? (
                <div className="text-center py-12 bg-gray-100/30 rounded-xl border border-purple-200/50">
                  <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-gray-900 font-semibold mb-2">Research the Neighborhood</h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Click "Research Area" to automatically gather information about schools, shopping, parks, transportation, and more for your presentation.
                  </p>
                  <Badge variant="outline" className="border-purple-300 text-gray-600">
                    {propertyInfo.address}, {propertyInfo.city}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-gray-700">{areaResearch.summary}</p>
                  </div>

                  {/* Scores - only show when we have real Walk/Transit/Bike scores from a provider */}
                  {(areaResearch.walkScore != null || areaResearch.transitScore != null || areaResearch.bikeScore != null) && (
                    <div className="grid grid-cols-3 gap-4">
                      {[{
                        label: 'Walk Score',
                        value: areaResearch.walkScore,
                        color: 'emerald'
                      }, {
                        label: 'Transit Score',
                        value: areaResearch.transitScore,
                        color: 'blue'
                      }, {
                        label: 'Bike Score',
                        value: areaResearch.bikeScore,
                        color: 'amber'
                      }].map(score => (
                        <div key={score.label} className="bg-gray-100/50 rounded-xl p-4 text-center border border-purple-200/50">
                          <div className={`text-3xl font-bold text-${score.color}-400`}>{score.value ?? '—'}</div>
                          <div className="text-sm text-gray-600">{score.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Schools */}
                    {areaResearch.schools?.length > 0 && (
                      <div className="bg-gray-100/30 rounded-xl p-4 border border-purple-200/50">
                        <h4 className="text-gray-900 font-semibold flex items-center gap-2 mb-3">
                          <GraduationCap className="w-5 h-5 text-blue-400" /> Schools
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.schools.slice(0, 4).map((school, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{school.name}</span>
                              <span className="text-gray-500">{school.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shopping */}
                    {areaResearch.shopping?.length > 0 && (
                      <div className="bg-gray-100/30 rounded-xl p-4 border border-purple-200/50">
                        <h4 className="text-gray-900 font-semibold flex items-center gap-2 mb-3">
                          <ShoppingBag className="w-5 h-5 text-pink-400" /> Shopping
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.shopping.slice(0, 4).map((shop, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{shop.name}</span>
                              <span className="text-gray-500">{shop.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parks */}
                    {areaResearch.parks?.length > 0 && (
                      <div className="bg-gray-100/30 rounded-xl p-4 border border-purple-200/50">
                        <h4 className="text-gray-900 font-semibold flex items-center gap-2 mb-3">
                          <Trees className="w-5 h-5 text-green-400" /> Parks & Recreation
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.parks.slice(0, 4).map((park, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{park.name}</span>
                              <span className="text-gray-500">{park.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transportation */}
                    {areaResearch.transportation?.length > 0 && (
                      <div className="bg-gray-100/30 rounded-xl p-4 border border-purple-200/50">
                        <h4 className="text-gray-900 font-semibold flex items-center gap-2 mb-3">
                          <Train className="w-5 h-5 text-purple-400" /> Transportation
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.transportation.slice(0, 4).map((trans, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{trans.name}</span>
                              <span className="text-gray-500">{trans.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dining */}
                    {areaResearch.dining?.length > 0 && (
                      <div className="bg-gray-100/30 rounded-xl p-4 border border-purple-200/50">
                        <h4 className="text-gray-900 font-semibold flex items-center gap-2 mb-3">
                          <Utensils className="w-5 h-5 text-purple-600" /> Dining
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.dining.slice(0, 4).map((restaurant, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{restaurant.name}</span>
                              <span className="text-gray-500">{restaurant.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Healthcare */}
                    {areaResearch.healthcare?.length > 0 && (
                      <div className="bg-gray-100/30 rounded-xl p-4 border border-purple-200/50">
                        <h4 className="text-gray-900 font-semibold flex items-center gap-2 mb-3">
                          <Heart className="w-5 h-5 text-red-400" /> Healthcare
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.healthcare.slice(0, 4).map((facility, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{facility.name}</span>
                              <span className="text-gray-500">{facility.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="border-purple-200">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Presentation</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 4: Generated Presentation */}
      {step === 4 && generatedPresentation && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    Your Presentation is Ready!
                  </CardTitle>
                  <CardDescription>{generatedPresentation.title}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="border-purple-200"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Slide Thumbnails */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generatedPresentation.slides.map((slide, index) => renderSlidePreview(slide as any, index))}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedPresentation(null);
                    setStep(1);
                  }}
                  className="border-purple-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[80vh] bg-white border-2 border-purple-200/50">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center justify-between">
              <span>Presentation Preview</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  className="border-purple-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-gray-600 text-sm">
                  {currentSlideIndex + 1} / {generatedPresentation?.slides.length || 0}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.min((generatedPresentation?.slides.length || 1) - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex >= (generatedPresentation?.slides.length || 1) - 1}
                  className="border-purple-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 rounded-lg p-8 overflow-auto">
            {generatedPresentation && generatedPresentation.slides[currentSlideIndex] && (
              <div className="min-h-[400px] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border border-slate-200">
                {/* Gallery grid for gallery slides */}
                {(generatedPresentation.slides[currentSlideIndex] as any).type === 'gallery' && (generatedPresentation.slides[currentSlideIndex] as any).imageUrls?.length > 0 && (
                  <>
                    <div className="p-4 border-b bg-slate-50">
                      <h2 className="text-xl font-bold text-slate-900">{generatedPresentation.slides[currentSlideIndex].title}</h2>
                      {generatedPresentation.slides[currentSlideIndex].subtitle && (
                        <p className="text-sm text-slate-600 mt-1">{generatedPresentation.slides[currentSlideIndex].subtitle}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-4">
                      {(generatedPresentation.slides[currentSlideIndex] as any).imageUrls.slice(0, 6).map((url: string, i: number) => (
                        <img key={i} src={url} alt="" className="w-full aspect-video object-cover rounded-lg" />
                      ))}
                    </div>
                  </>
                )}
                {/* Hero image for property slide (single image) */}
                {(generatedPresentation.slides[currentSlideIndex] as any).type !== 'gallery' && ((generatedPresentation.slides[currentSlideIndex] as any).imageUrl || (generatedPresentation.slides[currentSlideIndex] as any).imageUrls?.[0]) && (
                  <div className="relative h-48 bg-slate-200">
                    <img
                      src={(generatedPresentation.slides[currentSlideIndex] as any).imageUrl || (generatedPresentation.slides[currentSlideIndex] as any).imageUrls?.[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <div className="text-purple-400 text-xs font-medium uppercase tracking-wider">
                        {(generatedPresentation.slides[currentSlideIndex] as any).type}
                      </div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                        {generatedPresentation.slides[currentSlideIndex].title}
                      </h2>
                      {generatedPresentation.slides[currentSlideIndex].subtitle && (
                        <p className="text-white/90 text-sm mt-0.5">
                          {generatedPresentation.slides[currentSlideIndex].subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {/* Content area for non-gallery, non-image slides */}
                {(generatedPresentation.slides[currentSlideIndex] as any).type !== 'gallery' && !((generatedPresentation.slides[currentSlideIndex] as any).imageUrl || (generatedPresentation.slides[currentSlideIndex] as any).imageUrls?.[0]) && (
                  <div className="p-8">
                    <div className="text-purple-600 text-sm font-medium mb-2">
                      {(generatedPresentation.slides[currentSlideIndex] as any).type?.toUpperCase()}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      {generatedPresentation.slides[currentSlideIndex].title}
                    </h2>
                    {generatedPresentation.slides[currentSlideIndex].subtitle && (
                      <p className="text-xl text-purple-600 mb-6">
                        {generatedPresentation.slides[currentSlideIndex].subtitle}
                      </p>
                    )}
                    {(generatedPresentation.slides[currentSlideIndex] as any).stats && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {(generatedPresentation.slides[currentSlideIndex] as any).stats.map((stat: any, i: number) => (
                          <div key={i} className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
                            <div className="text-2xl font-bold text-purple-600">{stat.value}</div>
                            <div className="text-sm text-slate-600">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(generatedPresentation.slides[currentSlideIndex] as any).bulletPoints && (
                      <ul className="space-y-2">
                        {(generatedPresentation.slides[currentSlideIndex] as any).bulletPoints.map((point: string, i: number) => (
                          <li key={i} className="text-slate-700 flex items-start gap-2">
                            <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}
                    {generatedPresentation.slides[currentSlideIndex].content && (
                      <p className="text-slate-700 whitespace-pre-line">
                        {generatedPresentation.slides[currentSlideIndex].content}
                      </p>
                    )}
                  </div>
                )}
                {/* Stats for property slide with hero image */}
                {(generatedPresentation.slides[currentSlideIndex] as any).type === 'property' && ((generatedPresentation.slides[currentSlideIndex] as any).imageUrl || (generatedPresentation.slides[currentSlideIndex] as any).imageUrls?.[0]) && (
                  <div className="p-6 border-t">
                    {(generatedPresentation.slides[currentSlideIndex] as any).stats && (
                      <div className="grid grid-cols-3 gap-3">
                        {(generatedPresentation.slides[currentSlideIndex] as any).stats.map((stat: any, i: number) => (
                          <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-purple-600">{stat.value}</div>
                            <div className="text-xs text-slate-600">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
