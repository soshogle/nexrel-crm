'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Home, Building2, TreePine, Building, DollarSign,
  Bed, Bath, Maximize, Calendar, Phone, Mail, User, ExternalLink,
  Download, Upload, Plus, X, Check, AlertCircle, Loader2, Filter,
  ChevronDown, ChevronUp, Star, Import, FileSpreadsheet, RefreshCw,
  Image as ImageIcon, Heart, Share2, Eye, Clock, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { LocationSearch, LocationData } from '@/components/ui/location-search';
import { toast } from '@/hooks/use-toast';

// Types
interface FSBOLead {
  id: string;
  source: string;
  url: string;
  title: string;
  price: number | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string | null;
  yearBuilt: string | null;
  propertyType: string;
  description: string;
  photos: string[];
  sellerName: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  listedDate: string | null;
  daysOnMarket: number | null;
  leadScore: number;
  scrapedAt: string;
}


interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyTypes?: string[];
  amenities?: string[];
  maxDaysOnMarket?: number;
}

// Source configurations with branding
const FSBO_SOURCES = [
  { id: 'duproprio', name: 'DuProprio', country: 'Canada', color: '#00a651', logo: '🏠' },
  { id: 'fsbo.com', name: 'FSBO.com', country: 'United States', color: '#1a73e8', logo: '🏡' },
  { id: 'zillow', name: 'Zillow FSBO', country: 'United States', color: '#006aff', logo: '🔷' },
  { id: 'forsalebyowner', name: 'ForSaleByOwner.com', country: 'United States', color: '#f97316', logo: '🏘️' },
  { id: 'kijiji', name: 'Kijiji Real Estate', country: 'Canada', color: '#373373', logo: '📋' },
  { id: 'craigslist', name: 'Craigslist', country: 'United States, Canada', color: '#5a2b82', logo: '📝' },
  { id: 'realtor.ca', name: 'Realtor.ca', country: 'Canada', color: '#c41230', logo: '🍁' },
  { id: 'purplebricks', name: 'Purplebricks', country: 'United Kingdom, Canada', color: '#6b21a8', logo: '🟣' },
  { id: 'rightmove', name: 'Rightmove', country: 'United Kingdom', color: '#00dbb1', logo: '🏛️' },
];

const PROPERTY_TYPES = [
  { id: 'single-family', label: 'Single Family', icon: Home },
  { id: 'condo', label: 'Condo/Apartment', icon: Building },
  { id: 'townhouse', label: 'Townhouse', icon: Building2 },
  { id: 'multi-family', label: 'Multi-Family', icon: Building2 },
  { id: 'land', label: 'Land/Lot', icon: TreePine },
  { id: 'commercial', label: 'Commercial', icon: Building },
];

const AMENITIES = [
  { id: 'pool', label: 'Pool', icon: '🏊' },
  { id: 'garage', label: 'Garage', icon: '🚗' },
  { id: 'basement', label: 'Basement', icon: '🏠' },
  { id: 'waterfront', label: 'Waterfront', icon: '🌊' },
  { id: 'acreage', label: 'Acreage', icon: '🌲' },
];

export function FSBOLeadsFull() {
  // State
  const [activeTab, setActiveTab] = useState('search');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    maxPrice: 5000000,
    maxSqft: 10000,
    maxDaysOnMarket: 365,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FSBOLead[]>([]);
  const [searchErrors, setSearchErrors] = useState<{ source: string; error: string }[]>([]);
  const [selectedLead, setSelectedLead] = useState<FSBOLead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showManualImport, setShowManualImport] = useState(false);
  const [importingLeads, setImportingLeads] = useState<Set<string>>(new Set());
  const [importedLeads, setImportedLeads] = useState<Set<string>>(new Set());

  // Manual import state
  const [manualLead, setManualLead] = useState({
    sellerName: '',
    sellerPhone: '',
    sellerEmail: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    beds: '',
    baths: '',
    sqft: '',
    propertyType: 'single-family',
    url: '',
    notes: '',
    source: 'Manual',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Get country codes for selected sources
  const getCountryCodes = useCallback(() => {
    const codes = new Set<string>();
    selectedSources.forEach(sourceId => {
      const source = FSBO_SOURCES.find(s => s.id === sourceId);
      if (source) {
        if (source.country.includes('Canada')) codes.add('CA');
        if (source.country.includes('United States')) codes.add('US');
        if (source.country.includes('United Kingdom')) codes.add('GB');
      }
    });
    return Array.from(codes);
  }, [selectedSources]);

  // Toggle source selection
  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  // Toggle property type
  const togglePropertyType = (typeId: string) => {
    setFilters(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes?.includes(typeId)
        ? prev.propertyTypes.filter(id => id !== typeId)
        : [...(prev.propertyTypes || []), typeId],
    }));
  };

  // Toggle amenity
  const toggleAmenity = (amenityId: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities?.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...(prev.amenities || []), amenityId],
    }));
  };

  // Search for leads
  const handleSearch = async () => {
    if (selectedSources.length === 0) {
      toast({
        title: 'Select Sources',
        description: 'Please select at least one source to search',
        variant: 'destructive',
      });
      return;
    }

    if (!location) {
      toast({
        title: 'Select Location',
        description: 'Please enter a location to search',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSearchErrors([]);

    try {
      const response = await fetch('/api/real-estate/fsbo-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: selectedSources,
          location,
          filters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results || []);
      if (data.errors) {
        setSearchErrors(data.errors);
      }

      toast({
        title: 'Search Complete',
        description: `Found ${data.totalResults} leads from ${selectedSources.length} sources`,
      });
    } catch (error: any) {
      toast({
        title: 'Search Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Import lead to CRM
  const importLead = async (lead: FSBOLead) => {
    setImportingLeads(prev => new Set(prev).add(lead.id));

    try {
      const response = await fetch('/api/real-estate/fsbo-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, action: 'import' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportedLeads(prev => new Set(prev).add(lead.id));
      toast({
        title: 'Lead Imported',
        description: 'Lead has been added to your CRM',
      });
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImportingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(lead.id);
        return newSet;
      });
    }
  };

  // Handle manual lead submission
  const handleManualSubmit = async () => {
    if (!manualLead.sellerName && !manualLead.sellerPhone && !manualLead.sellerEmail) {
      toast({
        title: 'Missing Contact Info',
        description: 'Please enter at least one contact method',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/real-estate/manual-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            ...manualLead,
            price: parseFloat(manualLead.price) || null,
            beds: parseInt(manualLead.beds) || null,
            baths: parseInt(manualLead.baths) || null,
            sqft: parseInt(manualLead.sqft) || null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      toast({
        title: 'Lead Imported',
        description: 'Manual lead has been added to your CRM',
      });

      // Reset form
      setManualLead({
        sellerName: '',
        sellerPhone: '',
        sellerEmail: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        price: '',
        beds: '',
        baths: '',
        sqft: '',
        propertyType: 'single-family',
        url: '',
        notes: '',
        source: 'Manual',
      });
      setShowManualImport(false);
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/real-estate/manual-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      toast({
        title: 'CSV Imported',
        description: `Imported ${data.imported} leads (${data.failed} failed)`,
      });

      setCsvFile(null);
      setShowManualImport(false);
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Format price
  const formatPrice = (price: number | null) => {
    if (!price) return 'Price N/A';
    if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
    return `$${price.toLocaleString()}`;
  };

  // Get source color
  const getSourceColor = (sourceId: string) => {
    return FSBO_SOURCES.find(s => s.id === sourceId)?.color || '#6b7280';
  };

  // Get source logo
  const getSourceLogo = (sourceId: string) => {
    return FSBO_SOURCES.find(s => s.id === sourceId)?.logo || '🏠';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="h-6 w-6 text-blue-400" />
            FSBO Lead Finder
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Search for-sale-by-owner listings across multiple platforms
          </p>
        </div>
        <Button
          onClick={() => setShowManualImport(true)}
          variant="outline"
          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Manual Import
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="search" className="data-[state=active]:bg-blue-600">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-blue-600">
            <Home className="h-4 w-4 mr-2" />
            Results ({results.length})
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-6">
          <div className="space-y-6">
            {/* Source Selection */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-400" />
                Select Source(s)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {FSBO_SOURCES.map(source => (
                  <button
                    key={source.id}
                    onClick={() => toggleSource(source.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedSources.includes(source.id)
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{source.logo}</span>
                      <span className="font-medium text-white text-sm">{source.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{source.country}</span>
                    {selectedSources.includes(source.id) && (
                      <Check className="h-4 w-4 text-blue-400 absolute top-2 right-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-400" />
                Location
              </h3>
              <LocationSearch
                value={location?.formatted || ''}
                onChange={(loc) => setLocation(loc)}
                placeholder="Search city or address..."
                countryRestriction={getCountryCodes()}
              />
              {location && (
                <div className="mt-2 text-sm text-slate-400">
                  Searching in: {location.city}, {location.state}, {location.country}
                </div>
              )}
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Property Filters</span>
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-6"
                >
                  {/* Property Type */}
                  <div>
                    <Label className="text-white mb-3 block">Property Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {PROPERTY_TYPES.map(type => (
                        <button
                          key={type.id}
                          onClick={() => togglePropertyType(type.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                            filters.propertyTypes?.includes(type.id)
                              ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white mb-2 block">Min Price</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice || ''}
                        onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) || undefined })}
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">Max Price</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice || ''}
                        onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) || undefined })}
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  {/* Beds/Baths */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white mb-2 block">Min Bedrooms</Label>
                      <Select
                        value={String(filters.minBeds || 'any')}
                        onValueChange={(v) => setFilters({ ...filters, minBeds: v === 'any' ? undefined : parseInt(v) })}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white mb-2 block">Min Bathrooms</Label>
                      <Select
                        value={String(filters.minBaths || 'any')}
                        onValueChange={(v) => setFilters({ ...filters, minBaths: v === 'any' ? undefined : parseInt(v) })}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {[1, 2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <Label className="text-white mb-3 block">Must Have</Label>
                    <div className="flex flex-wrap gap-2">
                      {AMENITIES.map(amenity => (
                        <button
                          key={amenity.id}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                            filters.amenities?.includes(amenity.id)
                              ? 'border-green-500 bg-green-500/20 text-green-400'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span>{amenity.icon}</span>
                          {amenity.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isSearching || selectedSources.length === 0 || !location}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-6 text-lg font-semibold"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Searching {selectedSources.length} sources...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Find FSBO Leads
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-6">
          {results.length === 0 ? (
            <div className="text-center py-16">
              <Home className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Results Yet</h3>
              <p className="text-slate-400">Search for FSBO leads to see results here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Results Summary */}
              <div className="flex items-center justify-between">
                <p className="text-slate-400">
                  Found <span className="text-white font-semibold">{results.length}</span> leads
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-400"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Errors */}
              {searchErrors.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Some sources had issues:</span>
                  </div>
                  <ul className="text-sm text-yellow-400/80 space-y-1">
                    {searchErrors.map((err, i) => (
                      <li key={i}>• {err.source}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(lead => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-blue-500/50 transition-all group"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-slate-900">
                      {lead.photos && lead.photos.length > 0 ? (
                        <img
                          src={lead.photos[0]}
                          alt={lead.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-property.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-slate-700" />
                        </div>
                      )}
                      {/* Source Badge */}
                      <div
                        className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: getSourceColor(lead.source) }}
                      >
                        {getSourceLogo(lead.source)} {FSBO_SOURCES.find(s => s.id === lead.source)?.name || lead.source}
                      </div>
                      {/* Lead Score */}
                      <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="text-white">{lead.leadScore}</span>
                      </div>
                      {/* Photo count */}
                      {lead.photos && lead.photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                          +{lead.photos.length - 1} photos
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Price */}
                      <div className="text-2xl font-bold text-white">
                        {formatPrice(lead.price)}
                      </div>

                      {/* Address */}
                      <div className="text-slate-400 text-sm">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {lead.address || `${lead.city}, ${lead.state}`}
                      </div>

                      {/* Property Details */}
                      <div className="flex items-center gap-4 text-sm">
                        {lead.beds && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Bed className="h-4 w-4 text-slate-500" />
                            {lead.beds} bd
                          </span>
                        )}
                        {lead.baths && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Bath className="h-4 w-4 text-slate-500" />
                            {lead.baths} ba
                          </span>
                        )}
                        {lead.sqft && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Maximize className="h-4 w-4 text-slate-500" />
                            {lead.sqft.toLocaleString()} sqft
                          </span>
                        )}
                      </div>

                      {/* Seller Contact */}
                      {(lead.sellerName || lead.sellerPhone) && (
                        <div className="bg-slate-900/50 rounded-lg p-3 space-y-1">
                          {lead.sellerName && (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-green-400" />
                              <span className="text-white">{lead.sellerName}</span>
                            </div>
                          )}
                          {lead.sellerPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-blue-400" />
                              <a href={`tel:${lead.sellerPhone}`} className="text-blue-400 hover:underline">
                                {lead.sellerPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-500"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowLeadDetail(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-500 text-green-400 hover:bg-green-500/20"
                          onClick={() => importLead(lead)}
                          disabled={importingLeads.has(lead.id) || importedLeads.has(lead.id)}
                        >
                          {importingLeads.has(lead.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : importedLeads.has(lead.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Import className="h-4 w-4" />
                          )}
                          <span className="ml-1">
                            {importedLeads.has(lead.id) ? 'Imported' : 'Import'}
                          </span>
                        </Button>
                        {lead.url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white"
                            onClick={() => window.open(lead.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{formatPrice(selectedLead.price)}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {selectedLead.address || `${selectedLead.city}, ${selectedLead.state} ${selectedLead.zipCode}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Photos */}
                {selectedLead.photos && selectedLead.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedLead.photos.slice(0, 4).map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={`Property ${i + 1}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <Bed className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                    <div className="text-lg font-semibold">{selectedLead.beds || 'N/A'}</div>
                    <div className="text-xs text-slate-400">Bedrooms</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <Bath className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                    <div className="text-lg font-semibold">{selectedLead.baths || 'N/A'}</div>
                    <div className="text-xs text-slate-400">Bathrooms</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <Maximize className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                    <div className="text-lg font-semibold">{selectedLead.sqft?.toLocaleString() || 'N/A'}</div>
                    <div className="text-xs text-slate-400">Sq Ft</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <Calendar className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                    <div className="text-lg font-semibold">{selectedLead.yearBuilt || 'N/A'}</div>
                    <div className="text-xs text-slate-400">Year Built</div>
                  </div>
                </div>

                {/* Seller Contact */}
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Seller Contact Information
                  </h4>
                  <div className="space-y-2">
                    {selectedLead.sellerName && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{selectedLead.sellerName}</span>
                      </div>
                    )}
                    {selectedLead.sellerPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <a href={`tel:${selectedLead.sellerPhone}`} className="text-blue-400 hover:underline">
                          {selectedLead.sellerPhone}
                        </a>
                      </div>
                    )}
                    {selectedLead.sellerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <a href={`mailto:${selectedLead.sellerEmail}`} className="text-blue-400 hover:underline">
                          {selectedLead.sellerEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedLead.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-slate-400 text-sm">{selectedLead.description}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedLead.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original Listing
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-500"
                  onClick={() => {
                    importLead(selectedLead);
                    setShowLeadDetail(false);
                  }}
                  disabled={importedLeads.has(selectedLead.id)}
                >
                  {importedLeads.has(selectedLead.id) ? (
                    <><Check className="h-4 w-4 mr-2" /> Imported</>
                  ) : (
                    <><Import className="h-4 w-4 mr-2" /> Import to CRM</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Import Dialog */}
      <Dialog open={showManualImport} onOpenChange={setShowManualImport}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-400" />
              Manual Lead Import
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a lead manually or import from CSV file
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="mt-4">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              {/* Seller Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Seller Name</Label>
                  <Input
                    value={manualLead.sellerName}
                    onChange={(e) => setManualLead({ ...manualLead, sellerName: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label className="text-white">Phone</Label>
                  <Input
                    value={manualLead.sellerPhone}
                    onChange={(e) => setManualLead({ ...manualLead, sellerPhone: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Email</Label>
                <Input
                  value={manualLead.sellerEmail}
                  onChange={(e) => setManualLead({ ...manualLead, sellerEmail: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="seller@email.com"
                />
              </div>

              {/* Property Info */}
              <div>
                <Label className="text-white">Property Address</Label>
                <Input
                  value={manualLead.address}
                  onChange={(e) => setManualLead({ ...manualLead, address: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">City</Label>
                  <Input
                    value={manualLead.city}
                    onChange={(e) => setManualLead({ ...manualLead, city: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">State/Province</Label>
                  <Input
                    value={manualLead.state}
                    onChange={(e) => setManualLead({ ...manualLead, state: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">ZIP/Postal Code</Label>
                  <Input
                    value={manualLead.zipCode}
                    onChange={(e) => setManualLead({ ...manualLead, zipCode: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-white">Price</Label>
                  <Input
                    type="number"
                    value={manualLead.price}
                    onChange={(e) => setManualLead({ ...manualLead, price: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label className="text-white">Beds</Label>
                  <Input
                    type="number"
                    value={manualLead.beds}
                    onChange={(e) => setManualLead({ ...manualLead, beds: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">Baths</Label>
                  <Input
                    type="number"
                    value={manualLead.baths}
                    onChange={(e) => setManualLead({ ...manualLead, baths: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">Sq Ft</Label>
                  <Input
                    type="number"
                    value={manualLead.sqft}
                    onChange={(e) => setManualLead({ ...manualLead, sqft: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Listing URL (optional)</Label>
                <Input
                  value={manualLead.url}
                  onChange={(e) => setManualLead({ ...manualLead, url: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label className="text-white">Notes</Label>
                <Textarea
                  value={manualLead.notes}
                  onChange={(e) => setManualLead({ ...manualLead, notes: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  rows={3}
                  placeholder="Additional notes about the property or seller..."
                />
              </div>

              <Button
                onClick={handleManualSubmit}
                disabled={isImporting}
                className="w-full bg-green-600 hover:bg-green-500"
              >
                {isImporting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                ) : (
                  <><Import className="h-4 w-4 mr-2" /> Import Lead to CRM</>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4 mt-4">
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-white mb-2">Upload CSV File</p>
                <p className="text-sm text-slate-400 mb-4">
                  CSV should include columns: seller_name, phone, email, address, city, state, price, beds, baths, url
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </label>
                {csvFile && (
                  <div className="mt-4 text-green-400">
                    Selected: {csvFile.name}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCsvUpload}
                disabled={isImporting || !csvFile}
                className="w-full bg-green-600 hover:bg-green-500"
              >
                {isImporting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Upload & Import</>
                )}
              </Button>

              {/* CSV Template Download */}
              <div className="text-center">
                <button
                  onClick={() => {
                    const template = 'seller_name,phone,email,address,city,state,zip_code,price,beds,baths,sqft,property_type,url,source\nJohn Doe,(555) 123-4567,john@email.com,123 Main St,Montreal,QC,H1A1A1,500000,3,2,1500,House,https://duproprio.com/listing123,DuProprio';
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fsbo_leads_template.csv';
                    a.click();
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Download CSV Template
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
