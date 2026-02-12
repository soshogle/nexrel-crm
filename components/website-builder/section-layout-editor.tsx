'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

interface Layout {
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  alignment?: 'left' | 'center' | 'right' | 'stretch';
  visibility?: { mobile?: boolean; tablet?: boolean; desktop?: boolean };
}

interface SectionLayoutEditorProps {
  sectionType: string;
  sectionTitle?: string;
  layout: Layout | undefined;
  onSave: (layout: Layout) => Promise<void>;
}

export function SectionLayoutEditor({
  sectionType,
  sectionTitle,
  layout,
  onSave,
}: SectionLayoutEditorProps) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Layout>({
    padding: layout?.padding || { top: 24, bottom: 24 },
    margin: layout?.margin || {},
    alignment: layout?.alignment || 'center',
    visibility: layout?.visibility ?? { mobile: true, tablet: true, desktop: true },
  });

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
        <CardTitle className="text-sm">
          Layout: {sectionType} {sectionTitle && `- ${sectionTitle}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Responsive visibility</Label>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <Switch
                checked={local.visibility?.mobile ?? true}
                onCheckedChange={(c) =>
                  setLocal((s) => ({
                    ...s,
                    visibility: { ...s.visibility, mobile: c },
                  }))
                }
              />
              <span className="text-xs">Mobile</span>
            </div>
            <div className="flex items-center gap-2">
              <Tablet className="h-4 w-4" />
              <Switch
                checked={local.visibility?.tablet ?? true}
                onCheckedChange={(c) =>
                  setLocal((s) => ({
                    ...s,
                    visibility: { ...s.visibility, tablet: c },
                  }))
                }
              />
              <span className="text-xs">Tablet</span>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <Switch
                checked={local.visibility?.desktop ?? true}
                onCheckedChange={(c) =>
                  setLocal((s) => ({
                    ...s,
                    visibility: { ...s.visibility, desktop: c },
                  }))
                }
              />
              <span className="text-xs">Desktop</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Alignment</Label>
          <Select
            value={local.alignment || 'center'}
            onValueChange={(v: 'left' | 'center' | 'right' | 'stretch') =>
              setLocal((s) => ({ ...s, alignment: v }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="stretch">Stretch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Padding top</Label>
            <Input
              type="number"
              value={local.padding?.top ?? 24}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  padding: { ...s.padding, top: parseInt(e.target.value, 10) || undefined },
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">Padding bottom</Label>
            <Input
              type="number"
              value={local.padding?.bottom ?? 24}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  padding: { ...s.padding, bottom: parseInt(e.target.value, 10) || undefined },
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">Margin top</Label>
            <Input
              type="number"
              value={local.margin?.top ?? 0}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  margin: { ...s.margin, top: parseInt(e.target.value, 10) || undefined },
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs">Margin bottom</Label>
            <Input
              type="number"
              value={local.margin?.bottom ?? 0}
              onChange={(e) =>
                setLocal((s) => ({
                  ...s,
                  margin: { ...s.margin, bottom: parseInt(e.target.value, 10) || undefined },
                }))
              }
            />
          </div>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save layout'}
        </Button>
      </CardContent>
    </Card>
  );
}
