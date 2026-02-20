'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Home, MapPin, DollarSign, Plus, Search, Filter,
  Edit, Trash2, Eye, ArrowUpDown, MoreHorizontal, X, Save,
  Bed, Bath, Ruler, Calendar, Tag, ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

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

const emptyForm = {
  address: '', unit: '', city: '', state: '', zip: '', country: 'CA',
  beds: '', baths: '', sqft: '', lotSize: '', yearBuilt: '',
  propertyType: 'SINGLE_FAMILY', listingStatus: 'ACTIVE',
  listPrice: '', mlsNumber: '', virtualTourUrl: '',
  description: '', features: '',
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
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const { toast } = useToast();

  const fetchProperties = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('propertyType', typeFilter);
      params.set('limit', '200');
      const res = await fetch(`/api/real-estate/properties?${params}`);
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
      virtualTourUrl: '',
      description: prop.description || '',
      features: prop.features?.join(', ') || '',
    });
    setShowForm(true);
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
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Listing
        </Button>
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
                placeholder="Search address, city, MLS#, seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                      <div className="font-medium">{p.address}{p.unit ? `, ${p.unit}` : ''}</div>
                      <div className="text-xs text-muted-foreground">{p.city}, {p.state} {p.zip}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${statusColor(p.listingStatus)} text-white text-xs`}>
                        {statusLabel(p.listingStatus)}
                      </Badge>
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
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Listing' : 'New Listing'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the property details below.' : 'Enter the property details to create a new listing.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Address *</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Apt 4B" />
              </div>
              <div>
                <Label>City *</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Province/State *</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <Label>Postal Code *</Label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Property Type</Label>
                <Select value={form.propertyType} onValueChange={(v) => setForm({ ...form, propertyType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.listingStatus} onValueChange={(v) => setForm({ ...form, listingStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>List Price</Label>
                <Input type="number" value={form.listPrice} onChange={(e) => setForm({ ...form, listPrice: e.target.value })} placeholder="450000" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Beds</Label>
                <Input type="number" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} />
              </div>
              <div>
                <Label>Baths</Label>
                <Input type="number" step="0.5" value={form.baths} onChange={(e) => setForm({ ...form, baths: e.target.value })} />
              </div>
              <div>
                <Label>Sq Ft</Label>
                <Input type="number" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} />
              </div>
              <div>
                <Label>MLS#</Label>
                <Input value={form.mlsNumber} onChange={(e) => setForm({ ...form, mlsNumber: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Property description..."
                rows={3}
              />
            </div>

            <div>
              <Label>Features (comma-separated)</Label>
              <Input
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="Garage, Pool, Renovated Kitchen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.address || !form.city || !form.state || !form.zip}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
