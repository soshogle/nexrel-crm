/**
 * Property Listings - Manage gallery motion for real estate websites
 */

'use client';

import { useState, useEffect } from 'react';
import { Home, Pencil, RefreshCw, ImageIcon, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

type GalleryItem = { url: string; motionDisabled?: boolean };

interface PropertyListing {
  id: number;
  title: string;
  slug: string;
  address: string;
  mainImageUrl: string | null;
  galleryImages: (string | GalleryItem)[] | null;
}

interface PropertyListingsProps {
  websiteId: string;
}

export function PropertyListings({ websiteId }: PropertyListingsProps) {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [websiteId]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/listings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setListings(data.listings || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (property: PropertyListing) => {
    const raw = (property.galleryImages || []) as (string | GalleryItem)[];
    const normalized = raw.map((item): GalleryItem =>
      typeof item === 'string' ? { url: item } : { url: item.url, motionDisabled: item.motionDisabled }
    );
    const mainUrl = property.mainImageUrl || '';
    const mainInGallery = normalized.find((g) => g.url === mainUrl);
    const rest = normalized.filter((g) => g.url !== mainUrl);
    const ordered = mainUrl
      ? [{ url: mainUrl, motionDisabled: mainInGallery?.motionDisabled }, ...rest]
      : rest;
    setGalleryItems(ordered);
    setSelectedProperty(property);
  };

  const setMotionDisabled = (index: number, disabled: boolean) => {
    setGalleryItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, motionDisabled: disabled } : item))
    );
  };

  const handleSave = async () => {
    if (!selectedProperty) return;
    setSaving(true);
    try {
      const toSave = galleryItems.map((g) =>
        g.motionDisabled ? { url: g.url, motionDisabled: true } : g.url
      );
      const res = await fetch(`/api/websites/${websiteId}/listings/${selectedProperty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryImages: toSave }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      toast.success('Gallery saved');
      setSelectedProperty(null);
      fetchListings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Listings
          </CardTitle>
          <CardDescription>
            Manage the Ken Burns motion effect for each property&apos;s gallery images. Disable motion for
            specific photos (e.g. floor plans, documents).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <Home className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>No listings found</p>
              <p className="text-sm mt-1">Properties are synced from your database. Add listings to see them here.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => openEditor(listing)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                      {listing.mainImageUrl ? (
                        <img
                          src={listing.mainImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
                        <Pencil className="h-3 w-3" />
                        Edit gallery
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-medium truncate">{listing.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{listing.address}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={() => setSelectedProperty(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <SheetTitle className="pt-8">
              {selectedProperty?.title}
            </SheetTitle>
            <SheetDescription>
              {selectedProperty?.address}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Gallery Motion</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Disable the Ken Burns zoom/pan effect for specific images.
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {galleryItems.map((item, i) => (
                  <div
                    key={item.url}
                    className="flex items-center gap-3 py-2 border-b last:border-0"
                  >
                    <div className="w-14 h-14 rounded overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {item.url.split('/').pop() || 'Image'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                      <span className="text-xs text-muted-foreground">No motion</span>
                      <input
                        type="checkbox"
                        checked={!!item.motionDisabled}
                        onChange={(e) => setMotionDisabled(i, e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                    </label>
                  </div>
                ))}
                {galleryItems.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">No gallery images</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedProperty(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
