'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  ExternalLink,
  Loader2,
  FileText,
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlaceAutocomplete, type PlaceData } from '@/components/ui/place-autocomplete';

interface Website {
  id: string;
  name: string;
  type: string;
  templateType?: string;
  vercelDeploymentUrl?: string;
  status: string;
}

function normalizeSiteOrigin(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(withProtocol);
    // Always use origin only (drop any accidental /index.html or nested path)
    return parsed.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

interface Comparable {
  address: string;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  status: string;
  area: number | null;
}

interface EvaluationResult {
  estimatedValue: number;
  comparables: Comparable[];
  address: string;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  usedRegionalFallback?: boolean;
}

interface EvaluationLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  estimatedValue: number | null;
  comparablesCount: number;
  status: string;
  createdAt: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Broker Evaluation Form ────────────────────────────────────────

function BrokerEvaluationForm() {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [propertyType, setPropertyType] = useState('house');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [postalCode, setPostalCode] = useState('');
  const [subjectLat, setSubjectLat] = useState<number | undefined>();
  const [subjectLng, setSubjectLng] = useState<number | undefined>();

  const handleAddressSelect = (value: string, data?: PlaceData) => {
    setAddress(value);
    if (data?.city) setCity(data.city);
    if (data?.zip) setPostalCode(data.zip);
    else setPostalCode('');
    setSubjectLat(data?.lat);
    setSubjectLng(data?.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/real-estate/property-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          city: city.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          latitude: subjectLat,
          longitude: subjectLng,
          bedrooms: bedrooms || undefined,
          bathrooms: bathrooms || undefined,
          propertyType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Evaluation failed');
        return;
      }
      setResult(data.evaluation);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAddress('');
    setCity('');
    setPostalCode('');
    setSubjectLat(undefined);
    setSubjectLng(undefined);
    setBedrooms('');
    setBathrooms('');
    setPropertyType('house');
    setResult(null);
    setError(null);
  };

  return (
    <Card className="bg-card border border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">Run Property Evaluation</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter property details to get an instant market estimate based on comparable sales.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">
                Property Address *
              </label>
              <PlaceAutocomplete
                value={address}
                onChange={handleAddressSelect}
                placeholder="Search address (e.g. 123 Main St, Montreal)"
                types="address"
                className="bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">City</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Montreal"
                className="bg-muted border-input text-foreground placeholder:text-muted-foreground h-10"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Beds</label>
                <Input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="3"
                  className="bg-muted border-input text-foreground placeholder:text-muted-foreground h-10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Baths</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="2"
                  className="bg-muted border-input text-foreground placeholder:text-muted-foreground h-10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full h-10 border border-input rounded-md px-3 text-foreground bg-muted text-sm"
                >
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="apartment">Apartment</option>
                  <option value="townhouse">Townhouse</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !address.trim()}
              className="w-full h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Run Evaluation
                </>
              )}
            </Button>
          </form>
        ) : (
          <EvaluationResultDisplay result={result} onReset={handleReset} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Evaluation Result Display ─────────────────────────────────────

function EvaluationResultDisplay({
  result,
  onReset,
}: {
  result: EvaluationResult;
  onReset: () => void;
}) {
  const [showComparables, setShowComparables] = useState(false);

  return (
    <div className="space-y-4">
      {/* Value card */}
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Estimated Market Value</span>
          {result.usedRegionalFallback && (
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
              Regional Estimate
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold text-foreground">
          {result.estimatedValue > 0 ? formatCurrency(result.estimatedValue) : 'Contact for appraisal'}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {result.address}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {result.bedrooms != null && <span>{result.bedrooms} bed</span>}
          {result.bathrooms != null && <span>{result.bathrooms} bath</span>}
          <span className="capitalize">{result.propertyType}</span>
          {result.city && <span>{result.city}</span>}
        </div>
      </div>

      {result.usedRegionalFallback && (
        <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            No direct comparables found. This estimate is based on regional market statistics from Centris.
            For a more accurate valuation, a personalized CMA is recommended.
          </span>
        </div>
      )}

      {/* Comparables */}
      {Array.isArray(result?.comparables) && result.comparables.length > 0 && (
        <div>
          <button
            onClick={() => setShowComparables(!showComparables)}
            className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors w-full"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{result.comparables.length} Comparable Properties</span>
            {showComparables ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>
          {showComparables && (
            <div className="mt-3 space-y-2">
              {result.comparables.map((comp, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">
                      {comp.address}{comp.city ? `, ${comp.city}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {comp.bedrooms != null && <span>{comp.bedrooms} bed</span>}
                      {comp.bathrooms != null && <span>{comp.bathrooms} bath</span>}
                      {comp.area != null && <span>{comp.area} sqft</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium text-foreground">{formatCurrency(comp.price)}</p>
                    <Badge
                      variant="outline"
                      className={
                        comp.status === 'sold'
                          ? 'text-green-400 border-green-500/30 text-[10px]'
                          : 'text-blue-400 border-blue-500/30 text-[10px]'
                      }
                    >
                      {comp.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={onReset}
        variant="outline"
        className="w-full"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Run Another Evaluation
      </Button>
    </div>
  );
}

// ─── Evaluation Leads Feed ─────────────────────────────────────────

function EvaluationLeadsFeed() {
  const [leads, setLeads] = useState<EvaluationLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    fetch('/api/real-estate/property-evaluation')
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((data) => setLeads(Array.isArray(data?.leads) ? data.leads : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <Card className="bg-card border border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Evaluation Leads</CardTitle>
              <CardDescription className="text-muted-foreground">
                Website visitors who requested property evaluations
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLeads}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No evaluation leads yet.</p>
            <p className="text-muted-foreground/80 text-xs mt-1">
              When visitors request evaluations on your website, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-3 rounded-lg bg-muted border border-border hover:border-input transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {lead.email !== '—' && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{lead.address}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {lead.estimatedValue != null && lead.estimatedValue > 0 ? (
                      <p className="text-sm font-medium text-success">
                        {formatCurrency(lead.estimatedValue)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No estimate</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(lead.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {leads.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{leads.length} evaluation{leads.length !== 1 ? 's' : ''} total</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              {leads.filter((l) => l.estimatedValue && l.estimatedValue > 0).length} with estimates
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Live Website Links ────────────────────────────────────────────

function LiveSiteLinks() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/websites')
      .then((r) => (r.ok ? r.json() : { websites: [] }))
      .then((data) => setWebsites(data.websites || []))
      .catch(() => setWebsites([]))
      .finally(() => setLoading(false));
  }, []);

  const serviceSites = websites.filter(
    (w) =>
      (w.templateType === 'SERVICE' || w.type === 'SERVICE') &&
      w.vercelDeploymentUrl &&
      (w.status === 'READY' || w.status === 'PUBLISHED')
  );

  return (
    <Card className="bg-card border border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">Live Website</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your published Property Evaluation page where visitors can request appraisals
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted border border-border p-4 mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            How it works
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Client enters address, beds, baths on your Property Evaluation page</li>
            <li>System finds comparable sold/active listings in the area</li>
            <li>Client enters contact info to receive the report</li>
            <li>Estimate + comparables sent by email; lead captured in your CRM</li>
          </ol>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading your websites...
          </div>
        ) : serviceSites.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No published real estate sites found. Publish a site to enable Property Evaluation.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Open your Property Evaluation page:</p>
            <div className="flex flex-wrap gap-3">
              {serviceSites.map((site) => {
                const siteOrigin = normalizeSiteOrigin(site.vercelDeploymentUrl);
                if (!siteOrigin) return null;
                const evalUrl = `${siteOrigin}/market-appraisal`;
                return (
                  <Button
                    key={site.id}
                    variant="outline"
                    asChild
                  >
                    <a href={evalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {site.name}
                      <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </a>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────

export function PropertyEvaluationPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrokerEvaluationForm />
        <EvaluationLeadsFeed />
      </div>
      <LiveSiteLinks />
    </div>
  );
}
