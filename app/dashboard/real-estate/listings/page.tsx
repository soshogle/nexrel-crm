'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Home, DollarSign, Plus, Search, Filter,
  Edit, Trash2, MoreHorizontal,
  Calendar, Tag, ChevronLeft, Download, Database, Import, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ListingFormDialog, ListingFormState } from '@/components/real-estate/listing-form-dialog';

interface Property {
  id: string;
  address: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType: string;
  listingStatus: string;
  listPrice?: number;
  mlsNumber?: string;
  daysOnMarket: number;
  description?: string;
  features: string[];
  photos?: string[];
  virtualTourUrl?: string;
  listingDate?: string;
  createdAt: string;
  sellerLead?: { id: string; contactPerson?: string; email?: string; phone?: string } | null;
}

const PROPERTY_TYPES = [
  { value: 'SINGLE_FAMILY', label: 'Single Family' },
  { value: 'CONDO', label: 'Condo' },
  { value: 'TOWNHOUSE', label: 'Townhouse' },
  { value: 'MULTI_FAMILY', label: 'Multi-Family' },
  { value: 'LAND', label: 'Land' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'OTHER', label: 'Other' },
];

const LISTING_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-500' },
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'SOLD', label: 'Sold', color: 'bg-blue-500' },
  { value: 'EXPIRED', label: 'Expired', color: 'bg-red-500' },
  { value: 'WITHDRAWN', label: 'Withdrawn', color: 'bg-gray-500' },
  { value: 'COMING_SOON', label: 'Coming Soon', color: 'bg-purple-500' },
];

function statusColor(status: string) {
  return LISTING_STATUSES.find((s) => s.value === status)?.color || 'bg-gray-500';
}

function statusLabel(status: string) {
  return LISTING_STATUSES.find((s) => s.value === status)?.label || status;
}

function typeLabel(type: string) {
  return PROPERTY_TYPES.find((t) => t.value === type)?.label || type;
}

function formatPrice(price?: number) {
  if (!price) return '—';
  return `$${price.toLocaleString()}`;
}

const emptyForm: ListingFormState = {
  address: '', unit: '', city: '', state: '', zip: '', country: 'CA',
  beds: '', baths: '', sqft: '', lotSize: '', yearBuilt: '',
  propertyType: 'SINGLE_FAMILY', listingStatus: 'ACTIVE',
  listPrice: '', mlsNumber: '', virtualTourUrl: '',
  description: '', features: '', photos: [],
};

export default function ListingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [websiteResults, setWebsiteResults] = useState<any[]>([]);
  const [websiteSearching, setWebsiteSearching] = useState(false);
  const [showWebsiteResults, setShowWebsiteResults] = useState(false);
  const [importingMls, setImportingMls] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProperties = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('propertyType', typeFilter);
      params.set('limit', '200');
      const res = await fetch(`/api/real-estate/properties?${params}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setProperties(data.properties || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch listings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, toast]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const filtered = properties.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.mlsNumber?.toLowerCase().includes(q) ||
      p.sellerLead?.contactPerson?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: properties.length,
    active: properties.filter((p) => p.listingStatus === 'ACTIVE').length,
    pending: properties.filter((p) => p.listingStatus === 'PENDING').length,
    sold: properties.filter((p) => p.listingStatus === 'SOLD').length,
    totalValue: properties
      .filter((p) => p.listingStatus === 'ACTIVE')
      .reduce((sum, p) => sum + (p.listPrice || 0), 0),
  };

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(prop: Property) {
    setEditingId(prop.id);
    setForm({
      address: prop.address,
      unit: prop.unit || '',
      city: prop.city,
      state: prop.state,
      zip: prop.zip,
      country: 'CA',
      beds: prop.beds?.toString() || '',
      baths: prop.baths?.toString() || '',
      sqft: prop.sqft?.toString() || '',
      lotSize: '',
      yearBuilt: '',
      propertyType: prop.propertyType,
      listingStatus: prop.listingStatus,
      listPrice: prop.listPrice?.toString() || '',
      mlsNumber: prop.mlsNumber || '',
      virtualTourUrl: prop.virtualTourUrl || '',
      description: prop.description || '',
      features: prop.features?.join(', ') || '',
      photos: Array.isArray(prop.photos) ? prop.photos : [],
    });
    setShowForm(true);
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('photos', f));
      const res = await fetch('/api/real-estate/properties/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...data.urls] }));
      toast({ title: 'Uploaded', description: `${data.urls.length} photo(s) added` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  }

  function movePhoto(from: number, to: number) {
    setForm((prev) => {
      const arr = [...prev.photos];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...prev, photos: arr };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        beds: form.beds || undefined,
        baths: form.baths || undefined,
        sqft: form.sqft || undefined,
        lotSize: form.lotSize || undefined,
        yearBuilt: form.yearBuilt || undefined,
        listPrice: form.listPrice || undefined,
        features: form.features ? form.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
        photos: form.photos,
        virtualTourUrl: form.virtualTourUrl || undefined,
        lat: (form as any).lat || undefined,
        lng: (form as any).lng || undefined,
      };

      if (editingId) {
        await fetch('/api/real-estate/properties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        toast({ title: 'Updated', description: 'Listing updated successfully' });
      } else {
        await fetch('/api/real-estate/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast({ title: 'Created', description: 'New listing created' });
      }
      setShowForm(false);
      fetchProperties();
    } catch {
      toast({ title: 'Error', description: 'Failed to save listing', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this listing?')) return;
    try {
      await fetch(`/api/real-estate/properties?id=${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted', description: 'Listing removed' });
      fetchProperties();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  }

  async function handleBulkStatusUpdate() {
    if (!bulkAction || bulkSelected.size === 0) return;
    setSaving(true);
    try {
      const updates = Array.from(bulkSelected).map((id) =>
        fetch('/api/real-estate/properties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, listingStatus: bulkAction }),
        })
      );
      await Promise.all(updates);
      toast({ title: 'Updated', description: `${bulkSelected.size} listings updated to ${statusLabel(bulkAction)}` });
      setBulkSelected(new Set());
      setBulkAction('');
      fetchProperties();
    } catch {
      toast({ title: 'Error', description: 'Bulk update failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // Search owner's website DB for listings by MLS# or address
  async function searchWebsiteDB(query: string) {
    if (!query || query.length < 2) {
      setWebsiteResults([]);
      setShowWebsiteResults(false);
      return;
    }
    setWebsiteSearching(true);
    try {
      const res = await fetch(`/api/real-estate/properties/search-website?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setWebsiteResults(data.results || []);
      setShowWebsiteResults(data.results?.length > 0);
    } catch {
      setWebsiteResults([]);
    } finally {
      setWebsiteSearching(false);
    }
  }

  // Import a listing from the website DB into the CRM
  async function importFromWebsite(listing: any) {
    setImportingMls(listing.mls_number || listing.id?.toString());
    try {
      const typeMap: Record<string, string> = {
        house: 'SINGLE_FAMILY', condo: 'CONDO', townhouse: 'TOWNHOUSE',
        'multi-family': 'MULTI_FAMILY', land: 'LAND', commercial: 'COMMERCIAL',
      };
      const statusMap: Record<string, string> = {
        active: 'ACTIVE', pending: 'PENDING', sold: 'SOLD',
        expired: 'EXPIRED', withdrawn: 'WITHDRAWN', coming_soon: 'COMING_SOON',
      };

      const payload = {
        address: listing.address || listing.title || '',
        city: '',
        state: '',
        zip: '',
        country: 'CA',
        beds: listing.bedrooms?.toString() || '',
        baths: listing.bathrooms?.toString() || '',
        sqft: listing.living_area?.toString() || '',
        propertyType: typeMap[listing.property_type] || 'OTHER',
        listingStatus: statusMap[listing.status] || 'ACTIVE',
        listPrice: listing.price?.toString() || '',
        mlsNumber: listing.mls_number || '',
        description: listing.description || '',
        photos: listing.main_image_url ? [listing.main_image_url] : [],
        features: [],
      };

      // Parse city/state/zip from the address string
      const parts = (listing.address || '').split(',').map((p: string) => p.trim());
      if (parts.length >= 3) {
        payload.address = parts[0];
        payload.city = parts[1];
        const stateZip = parts[2].split(' ').filter(Boolean);
        payload.state = stateZip[0] || '';
        payload.zip = stateZip.slice(1).join(' ') || '';
      } else if (parts.length === 2) {
        payload.address = parts[0];
        payload.city = parts[1];
      }

      const res = await fetch('/api/real-estate/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Import failed');
      toast({ title: 'Imported', description: `Listing ${listing.mls_number || ''} imported from website database` });
      setShowWebsiteResults(false);
      setSearchQuery('');
      fetchProperties();
    } catch {
      toast({ title: 'Error', description: 'Failed to import listing', variant: 'destructive' });
    } finally {
      setImportingMls(null);
    }
  }

  // Quick status change for a listing (updates CRM + syncs to website DB)
  async function handleStatusChange(propertyId: string, newStatus: string) {
    setStatusUpdating(propertyId);
    try {
      const res = await fetch('/api/real-estate/properties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: propertyId, listingStatus: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Status Updated', description: `Listing marked as ${statusLabel(newStatus)}` });
      fetchProperties();
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setStatusUpdating(null);
    }
  }

  function toggleBulk(id: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (bulkSelected.size === filtered.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/real-estate" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Listing Management</h1>
          </div>
          <p className="text-muted-foreground">Centralized view of all your property listings</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={properties.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                window.open('/api/real-estate/properties/export?format=centris', '_blank');
              }}>
                Export for Centris.ca
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                window.open('/api/real-estate/properties/export?format=realtor', '_blank');
              }}>
                Export for Realtor.ca (CREA DDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Listing
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Home className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sold</p>
                <p className="text-2xl font-bold text-blue-600">{stats.sold}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Value</p>
                <p className="text-2xl font-bold">{formatPrice(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Bulk Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search address, city, MLS#, seller... (also searches your website DB)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchWebsiteDB(e.target.value);
                }}
                className="pl-10"
              />
              {websiteSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
              {/* Website DB search results dropdown */}
              {showWebsiteResults && websiteResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center gap-1.5">
                    <Database className="h-3 w-3" />
                    Found {websiteResults.length} listing(s) in your website database — click to import
                  </div>
                  {websiteResults.map((r: any) => {
                    const alreadyInCRM = properties.some(
                      (p) => p.mlsNumber && r.mls_number && p.mlsNumber === r.mls_number
                    );
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={alreadyInCRM || importingMls === (r.mls_number || r.id?.toString())}
                        onClick={() => !alreadyInCRM && importFromWebsite(r)}
                        className="w-full px-3 py-2.5 text-left hover:bg-muted/50 flex items-center gap-3 transition-colors disabled:opacity-50 border-b last:border-0"
                      >
                        {r.main_image_url ? (
                          <img src={r.main_image_url} alt="" className="h-10 w-14 rounded object-cover flex-shrink-0 border" />
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0 border">
                            <Building2 className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.address || r.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {r.mls_number && <span className="font-mono">MLS# {r.mls_number}</span>}
                            {r.price && <span>${Number(r.price).toLocaleString()}</span>}
                            {r.bedrooms && <span>{r.bedrooms} bd</span>}
                            {r.bathrooms && <span>{r.bathrooms} ba</span>}
                            <Badge variant="outline" className="text-[10px] h-4">
                              {r.status}
                            </Badge>
                          </div>
                        </div>
                        {alreadyInCRM ? (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">In CRM</Badge>
                        ) : importingMls === (r.mls_number || r.id?.toString()) ? (
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        ) : (
                          <Import className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowWebsiteResults(false)}
                    className="w-full px-3 py-1.5 text-xs text-center text-muted-foreground hover:bg-muted/50"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {LISTING_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bulkSelected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">{bulkSelected.size} selected</span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Bulk status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkStatusUpdate} disabled={!bulkAction || saving}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No listings found</p>
              <p className="text-sm mt-1">Add your first listing to get started</p>
              <Button className="mt-4" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Add Listing
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={bulkSelected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Beds</TableHead>
                  <TableHead className="text-center">Baths</TableHead>
                  <TableHead className="text-right">Sq Ft</TableHead>
                  <TableHead>MLS#</TableHead>
                  <TableHead className="text-center">DOM</TableHead>
                  <TableHead className="text-center">Seller</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(p.id)}
                        onChange={() => toggleBulk(p.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {Array.isArray(p.photos) && p.photos.length > 0 ? (
                          <img src={p.photos[0]} alt="" className="h-10 w-14 rounded object-cover flex-shrink-0 border" />
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0 border">
                            <Building2 className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{p.address}{p.unit ? `, ${p.unit}` : ''}</div>
                          <div className="text-xs text-muted-foreground">{p.city}, {p.state} {p.zip}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="secondary" className={`${statusColor(p.listingStatus)} text-white text-xs cursor-pointer hover:opacity-80`}>
                            {statusLabel(p.listingStatus)}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {LISTING_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s.value}
                              disabled={p.listingStatus === s.value}
                              onClick={() => handleStatusChange(p.id, s.value)}
                            >
                              <div className={`mr-2 h-2 w-2 rounded-full ${s.color}`} />
                              {s.label}
                              {p.listingStatus === s.value && <span className="ml-auto text-xs text-muted-foreground">current</span>}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-sm">{typeLabel(p.propertyType)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(p.listPrice)}</TableCell>
                    <TableCell className="text-center">{p.beds ?? '—'}</TableCell>
                    <TableCell className="text-center">{p.baths ?? '—'}</TableCell>
                    <TableCell className="text-right">{p.sqft?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{p.mlsNumber || '—'}</TableCell>
                    <TableCell className="text-center">{p.daysOnMarket}</TableCell>
                    <TableCell className="text-center text-sm">
                      {p.sellerLead ? (
                        <Link href={`/dashboard/leads/${p.sellerLead.id}`} className="text-primary hover:underline">
                          {p.sellerLead.contactPerson || 'View'}
                        </Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            {statusUpdating === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.listingStatus !== 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'ACTIVE')}>
                              <div className="mr-2 h-2 w-2 rounded-full bg-green-500" /> Mark Active
                            </DropdownMenuItem>
                          )}
                          {p.listingStatus !== 'PENDING' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'PENDING')}>
                              <div className="mr-2 h-2 w-2 rounded-full bg-yellow-500" /> Mark Pending
                            </DropdownMenuItem>
                          )}
                          {p.listingStatus !== 'SOLD' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(p.id, 'SOLD')}>
                              <div className="mr-2 h-2 w-2 rounded-full bg-blue-500" /> Mark Sold
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ListingFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editingId={editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        uploading={uploading}
        onSave={handleSave}
        onPhotoUpload={handlePhotoUpload}
        onRemovePhoto={removePhoto}
        onMovePhoto={movePhoto}
      />
    </div>
  );
}
