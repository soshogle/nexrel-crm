'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const TEXT_PROPS = ['title', 'subtitle', 'heading', 'description', 'content', 'ctaText', 'ctaSecondaryText', 'label'];

function hasTextContent(comp: { type: string; props?: Record<string, any> }): boolean {
  const p = comp.props || {};
  return TEXT_PROPS.some((key) => p[key] && typeof p[key] === 'string');
}

interface SectionRewriteEditorProps {
  websiteId: string;
  pages: Array<{ id?: string; name?: string; path: string; components?: Array<{ id: string; type: string; props?: Record<string, any> }> }>;
  selectedPageIndex: number;
  onSave: (pagePath: string, sectionType: string, props: Record<string, string>) => Promise<void>;
}

export function SectionRewriteEditor({
  pages,
  selectedPageIndex,
  onSave,
}: SectionRewriteEditorProps) {
  const [open, setOpen] = useState(false);
  const [dialogPageIndex, setDialogPageIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [editedProps, setEditedProps] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const page = pages[open ? dialogPageIndex : selectedPageIndex];
  const pagePath = page?.path || '/';
  const components = page?.components || [];
  const sectionsWithText = components.filter(hasTextContent);

  const selectedSection = sectionsWithText[sectionIndex];
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setDialogPageIndex(selectedPageIndex);
      const comps = pages[selectedPageIndex]?.components || [];
      const withText = comps.filter(hasTextContent);
      if (withText.length) {
        setSectionIndex(0);
        const next: Record<string, string> = {};
        TEXT_PROPS.forEach((key) => {
          const v = withText[0]?.props?.[key];
          if (v != null && typeof v === 'string') next[key] = v;
        });
        setEditedProps(next);
      }
    }
  };

  const handleSectionChange = (idx: number) => {
    setSectionIndex(idx);
    const comp = sectionsWithText[idx];
    const next: Record<string, string> = {};
    TEXT_PROPS.forEach((key) => {
      const v = comp?.props?.[key];
      if (v != null && typeof v === 'string') next[key] = v;
    });
    setEditedProps(next);
  };

  const handleSave = async () => {
    if (!selectedSection) return;
    const targetPage = pages[dialogPageIndex];
    const targetPath = targetPage?.path || '/';
    setSaving(true);
    try {
      await onSave(targetPath, selectedSection.type, editedProps);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!pages.length || sectionsWithText.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Rewrite section
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rewrite section text</DialogTitle>
          <DialogDescription>
            Select a page and section, then edit the text. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Page</Label>
            <Select
              value={String(dialogPageIndex)}
              onValueChange={(v) => {
                const idx = parseInt(v, 10);
                setDialogPageIndex(idx);
                setSectionIndex(0);
                const comps = pages[idx]?.components || [];
                const withText = comps.filter(hasTextContent);
                if (withText.length) {
                  const next: Record<string, string> = {};
                  TEXT_PROPS.forEach((key) => {
                    const val = withText[0]?.props?.[key];
                    if (val != null && typeof val === 'string') next[key] = val;
                  });
                  setEditedProps(next);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {p.name || p.path || `Page ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={String(sectionIndex)}
              onValueChange={(v) => handleSectionChange(parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectionsWithText.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {c.type} {c.props?.title ? `— ${String(c.props.title).slice(0, 40)}…` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            {Object.keys(editedProps).length === 0 ? (
              <p className="text-sm text-muted-foreground">No editable text in this section.</p>
            ) : (
              Object.entries(editedProps).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  {key === 'description' || key === 'content' ? (
                    <Textarea
                      value={value}
                      onChange={(e) => setEditedProps((p) => ({ ...p, [key]: e.target.value }))}
                      rows={3}
                      className="text-sm"
                    />
                  ) : (
                    <Input
                      value={value}
                      onChange={(e) => setEditedProps((p) => ({ ...p, [key]: e.target.value }))}
                      className="text-sm"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || Object.keys(editedProps).length === 0}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
