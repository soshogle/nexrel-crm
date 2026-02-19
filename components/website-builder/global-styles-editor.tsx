'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type, Palette, Settings2 } from 'lucide-react';

const FONT_OPTIONS = [
  'Inter',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Roboto',
  'Poppins',
  'Nunito',
  'Playfair Display',
  'Lora',
  'Libre Baskerville',
  'Georgia',
  'DM Sans',
  'Space Grotesk',
  'Raleway',
  'Oswald',
  'Merriweather',
  'Source Sans 3',
  'Work Sans',
  'Noto Sans',
  'Ubuntu',
  'Bebas Neue',
  'Cormorant Garamond',
  'Josefin Sans',
  'Quicksand',
  'Rubik',
  'Karla',
  'Manrope',
  'Sora',
  'Outfit',
  'Plus Jakarta Sans',
];

const COLOR_PRESETS = [
  { primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA', background: '#FFFFFF', text: '#1F2937' },
  { primary: '#059669', secondary: '#047857', accent: '#34D399', background: '#FFFFFF', text: '#1F2937' },
  { primary: '#7C3AED', secondary: '#5B21B6', accent: '#A78BFA', background: '#FFFFFF', text: '#1F2937' },
  { primary: '#DC2626', secondary: '#B91C1C', accent: '#F87171', background: '#FFFFFF', text: '#1F2937' },
  { primary: '#EA580C', secondary: '#C2410C', accent: '#FB923C', background: '#FFFFFF', text: '#1F2937' },
  { primary: '#0D9488', secondary: '#0F766E', accent: '#2DD4BF', background: '#FFFFFF', text: '#1F2937' },
  { primary: '#1E3A5F', secondary: '#0F172A', accent: '#86C0C7', background: '#F8FAFC', text: '#1E293B' },
  { primary: '#4F46E5', secondary: '#3730A3', accent: '#818CF8', background: '#F9FAFB', text: '#111827' },
];

const LOOK_PRESETS = [
  { id: 'professional', label: 'Professional', heading: 'Inter', body: 'Inter', desc: 'Clean and trustworthy' },
  { id: 'friendly', label: 'Friendly', heading: 'Nunito', body: 'Open Sans', desc: 'Warm and approachable' },
  { id: 'elegant', label: 'Elegant', heading: 'Playfair Display', body: 'Lora', desc: 'Sophisticated' },
  { id: 'modern', label: 'Modern', heading: 'Inter', body: 'Inter', desc: 'Sleek and minimal' },
  { id: 'bold', label: 'Bold', heading: 'Montserrat', body: 'DM Sans', desc: 'Strong and confident' },
  { id: 'classic', label: 'Classic', heading: 'Georgia', body: 'Georgia', desc: 'Traditional' },
  { id: 'tech', label: 'Tech', heading: 'Space Grotesk', body: 'DM Sans', desc: 'Tech-forward' },
];

interface GlobalStyles {
  fonts?: { heading?: string; body?: string; fontPairing?: string };
  colors?: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string };
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
    colors: {
      primary: styles?.colors?.primary || '#3B82F6',
      secondary: styles?.colors?.secondary || '#1E40AF',
      accent: styles?.colors?.accent || '#60A5FA',
      background: styles?.colors?.background || '#FFFFFF',
      text: styles?.colors?.text || '#1F2937',
    },
    spacing: {
      unit: styles?.spacing?.unit ?? 8,
      sectionPadding: styles?.spacing?.sectionPadding ?? { mobile: 24, tablet: 32, desktop: 48 },
    },
  });

  useEffect(() => {
    if (styles?.fonts) setLocal((l) => ({ ...l, fonts: { ...l.fonts, ...styles.fonts } }));
    if (styles?.colors) setLocal((l) => ({ ...l, colors: { ...l.colors, ...styles.colors } }));
    if (styles?.spacing) setLocal((l) => ({ ...l, spacing: { ...l.spacing, ...styles.spacing } }));
  }, [styles]);

  const applyPreset = (id: string) => {
    const p = LOOK_PRESETS.find((f) => f.id === id);
    if (p) {
      setLocal((s) => ({
        ...s,
        fonts: { ...s.fonts, fontPairing: id, heading: p.heading, body: p.body },
      }));
    }
  };

  const applyColorPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setLocal((s) => ({
      ...s,
      colors: { ...s.colors, ...preset },
    }));
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
        <p className="text-xs text-muted-foreground">Fonts and colors apply across your site</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="fonts">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fonts" className="flex items-center gap-1.5 text-xs">
              <Type className="h-3.5 w-3.5" />
              Fonts
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fonts" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Quick style presets</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {LOOK_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    variant={local.fonts?.fontPairing === p.id ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Heading font — scroll to browse</Label>
              <div className="mt-1.5 h-32 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors ${
                      local.fonts?.heading === font ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    style={{ fontFamily: font }}
                    onClick={() => setLocal((s) => ({ ...s, fonts: { ...s.fonts, heading: font } }))}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Body font — scroll to browse</Label>
              <div className="mt-1.5 h-32 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-1">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors ${
                      local.fonts?.body === font ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    style={{ fontFamily: font }}
                    onClick={() => setLocal((s) => ({ ...s, fonts: { ...s.fonts, body: font } }))}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save fonts'}
            </Button>
          </TabsContent>

          <TabsContent value="colors" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Color presets — click to apply</Label>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex gap-1 p-2 rounded-lg border hover:border-primary transition-colors"
                    onClick={() => applyColorPreset(preset)}
                  >
                    <div className="w-6 h-6 rounded shrink-0 border" style={{ backgroundColor: preset.primary }} />
                    <div className="w-4 h-4 rounded shrink-0 border" style={{ backgroundColor: preset.secondary }} />
                    <div className="w-4 h-4 rounded shrink-0 border" style={{ backgroundColor: preset.accent }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map((key) => (
                <div key={key}>
                  <Label className="text-xs capitalize">{key}</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={local.colors?.[key] || '#000000'}
                      onChange={(e) =>
                        setLocal((s) => ({
                          ...s,
                          colors: { ...s.colors, [key]: e.target.value },
                        }))
                      }
                      className="h-9 w-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={local.colors?.[key] || ''}
                      onChange={(e) =>
                        setLocal((s) => ({
                          ...s,
                          colors: { ...s.colors, [key]: e.target.value },
                        }))
                      }
                      className="h-9 text-sm font-mono"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save colors'}
            </Button>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Font preset</Label>
              <select
                value={local.fonts?.fontPairing || 'modern'}
                onChange={(e) => applyPreset(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                {LOOK_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.heading} / {p.body})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Heading font</Label>
                <Input
                  value={local.fonts?.heading || ''}
                  onChange={(e) => setLocal((s) => ({ ...s, fonts: { ...s.fonts, heading: e.target.value } }))}
                  placeholder="e.g. Inter"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Body font</Label>
                <Input
                  value={local.fonts?.body || ''}
                  onChange={(e) => setLocal((s) => ({ ...s, fonts: { ...s.fonts, body: e.target.value } }))}
                  placeholder="e.g. Inter"
                  className="mt-1"
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
                className="mt-1"
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
                  className="mt-1"
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
                  className="mt-1"
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
                  className="mt-1"
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
