'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Save, ChevronLeft, ImagePlus, Loader2, Link2 } from 'lucide-react';

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
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'COMING_SOON', label: 'Coming Soon' },
];

export interface ListingFormState {
  address: string; unit: string; city: string; state: string; zip: string; country: string;
  beds: string; baths: string; sqft: string; lotSize: string; yearBuilt: string;
  propertyType: string; listingStatus: string;
  listPrice: string; mlsNumber: string; virtualTourUrl: string;
  description: string; features: string; photos: string[];
}

interface ListingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: ListingFormState;
  setForm: React.Dispatch<React.SetStateAction<ListingFormState>>;
  saving: boolean;
  uploading: boolean;
  onSave: () => void;
  onPhotoUpload: (files: FileList | null) => void;
  onRemovePhoto: (index: number) => void;
  onMovePhoto: (from: number, to: number) => void;
}

export function ListingFormDialog({
  open, onOpenChange, editingId, form, setForm,
  saving, uploading, onSave, onPhotoUpload, onRemovePhoto, onMovePhoto,
}: ListingFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {/* Photos */}
          <div>
            <Label className="mb-2 block">Photos</Label>
            {form.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {i > 0 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => onMovePhoto(i, i - 1)} title="Move left">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => onRemovePhoto(i)} title="Remove">
                        <X className="h-4 w-4" />
                      </Button>
                      {i < form.photos.length - 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white rotate-180" onClick={() => onMovePhoto(i, i + 1)} title="Move right">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {i === 0 && (
                      <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">Cover</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('photo-upload-input')?.click()}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
              <input
                id="photo-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => onPhotoUpload(e.target.files)}
              />
              <span className="text-xs text-muted-foreground">
                {form.photos.length} photo{form.photos.length !== 1 ? 's' : ''} &middot; JPEG, PNG, WebP up to 10 MB
              </span>
            </div>
          </div>

          {/* Virtual Tour */}
          <div>
            <Label>Virtual Tour URL</Label>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                value={form.virtualTourUrl}
                onChange={(e) => setForm({ ...form, virtualTourUrl: e.target.value })}
                placeholder="https://my.matterport.com/show/?m=..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving || !form.address || !form.city || !form.state || !form.zip}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
