'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Hourglass, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PlaceAutocomplete } from '@/components/ui/place-autocomplete';

const LIVE_SECONDS = 30;

export interface AgencyConfigForm {
  brokerName: string;
  name: string;
  tagline: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
}

interface AgencyConfigEditorProps {
  websiteId: string;
  agencyConfig: Record<string, unknown> | null;
  onSave: (config: AgencyConfigForm) => Promise<void>;
  onUpdateLocal: (config: Partial<AgencyConfigForm>) => void;
}

export function AgencyConfigEditor({
  websiteId,
  agencyConfig,
  onSave,
  onUpdateLocal,
}: AgencyConfigEditorProps) {
  const [form, setForm] = useState<AgencyConfigForm>({
    brokerName: '',
    name: '',
    tagline: '',
    logoUrl: '',
    phone: '',
    email: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [liveCountdown, setLiveCountdown] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const stored = agencyConfig || {};
    setForm({
      brokerName: (stored.brokerName as string) || '',
      name: (stored.name as string) || '',
      tagline: (stored.tagline as string) || '',
      logoUrl: (stored.logoUrl as string) || '',
      phone: (stored.phone as string) || '',
      email: (stored.email as string) || '',
      address: (stored.fullAddress as string) || (stored.address as string) || '',
    });
  }, [agencyConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onUpdateLocal(form);
      toast.success('Agency settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onSave(form);
      onUpdateLocal(form);
      setLiveCountdown(LIVE_SECONDS);
      toast.success('Published! Changes will appear on your site within 30 seconds.');
    } catch {
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (liveCountdown === null || liveCountdown <= 0) return;
    const t = setInterval(() => setLiveCountdown((c) => (c != null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [liveCountdown]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !websiteId) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Please use JPEG, PNG, GIF, WebP, or SVG');
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/websites/${websiteId}/media`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      const url = data.media?.url;
      if (url) {
        setForm((f) => ({ ...f, logoUrl: url }));
        toast.success('Logo uploaded');
      } else throw new Error('No URL returned');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Logo, name, tagline, and contact info appear on your live site. No redeploy needed.
      </p>

      <div className="space-y-2">
        <Label htmlFor="agency-logo" className="text-sm">
          Logo
        </Label>
        <p className="text-xs text-muted-foreground">
          Recommended: 200×60px. PNG or SVG for crisp display. Or paste a direct image URL below.
        </p>
        <Input
          placeholder="https://... or upload"
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value.trim() }))}
          className="text-sm font-mono"
        />
        <div className="flex items-center gap-3">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt="Agency logo"
              className="h-12 w-auto max-w-[180px] object-contain object-left rounded border bg-white/80"
            />
          ) : (
            <div className="h-12 w-20 rounded border bg-muted flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <input
              id="agency-logo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('agency-logo')?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency-broker">Broker / Agent Name</Label>
        <Input
          id="agency-broker"
          value={form.brokerName}
          onChange={(e) => setForm((f) => ({ ...f, brokerName: e.target.value }))}
          placeholder="e.g. Jane Smith"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency-name">Agency / Company Name</Label>
        <Input
          id="agency-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Acme Real Estate"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency-tagline">Tagline</Label>
        <Input
          id="agency-tagline"
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          placeholder="e.g. Your trusted real estate partner"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency-phone">Phone</Label>
        <Input
          id="agency-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="e.g. 555-123-4567"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency-email">Email</Label>
        <Input
          id="agency-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="e.g. hello@agency.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="agency-address">Address</Label>
        <PlaceAutocomplete
          value={form.address}
          onChange={(val) => setForm((f) => ({ ...f, address: val }))}
          placeholder="Start typing to search for an address..."
          types="address"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {liveCountdown != null && liveCountdown > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Hourglass className="h-4 w-4 animate-pulse" />
            <span>Live in {liveCountdown}s — refresh your site to see changes</span>
          </div>
        )}
        {liveCountdown === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            <span>Changes are live on your site</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
