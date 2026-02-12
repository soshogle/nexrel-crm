'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type } from 'lucide-react';

const FONT_PAIRINGS = [
  { id: 'modern', label: 'Modern', heading: 'Inter', body: 'Inter' },
  { id: 'classic', label: 'Classic', heading: 'Georgia', body: 'Georgia' },
  { id: 'minimal', label: 'Minimal', heading: 'Helvetica Neue', body: 'Helvetica Neue' },
  { id: 'serif', label: 'Elegant Serif', heading: 'Playfair Display', body: 'Lora' },
  { id: 'sans', label: 'Clean Sans', heading: 'Montserrat', body: 'Open Sans' },
  { id: 'tech', label: 'Tech', heading: 'Space Grotesk', body: 'DM Sans' },
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

  const applyPairing = (id: string) => {
    const p = FONT_PAIRINGS.find((f) => f.id === id);
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
          Global styles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Font pairing</Label>
          <Select
            value={local.fonts?.fontPairing || 'modern'}
            onValueChange={applyPairing}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_PAIRINGS.map((p) => (
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
            <Label className="text-xs">Section padding mobile</Label>
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
            <Label className="text-xs">Tablet</Label>
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
            <Label className="text-xs">Desktop</Label>
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
      </CardContent>
    </Card>
  );
}
