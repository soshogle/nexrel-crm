'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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

export function PresentationGenerator() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
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
    setPropertyInfo(prev => ({ ...prev, address: value }));
    
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

          setPropertyInfo(prev => ({
            ...prev,
            address: `${streetNumber} ${route}`.trim(),
            city,
            state,
            zipCode: zip,
          }));
        }
        setShowAddressPredictions(false);
        setAddressPredictions([]);
      }
    );
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
    return (
      <div
        key={slide.id}
        className={`relative aspect-video rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
          isActive
            ? 'border-orange-500 shadow-lg shadow-orange-500/20'
            : 'border-slate-700 hover:border-slate-600'
        }`}
        onClick={() => setCurrentSlideIndex(index)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <div className="text-xs text-orange-400 font-medium mb-1">{slide.type.toUpperCase()}</div>
          <div className="text-sm text-white font-semibold truncate">{slide.title}</div>
          {slide.subtitle && (
            <div className="text-xs text-slate-400 truncate mt-1">{slide.subtitle}</div>
          )}
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-slate-500">
          {index + 1}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
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
                    step >= s.num ? 'text-orange-400' : 'text-slate-500'
                  }`}
                  onClick={() => s.num < step && setStep(s.num)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step >= s.num
                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    {step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className="hidden md:inline font-medium">{s.label}</span>
                </div>
                {i < 3 && (
                  <div
                    className={`w-16 md:w-24 h-1 mx-4 rounded ${
                      step > s.num ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-slate-800'
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
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-orange-400" />
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
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {template.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500">Popular</Badge>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-4">
                      <template.icon className="w-6 h-6 text-orange-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-1">{template.name}</h3>
                    <p className="text-slate-400 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileText className="w-4 h-4" />
                      {template.slides} slides
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute top-4 right-4">
                        <Check className="w-5 h-5 text-orange-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedTemplate}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
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
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Home className="w-6 h-6 text-orange-400" />
                Property Information
              </CardTitle>
              <CardDescription>Enter the property details for your presentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Address Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 relative">
                  <Label className="text-slate-300">Street Address *</Label>
                  <Input
                    ref={addressInputRef}
                    value={propertyInfo.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => addressPredictions.length > 0 && setShowAddressPredictions(true)}
                    onBlur={() => setTimeout(() => setShowAddressPredictions(false), 200)}
                    placeholder="Start typing an address..."
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
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
                  <Label className="text-slate-300">City *</Label>
                  <Input
                    value={propertyInfo.city}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Los Angeles"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">State</Label>
                    <Input
                      value={propertyInfo.state}
                      onChange={(e) => setPropertyInfo(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="CA"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">ZIP</Label>
                    <Input
                      value={propertyInfo.zipCode}
                      onChange={(e) => setPropertyInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="90210"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-slate-300">Price</Label>
                  <Input
                    value={propertyInfo.price}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="$500,000"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Beds</Label>
                  <Input
                    type="number"
                    value={propertyInfo.beds}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, beds: e.target.value }))}
                    placeholder="4"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Baths</Label>
                  <Input
                    value={propertyInfo.baths}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, baths: e.target.value }))}
                    placeholder="2.5"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Sq Ft</Label>
                  <Input
                    value={propertyInfo.sqft}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, sqft: e.target.value }))}
                    placeholder="2,500"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Year Built</Label>
                  <Input
                    value={propertyInfo.yearBuilt}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, yearBuilt: e.target.value }))}
                    placeholder="2005"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Lot Size</Label>
                  <Input
                    value={propertyInfo.lotSize}
                    onChange={(e) => setPropertyInfo(prev => ({ ...prev, lotSize: e.target.value }))}
                    placeholder="0.25 acres"
                    className="bg-slate-800/50 border-slate-700 text-white mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-300">Property Type</Label>
                  <Select
                    value={propertyInfo.propertyType}
                    onValueChange={(value) => setPropertyInfo(prev => ({ ...prev, propertyType: value }))}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white mt-1">
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
                <Label className="text-slate-300">Property Description</Label>
                <Textarea
                  value={propertyInfo.description}
                  onChange={(e) => setPropertyInfo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the property highlights, upgrades, and unique features..."
                  className="bg-slate-800/50 border-slate-700 text-white mt-1 min-h-[100px]"
                />
              </div>

              {/* Features */}
              <div>
                <Label className="text-slate-300 mb-3 block">Property Features</Label>
                <div className="flex flex-wrap gap-2">
                  {propertyFeatures.map((feature) => (
                    <Badge
                      key={feature}
                      variant="outline"
                      className={`cursor-pointer transition-all ${
                        propertyInfo.features.includes(feature)
                          ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                          : 'border-slate-600 text-slate-400 hover:border-slate-500'
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
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <PresentationIcon className="w-5 h-5 text-orange-400" />
                  Agent Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-300">Your Name</Label>
                    <Input
                      value={agentInfo.name}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Smith"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Phone</Label>
                    <Input
                      value={agentInfo.phone}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      value={agentInfo.email}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@realestate.com"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-slate-300">Company</Label>
                    <Input
                      value={agentInfo.company}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="ABC Realty"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Title</Label>
                    <Input
                      value={agentInfo.title}
                      onChange={(e) => setAgentInfo(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Real Estate Agent"
                      className="bg-slate-800/50 border-slate-700 text-white mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-slate-700">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!propertyInfo.address || !propertyInfo.city}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
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
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-orange-400" />
                    Area Research
                  </CardTitle>
                  <CardDescription>AI-powered neighborhood research for your presentation</CardDescription>
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
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">Research the Neighborhood</h3>
                  <p className="text-slate-400 mb-4 max-w-md mx-auto">
                    Click "Research Area" to automatically gather information about schools, shopping, parks, transportation, and more for your presentation.
                  </p>
                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                    {propertyInfo.address}, {propertyInfo.city}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-slate-300">{areaResearch.summary}</p>
                  </div>

                  {/* Scores */}
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
                      <div key={score.label} className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
                        <div className={`text-3xl font-bold text-${score.color}-400`}>{score.value || '—'}</div>
                        <div className="text-sm text-slate-400">{score.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Schools */}
                    {areaResearch.schools?.length > 0 && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                          <GraduationCap className="w-5 h-5 text-blue-400" /> Schools
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.schools.slice(0, 4).map((school, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-300">{school.name}</span>
                              <span className="text-slate-500">{school.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shopping */}
                    {areaResearch.shopping?.length > 0 && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                          <ShoppingBag className="w-5 h-5 text-pink-400" /> Shopping
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.shopping.slice(0, 4).map((shop, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-300">{shop.name}</span>
                              <span className="text-slate-500">{shop.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parks */}
                    {areaResearch.parks?.length > 0 && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                          <Trees className="w-5 h-5 text-green-400" /> Parks & Recreation
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.parks.slice(0, 4).map((park, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-300">{park.name}</span>
                              <span className="text-slate-500">{park.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transportation */}
                    {areaResearch.transportation?.length > 0 && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                          <Train className="w-5 h-5 text-purple-400" /> Transportation
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.transportation.slice(0, 4).map((trans, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-300">{trans.name}</span>
                              <span className="text-slate-500">{trans.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dining */}
                    {areaResearch.dining?.length > 0 && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                          <Utensils className="w-5 h-5 text-orange-400" /> Dining
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.dining.slice(0, 4).map((restaurant, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-300">{restaurant.name}</span>
                              <span className="text-slate-500">{restaurant.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Healthcare */}
                    {areaResearch.healthcare?.length > 0 && (
                      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-3">
                          <Heart className="w-5 h-5 text-red-400" /> Healthcare
                        </h4>
                        <div className="space-y-2">
                          {areaResearch.healthcare.slice(0, 4).map((facility, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-300">{facility.name}</span>
                              <span className="text-slate-500">{facility.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="border-slate-700">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
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
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-orange-400" />
                    Your Presentation is Ready!
                  </CardTitle>
                  <CardDescription>{generatedPresentation.title}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="border-slate-700"
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
                  className="border-slate-700"
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
        <DialogContent className="max-w-5xl h-[80vh] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>Presentation Preview</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                  disabled={currentSlideIndex === 0}
                  className="border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-slate-400 text-sm">
                  {currentSlideIndex + 1} / {generatedPresentation?.slides.length || 0}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlideIndex(Math.min((generatedPresentation?.slides.length || 1) - 1, currentSlideIndex + 1))}
                  disabled={currentSlideIndex >= (generatedPresentation?.slides.length || 1) - 1}
                  className="border-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-950 rounded-lg p-8 overflow-auto">
            {generatedPresentation && generatedPresentation.slides[currentSlideIndex] && (
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 flex flex-col">
                <div className="text-orange-400 text-sm font-medium mb-2">
                  {(generatedPresentation.slides[currentSlideIndex] as any).type?.toUpperCase()}
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {generatedPresentation.slides[currentSlideIndex].title}
                </h2>
                {generatedPresentation.slides[currentSlideIndex].subtitle && (
                  <p className="text-xl text-orange-400 mb-6">
                    {generatedPresentation.slides[currentSlideIndex].subtitle}
                  </p>
                )}
                {(generatedPresentation.slides[currentSlideIndex] as any).stats && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {(generatedPresentation.slides[currentSlideIndex] as any).stats.map((stat: any, i: number) => (
                      <div key={i} className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-400">{stat.value}</div>
                        <div className="text-sm text-slate-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(generatedPresentation.slides[currentSlideIndex] as any).bulletPoints && (
                  <ul className="space-y-2">
                    {(generatedPresentation.slides[currentSlideIndex] as any).bulletPoints.map((point: string, i: number) => (
                      <li key={i} className="text-slate-300 flex items-start gap-2">
                        <Check className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {generatedPresentation.slides[currentSlideIndex].content && (
                  <p className="text-slate-300 whitespace-pre-line">
                    {generatedPresentation.slides[currentSlideIndex].content}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
