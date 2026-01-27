'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Home,
  Phone,
  MapPin,
  Filter,
  Plus,
  Target,
  User,
  Check,
  X,
  AlertCircle,
  Loader2,
  Play,
  Globe,
  DollarSign,
  Droplets,
  Ruler,
  Building2,
  BedDouble,
  Bath,
  TreePine,
  Car,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { LocationSearch, LocationData } from '@/components/ui/location-search';


// FSBO Source configurations with country mappings
interface FSBOSourceConfig {
  name: string;
  countries: string[];
  countryNames: string[];
  description: string;
}

const FSBO_SOURCES: Record<string, FSBOSourceConfig> = {
  duproprio: {
    name: 'DuProprio',
    countries: ['CA'],
    countryNames: ['Canada'],
    description: 'Quebec & Canada FSBO listings',
  },
  fsbo: {
    name: 'FSBO.com',
    countries: ['US'],
    countryNames: ['United States'],
    description: 'US nationwide FSBO listings',
  },
  zillow_fsbo: {
    name: 'Zillow FSBO',
    countries: ['US'],
    countryNames: ['United States'],
    description: 'Zillow For Sale By Owner listings',
  },
  forsalebyowner: {
    name: 'ForSaleByOwner.com',
    countries: ['US'],
    countryNames: ['United States'],
    description: 'US FSBO marketplace',
  },
  kijiji: {
    name: 'Kijiji Real Estate',
    countries: ['CA'],
    countryNames: ['Canada'],
    description: 'Canadian classifieds real estate',
  },
  craigslist: {
    name: 'Craigslist',
    countries: ['US', 'CA'],
    countryNames: ['United States', 'Canada'],
    description: 'US & Canada classifieds',
  },
  purplebricks: {
    name: 'Purplebricks',
    countries: ['GB', 'CA'],
    countryNames: ['United Kingdom', 'Canada'],
    description: 'UK & Canada hybrid agent',
  },
  rightmove: {
    name: 'Rightmove',
    countries: ['GB'],
    countryNames: ['United Kingdom'],
    description: 'UK property listings',
  },
};

// Property types
const PROPERTY_TYPES = [
  { id: 'single_family', label: 'Single Family', icon: Home },
  { id: 'condo', label: 'Condo/Apartment', icon: Building2 },
  { id: 'townhouse', label: 'Townhouse', icon: Home },
  { id: 'multi_family', label: 'Multi-Family', icon: Building2 },
  { id: 'land', label: 'Land/Lot', icon: TreePine },
  { id: 'commercial', label: 'Commercial', icon: Building2 },
];

// Amenities
const AMENITIES = [
  { id: 'pool', label: 'Pool', icon: Droplets },
  { id: 'garage', label: 'Garage', icon: Car },
  { id: 'basement', label: 'Basement', icon: Home },
  { id: 'waterfront', label: 'Waterfront', icon: Droplets },
  { id: 'acreage', label: 'Acreage', icon: TreePine },
];

interface FSBOLead {
  id: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  propertyType?: string;
  daysOnMarket: number;
  isStale?: boolean;
  firstSeenAt?: string;
  lastSeenAt?: string;
  source: string;
  sellerName?: string | null;
  phone?: string | null;
  email?: string | null;
  dncStatus?: 'clear' | 'blocked' | 'unknown';
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  photos?: string[];
  listingUrl?: string;
  description?: string;
  notes?: string;
  contactAttempts?: number;
  lastContactedAt?: string;
}


interface SearchFilters {
  location: LocationData | null;
  sources: string[];
  propertyTypes: string[];
  priceMin: number;
  priceMax: number;
  bedsMin: number;
  bathsMin: number;
  sqftMin: number;
  sqftMax: number;
  amenities: string[];
  daysOnMarketMax: number;
}

interface FSBOLeadsWidgetProps {
  expanded?: boolean;
}

export function FSBOLeadsWidget({ expanded = false }: FSBOLeadsWidgetProps) {
  const [leads, setLeads] = useState<FSBOLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isEnriching, setIsEnriching] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [staleFilter, setStaleFilter] = useState<'all' | 'stale' | 'fresh'>('all');
  const [showNewScrapeDialog, setShowNewScrapeDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [summary, setSummary] = useState<{ total: number; stale: number; withContact: number; newToday: number } | null>(null);
  const [staleDaysThreshold, setStaleDaysThreshold] = useState(21); // Default from settings
  
  const [filters, setFilters] = useState<SearchFilters>({
    location: null,
    sources: [],
    propertyTypes: [],
    priceMin: 0,
    priceMax: 5000000,
    bedsMin: 0,
    bathsMin: 0,
    sqftMin: 0,
    sqftMax: 10000,
    amenities: [],
    daysOnMarketMax: 365,
  });

  const [sourceValidationError, setSourceValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/real-estate/fsbo');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        setSummary(data.summary || null);
        // Get stale days threshold from settings (default 21)
        if (data.settings?.staleDaysThreshold) {
          setStaleDaysThreshold(data.settings.staleDaysThreshold);
        }
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error('Error fetching FSBO leads:', error);
      // No sample data - show empty state
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enrich a single listing to get contact info (async with polling)
  const enrichListing = async (listingId: string) => {
    setIsEnriching(listingId);
    try {
      // Start the browser automation job
      const response = await fetch('/api/real-estate/fsbo/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds: [listingId] }),
      });

      if (!response.ok) throw new Error('Failed to start contact extraction');

      const result = await response.json();
      
      if (!result.success || !result.jobId) {
        toast.error(result.error || 'Failed to start extraction');
        setIsEnriching(null);
        return;
      }

      toast.info('Extracting contact... This takes 30-60 seconds');

      // Poll for completion
      const jobId = result.jobId;
      let attempts = 0;
      const maxAttempts = 30; // 2.5 minutes max

      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const statusRes = await fetch('/api/real-estate/fsbo/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_status', jobId }),
          });

          const status = await statusRes.json();

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            if (status.phone) {
              toast.success(`Phone found: ${status.phone}`);
              fetchLeads(); // Refresh to show new data
            } else {
              toast.warning(status.message || 'Could not extract phone number');
            }
            setIsEnriching(null);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            toast.error(status.error || 'Contact extraction failed');
            setIsEnriching(null);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            toast.warning('Extraction timed out. Try again or visit the listing directly.');
            setIsEnriching(null);
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 5000); // Poll every 5 seconds

    } catch (error) {
      toast.error('Failed to start contact extraction');
      setIsEnriching(null);
    }
  };

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Validate sources against selected country
  const validateSourcesForCountry = (countryCode: string, sources: string[]) => {
    if (!countryCode || sources.length === 0) {
      setSourceValidationError(null);
      return true;
    }

    const invalidSources = sources.filter(sourceKey => {
      const source = FSBO_SOURCES[sourceKey];
      return source && !source.countries.includes(countryCode);
    });

    if (invalidSources.length > 0) {
      const names = invalidSources.map(key => FSBO_SOURCES[key]?.name).join(', ');
      setSourceValidationError(`${names} does not operate in ${filters.location?.country || countryCode}`);
      return false;
    }
    
    setSourceValidationError(null);
    return true;
  };

  // Handle source toggle
  const handleSourceToggle = (sourceKey: string) => {
    const isSelected = filters.sources.includes(sourceKey);
    let newSources: string[];

    if (isSelected) {
      // Always allow deselection
      newSources = filters.sources.filter(s => s !== sourceKey);
    } else {
      newSources = [...filters.sources, sourceKey];
    }

    setFilters(prev => ({ ...prev, sources: newSources }));

    // Validate if location is set
    if (filters.location?.countryCode) {
      validateSourcesForCountry(filters.location.countryCode, newSources);
    }
  };

  // Handle location change
  const handleLocationChange = (location: LocationData | null) => {
    setFilters(prev => ({ ...prev, location }));
    
    if (location?.countryCode) {
      validateSourcesForCountry(location.countryCode, filters.sources);
    } else {
      setSourceValidationError(null);
    }
  };

  // Get country restriction based on selected sources
  const getCountryRestriction = (): string[] | undefined => {
    if (filters.sources.length === 0) return undefined;
    
    // Get intersection of all countries from selected sources
    const countries = filters.sources.reduce((acc, sourceKey) => {
      const source = FSBO_SOURCES[sourceKey];
      if (!source) return acc;
      if (acc.length === 0) return source.countries;
      return acc.filter(c => source.countries.includes(c));
    }, [] as string[]);

    return countries.length > 0 ? countries : undefined;
  };

  const startScraping = async () => {
    if (!filters.location) {
      toast.error('Please select a location');
      return;
    }

    if (filters.sources.length === 0) {
      toast.error('Please select at least one source');
      return;
    }

    if (sourceValidationError) {
      toast.error(sourceValidationError);
      return;
    }

    setIsScraping(true);
    setShowNewScrapeDialog(false);

    try {
      const response = await fetch('/api/real-estate/fsbo/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!response.ok) throw new Error('Scraping failed');

      const result = await response.json();
      
      // If we have pending jobs, start polling
      if (result.status === 'started' && result.jobs?.length > 0) {
        toast.success(`Searching ${filters.location.city}... This takes 2-3 minutes.`);
        
        // Poll for job completion
        const jobId = result.jobs[0].jobId;
        let attempts = 0;
        const maxAttempts = 36; // 3 minutes max (every 5 seconds)
        
        const pollForResults = async () => {
          attempts++;
          
          try {
            const statusResponse = await fetch('/api/real-estate/fsbo/scrape', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'check_status', jobId }),
            });
            
            const statusResult = await statusResponse.json();
            
            if (statusResult.status === 'completed') {
              toast.success(`Found ${statusResult.listingsFound} FSBO listings!`);
              fetchLeads();
              setIsScraping(false);
              return;
            }
            
            if (statusResult.status === 'failed') {
              toast.error(statusResult.error || 'Scraping failed');
              setIsScraping(false);
              return;
            }
            
            // Still running - show progress
            if (statusResult.progress) {
              toast.info(statusResult.progress, { id: 'scrape-progress' });
            }
            
            // Continue polling
            if (attempts < maxAttempts) {
              setTimeout(pollForResults, 5000);
            } else {
              toast.error('Scraping is taking longer than expected. Results will appear when ready.');
              setIsScraping(false);
            }
          } catch (error) {
            console.error('Poll error:', error);
            if (attempts < maxAttempts) {
              setTimeout(pollForResults, 5000);
            } else {
              setIsScraping(false);
            }
          }
        };
        
        // Start polling after 10 seconds (give Apify time to start)
        setTimeout(pollForResults, 10000);
      } else {
        // Immediate result (non-async sources)
        toast.success(`Search complete!`);
        fetchLeads();
        setIsScraping(false);
      }
    } catch (error) {
      toast.error(`Failed to search FSBO leads. Please try again.`);
      setIsScraping(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      location: null,
      sources: [],
      propertyTypes: [],
      priceMin: 0,
      priceMax: 5000000,
      bedsMin: 0,
      bathsMin: 0,
      sqftMin: 0,
      sqftMax: 10000,
      amenities: [],
      daysOnMarketMax: 365,
    });
    setSourceValidationError(null);
  };

  const convertToLead = async (fsboLead: FSBOLead) => {
    try {
      const response = await fetch('/api/real-estate/fsbo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'convert',
          listingId: fsboLead.id,
        }),
      });

      if (!response.ok) throw new Error('Conversion failed');

      toast.success(`${fsboLead.sellerName || 'Lead'} added to CRM!`);
      fetchLeads();
    } catch (error) {
      toast.error(`Failed to add lead to CRM`);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.sellerName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesSource = sourceFilter === 'all' || lead.source.toLowerCase().includes(sourceFilter.toLowerCase());
    const isLeadStale = lead.isStale || (lead.daysOnMarket || 0) >= staleDaysThreshold;
    const matchesStale = staleFilter === 'all' || 
      (staleFilter === 'stale' && isLeadStale) ||
      (staleFilter === 'fresh' && !isLeadStale);
    return matchesSearch && matchesSource && matchesStale;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'contacted': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'qualified': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'converted': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getDNCColor = (status?: string) => {
    switch (status) {
      case 'clear': return 'text-emerald-400';
      case 'blocked': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const formatPrice = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              FSBO Leads
              {leads.length > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-2">
                  {leads.filter(l => l.status === 'new').length} new
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-3">
              {expanded && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-800/50 border-slate-700 text-white w-48"
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-36 bg-slate-800/50 border-slate-700 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="duproprio">DuProprio</SelectItem>
                      <SelectItem value="fsbo">FSBO.com</SelectItem>
                      <SelectItem value="zillow">Zillow FSBO</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={staleFilter} onValueChange={(v) => setStaleFilter(v as 'all' | 'stale' | 'fresh')}>
                    <SelectTrigger className="w-36 bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue placeholder="Age" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Listings</SelectItem>
                      <SelectItem value="stale">🔥 Stale (≥{staleDaysThreshold}d)</SelectItem>
                      <SelectItem value="fresh">Fresh (&lt;{staleDaysThreshold}d)</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {summary && (
                <div className="hidden lg:flex items-center gap-3 text-xs">
                  <span className="text-slate-500">
                    {summary.total} total
                  </span>
                  {summary.stale > 0 && (
                    <span className="text-amber-400">
                      {summary.stale} stale
                    </span>
                  )}
                  <span className="text-emerald-400">
                    {summary.withContact} with contact
                  </span>
                </div>
              )}
              <Dialog open={showNewScrapeDialog} onOpenChange={setShowNewScrapeDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={isScraping}
                    onClick={() => {
                      resetFilters();
                      setShowNewScrapeDialog(true);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Find Leads
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-950 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Find FSBO Leads
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 pt-4">
                    {/* Source Selection */}
                    <div>
                      <Label className="text-slate-300 flex items-center gap-2 mb-3">
                        <Globe className="w-4 h-4" />
                        Select Source(s)
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(FSBO_SOURCES).map(([key, source]) => {
                          const isSelected = filters.sources.includes(key);
                          const isDisabled = filters.location?.countryCode 
                            ? !source.countries.includes(filters.location.countryCode) 
                            : false;
                          
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleSourceToggle(key)}
                              disabled={isDisabled}
                              className={`p-2 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? 'bg-blue-500/20 border-blue-500 text-white'
                                  : isDisabled
                                  ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-xs">{source.name}</span>
                                {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {source.countryNames.join(', ')}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {filters.sources.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          🌍 Searching in: <span className="text-blue-400">
                            {[...new Set(filters.sources.flatMap(s => FSBO_SOURCES[s]?.countryNames || []))].join(', ')}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Location Search */}
                    <div>
                      <Label className="text-slate-300 flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4" />
                        Location
                        {filters.location && (
                          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                            {filters.location.country}
                          </Badge>
                        )}
                      </Label>
                      <LocationSearch
                        value={filters.location?.formatted || ''}
                        onChange={handleLocationChange}
                        placeholder={filters.sources.length > 0 
                          ? "Search cities..." 
                          : "Select source(s) first, or search any city..."
                        }
                        countryRestriction={getCountryRestriction()}
                      />
                      {filters.location && (
                        <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-700">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-white">{filters.location.city}</span>
                            {filters.location.state && (
                              <span className="text-slate-400">, {filters.location.state}</span>
                            )}
                            <span className="text-slate-500">• {filters.location.country}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Property Filters */}
                    <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-slate-300 hover:text-white">
                          <span className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Property Filters
                          </span>
                          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        {/* Property Types */}
                        <div>
                          <Label className="text-slate-400 text-xs mb-2 block">Property Type</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {PROPERTY_TYPES.map(type => {
                              const Icon = type.icon;
                              const isSelected = filters.propertyTypes.includes(type.id);
                              return (
                                <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => {
                                    setFilters(prev => ({
                                      ...prev,
                                      propertyTypes: isSelected
                                        ? prev.propertyTypes.filter(t => t !== type.id)
                                        : [...prev.propertyTypes, type.id]
                                    }));
                                  }}
                                  className={`p-2 rounded border flex items-center gap-2 text-xs transition-all ${
                                    isSelected
                                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                  }`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {type.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Price Range */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-slate-400 text-xs">Price Range</Label>
                            <span className="text-xs text-blue-400">
                              {formatPrice(filters.priceMin)} - {formatPrice(filters.priceMax)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Input
                                type="number"
                                placeholder="Min"
                                value={filters.priceMin || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, priceMin: parseInt(e.target.value) || 0 }))}
                                className="bg-slate-900 border-slate-700 text-white text-sm"
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                placeholder="Max"
                                value={filters.priceMax || ''}
                                onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) || 5000000 }))}
                                className="bg-slate-900 border-slate-700 text-white text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Beds & Baths */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-slate-400 text-xs mb-2 block">Min Beds</Label>
                            <Select 
                              value={filters.bedsMin.toString()} 
                              onValueChange={(v) => setFilters(prev => ({ ...prev, bedsMin: parseInt(v) }))}
                            >
                              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                <BedDouble className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                                  <SelectItem key={n} value={n.toString()}>
                                    {n === 0 ? 'Any' : `${n}+`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-slate-400 text-xs mb-2 block">Min Baths</Label>
                            <Select 
                              value={filters.bathsMin.toString()} 
                              onValueChange={(v) => setFilters(prev => ({ ...prev, bathsMin: parseInt(v) }))}
                            >
                              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                <Bath className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 1, 2, 3, 4, 5].map(n => (
                                  <SelectItem key={n} value={n.toString()}>
                                    {n === 0 ? 'Any' : `${n}+`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Square Footage */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-slate-400 text-xs flex items-center gap-1">
                              <Ruler className="w-3 h-3" />
                              Square Footage
                            </Label>
                            <span className="text-xs text-blue-400">
                              {(filters.sqftMin || 0).toLocaleString()} - {(filters.sqftMax || 10000).toLocaleString()} sqft
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              type="number"
                              placeholder="Min sqft"
                              value={filters.sqftMin || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, sqftMin: parseInt(e.target.value) || 0 }))}
                              className="bg-slate-900 border-slate-700 text-white text-sm"
                            />
                            <Input
                              type="number"
                              placeholder="Max sqft"
                              value={filters.sqftMax || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, sqftMax: parseInt(e.target.value) || 10000 }))}
                              className="bg-slate-900 border-slate-700 text-white text-sm"
                            />
                          </div>
                        </div>

                        {/* Amenities */}
                        <div>
                          <Label className="text-slate-400 text-xs mb-2 block">Must Have</Label>
                          <div className="flex flex-wrap gap-2">
                            {AMENITIES.map(amenity => {
                              const Icon = amenity.icon;
                              const isSelected = filters.amenities.includes(amenity.id);
                              return (
                                <button
                                  key={amenity.id}
                                  type="button"
                                  onClick={() => {
                                    setFilters(prev => ({
                                      ...prev,
                                      amenities: isSelected
                                        ? prev.amenities.filter(a => a !== amenity.id)
                                        : [...prev.amenities, amenity.id]
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-xs transition-all ${
                                    isSelected
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                  }`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {amenity.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Days on Market */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-slate-400 text-xs">Max Days on Market</Label>
                            <span className="text-xs text-amber-400">{filters.daysOnMarketMax} days</span>
                          </div>
                          <Slider
                            value={[filters.daysOnMarketMax]}
                            onValueChange={([v]) => setFilters(prev => ({ ...prev, daysOnMarketMax: v }))}
                            max={365}
                            min={7}
                            step={7}
                            className="w-full"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>1 week</span>
                            <span>1 year</span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Validation Error */}
                    {sourceValidationError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-red-400 text-sm">{sourceValidationError}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="border-slate-700 text-slate-400 hover:text-white"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={startScraping}
                        disabled={!filters.location || filters.sources.length === 0 || !!sourceValidationError}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Find FSBO Leads {filters.location ? `in ${filters.location.city}` : ''}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className={expanded ? 'h-[600px]' : 'h-[300px]'}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                <p className="text-slate-400">No FSBO leads found</p>
                <p className="text-slate-500 text-sm">Start a search to find new leads</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead) => {
                  const isStale = lead.isStale || (lead.daysOnMarket || 0) >= staleDaysThreshold;
                  const hasContact = lead.phone || lead.email;
                  
                  return (
                    <div
                      key={lead.id}
                      className={`p-4 rounded-lg bg-slate-800/50 border transition-colors ${
                        isStale 
                          ? 'border-amber-500/30 hover:border-amber-500/50' 
                          : 'border-slate-700/50 hover:border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-white font-medium">{lead.address}</h4>
                            <Badge className={getStatusColor(lead.status)}>
                              {lead.status}
                            </Badge>
                            {isStale && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                🔥 Stale ({lead.daysOnMarket}d)
                              </Badge>
                            )}
                            {!hasContact && (
                              <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/30">
                                No Contact
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm">
                            {lead.city}, {lead.state} · {lead.source}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                            <span className="text-emerald-400 font-medium">
                              ${(lead.price || 0).toLocaleString()}
                            </span>
                            <span className="text-slate-400">
                              {lead.beds || 0} bed · {lead.baths || 0} bath · {(lead.sqft || 0).toLocaleString()} sqft
                            </span>
                            <span className={isStale ? 'text-amber-400' : 'text-slate-400'}>
                              📅 Listed: {formatDate(lead.firstSeenAt)} ({lead.daysOnMarket || 0} days)
                            </span>
                          </div>
                          
                          {/* Contact Info Section */}
                          <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                            {lead.sellerName && (
                              <span className="text-slate-300 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {lead.sellerName}
                              </span>
                            )}
                            {lead.phone ? (
                              <a 
                                href={`tel:${lead.phone}`}
                                className={`flex items-center gap-1 hover:underline ${getDNCColor(lead.dncStatus)}`}
                              >
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                                {lead.dncStatus === 'blocked' && (
                                  <span className="text-xs text-red-400">(DNC)</span>
                                )}
                              </a>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1 italic">
                                <Phone className="w-3 h-3" />
                                No phone number
                              </span>
                            )}
                            {lead.email && (
                              <a 
                                href={`mailto:${lead.email}`}
                                className="text-blue-400 hover:underline"
                              >
                                {lead.email}
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* View on source site */}
                          {lead.listingUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="border-slate-600 text-slate-400 hover:text-white"
                            >
                              <a href={lead.listingUrl} target="_blank" rel="noopener noreferrer">
                                <Globe className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          
                          {/* Enrich contact button if no phone */}
                          {!lead.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => enrichListing(lead.id)}
                              disabled={isEnriching === lead.id}
                              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                            >
                              {isEnriching === lead.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Search className="w-4 h-4 mr-1" />
                                  Get Contact
                                </>
                              )}
                            </Button>
                          )}
                          
                          {/* Call button if phone exists */}
                          {lead.phone && lead.dncStatus !== 'blocked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            >
                              <a href={`tel:${lead.phone}`}>
                                <Phone className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            onClick={() => convertToLead(lead)}
                            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to CRM
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    
  );
}
