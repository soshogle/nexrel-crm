'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type, Settings2 } from 'lucide-react';

const LOOK_PRESETS = [
  { id: 'professional', label: 'Professional', heading: 'Inter', body: 'Inter', desc: 'Clean and trustworthy' },
  { id: 'friendly', label: 'Friendly', heading: 'Nunito', body: 'Open Sans', desc: 'Warm and approachable' },
  { id: 'elegant', label: 'Elegant', heading: 'Playfair Display', body: 'Lora', desc: 'Sophisticated' },
  { id: 'modern', label: 'Modern', heading: 'Inter', body: 'Inter', desc: 'Sleek and minimal' },
  { id: 'bold', label: 'Bold', heading: 'Montserrat', body: 'DM Sans', desc: 'Strong and confident' },
  { id: 'classic', label: 'Classic', heading: 'Georgia', body: 'Georgia', desc: 'Traditional' },
  { id: 'minimal', label: 'Minimal', heading: 'Helvetica Neue', body: 'Helvetica Neue', desc: 'Ultra clean' },
  { id: 'serif', label: 'Elegant Serif', heading: 'Playfair Display', body: 'Lora', desc: 'Refined' },
  { id: 'sans', label: 'Clean Sans', heading: 'Montserrat', body: 'Open Sans', desc: 'Modern sans-serif' },
  { id: 'tech', label: 'Tech', heading: 'Space Grotesk', body: 'DM Sans', desc: 'Tech-forward' },
];

interface GlobalStyles {
  fonts?: { heading?: string; body?: string; fontPairing?: string };
  spacing?: { unit?: number; sectionPadding?: { mobile?: number; tablet?: number; desktop?: number } };
}

interface GlobalStylesEditorProps {
  styles: GlobalStyles | undefined;
  onSave: (styles: GlobalStyles) => Promise<void>;
}

export function GlobalStylesEditor({ styles, onSave }: GlobalStylesEditorProps) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<GlobalStyles>({
    fonts: {
      heading: styles?.fonts?.heading || 'Inter',
      body: styles?.fonts?.body || 'Inter',
      fontPairing: styles?.fonts?.fontPairing || 'modern',
    },
    spacing: {
      unit: styles?.spacing?.unit ?? 8,
      sectionPadding: styles?.spacing?.sectionPadding ?? { mobile: 24, tablet: 32, desktop: 48 },
    },
  });

  const applyPreset = (id: string) => {
    const p = LOOK_PRESETS.find((f) => f.id === id);
    if (p) {
      setLocal((s) => ({
        ...s,
        fonts: {
          ...s.fonts,
          fontPairing: id,
          heading: p.heading,
          body: p.body,
        },
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Type className="h-4 w-4" />
          Look & Feel
        </CardTitle>
        <p className="text-xs text-muted-foreground">Choose how your site looks across all pages</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="simple">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Simple</TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Settings2 className="h-3 w-3" />
              Advanced
            </TabsTrigger>
          </TabsList>
          <TabsContent value="simple" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Style preset</Label>
              <Select value={local.fonts?.fontPairing || 'modern'} onValueChange={applyPreset}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOK_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground ml-1">— {p.desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Pick a style that matches your brand. You can customize more in Advanced.
              </p>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </TabsContent>
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Font preset</Label>
              <Select
                value={local.fonts?.fontPairing || 'modern'}
                onValueChange={(id) => {
                  applyPreset(id);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOK_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} ({p.heading} / {p.body})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Heading font</Label>
                <Input
                  value={local.fonts?.heading || ''}
                  onChange={(e) =>
                    setLocal((s) => ({
                      ...s,
                      fonts: { ...s.fonts, heading: e.target.value },
                    }))
                  }
                  placeholder="e.g. Inter"
                />
              </div>
              <div>
                <Label className="text-xs">Body font</Label>
                <Input
                  value={local.fonts?.body || ''}
                  onChange={(e) =>
                    setLocal((s) => ({
                      ...s,
                      fonts: { ...s.fonts, body: e.target.value },
                    }))
                  }
                  placeholder="e.g. Inter"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Spacing unit (px)</Label>
              <Input
                type="number"
                value={local.spacing?.unit ?? 8}
                onChange={(e) =>
                  setLocal((s) => ({
                    ...s,
                    spacing: { ...s.spacing, unit: parseInt(e.target.value, 10) || 8 },
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Mobile padding</Label>
                <Input
                  type="number"
                  value={local.spacing?.sectionPadding?.mobile ?? 24}
                  onChange={(e) =>
                    setLocal((s) => ({
                      ...s,
                      spacing: {
                        ...s.spacing,
                        sectionPadding: {
                          ...s.spacing?.sectionPadding,
                          mobile: parseInt(e.target.value, 10) || 24,
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Tablet padding</Label>
                <Input
                  type="number"
                  value={local.spacing?.sectionPadding?.tablet ?? 32}
                  onChange={(e) =>
                    setLocal((s) => ({
                      ...s,
                      spacing: {
                        ...s.spacing,
                        sectionPadding: {
                          ...s.spacing?.sectionPadding,
                          tablet: parseInt(e.target.value, 10) || 32,
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Desktop padding</Label>
                <Input
                  type="number"
                  value={local.spacing?.sectionPadding?.desktop ?? 48}
                  onChange={(e) =>
                    setLocal((s) => ({
                      ...s,
                      spacing: {
                        ...s.spacing,
                        sectionPadding: {
                          ...s.spacing?.sectionPadding,
                          desktop: parseInt(e.target.value, 10) || 48,
                        },
                      },
                    }))
                  }
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save styles'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
