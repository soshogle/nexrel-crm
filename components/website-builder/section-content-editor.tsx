'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon, Type, Sparkles, Loader2, Save, Trash2, Plus,
  ChevronDown, ChevronRight, X, Upload, RotateCcw, Check, Pencil,
  FileText, Layers, Eye, Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { MediaPicker } from './media-picker';

interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
  layout?: any;
}

interface PageData {
  id: string;
  name: string;
  path: string;
  components: Component[];
  seo?: any;
}

interface SectionContentEditorProps {
  websiteId: string;
  pages: PageData[];
  onStructureUpdate: () => void;
  /** When true, pages were derived from navConfig (template site); show template-specific hints */
  pagesDerivedFromNav?: boolean;
  /** Live site URL - used for auto-import when structure is empty */
  vercelDeploymentUrl?: string;
  /** When true, import-all-pages is in progress */
  isImportAllInProgress?: boolean;
}

const TEXT_FIELDS = ['title', 'subtitle', 'description', 'heading', 'subheading', 'text', 'content', 'caption', 'label', 'buttonText', 'ctaText', 'tagline', 'quote', 'author', 'name', 'role', 'body', 'summary', 'headline', 'paragraph'];
const IMAGE_FIELDS = ['imageUrl', 'backgroundImage', 'src', 'image', 'logo', 'icon', 'avatar', 'thumbnail', 'photo', 'banner', 'heroImage', 'coverImage'];
const ARRAY_IMAGE_FIELDS = ['images', 'gallery', 'slides', 'photos', 'items', 'features', 'testimonials', 'team', 'products', 'cards'];

function isTextField(key: string, value: any): boolean {
  if (typeof value !== 'string') return false;
  const lower = key.toLowerCase();
  return TEXT_FIELDS.some(f => lower.includes(f.toLowerCase())) || (value.length > 0 && value.length < 500 && !value.startsWith('http') && !value.startsWith('/'));
}

function isImageField(key: string, value: any): boolean {
  if (typeof value !== 'string') return false;
  const lower = key.toLowerCase();
  return IMAGE_FIELDS.some(f => lower.includes(f.toLowerCase())) || /\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(value);
}

function isLongTextField(key: string, value: any): boolean {
  return typeof value === 'string' && value.length > 100;
}

function getEditableFields(props: Record<string, any>) {
  const textFields: { key: string; value: string; isLong: boolean }[] = [];
  const imageFields: { key: string; value: string }[] = [];
  const arrayFields: { key: string; value: any[] }[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (key === 'id' || key === 'key' || key === 'className' || key === 'style') continue;

    if (isImageField(key, value)) {
      imageFields.push({ key, value });
    } else if (isTextField(key, value)) {
      textFields.push({ key, value, isLong: isLongTextField(key, value) });
    } else if (Array.isArray(value) && value.length > 0 && ARRAY_IMAGE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      arrayFields.push({ key, value });
    }
  }

  return { textFields, imageFields, arrayFields };
}

function humanize(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

export function SectionContentEditor({ websiteId, pages, onStructureUpdate, pagesDerivedFromNav, vercelDeploymentUrl, isImportAllInProgress }: SectionContentEditorProps) {
  const [selectedPagePath, setSelectedPagePath] = useState(pages[0]?.path || '/');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingProps, setEditingProps] = useState<Record<string, Record<string, any>>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState<{ sectionType: string; fieldKey: string; arrayIndex?: number; itemKey?: string } | null>(null);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importAllUrlOpen, setImportAllUrlOpen] = useState(false);
  const [importAllUrl, setImportAllUrl] = useState(vercelDeploymentUrl || '');
  const needsImportAll = pagesDerivedFromNav && !vercelDeploymentUrl && !isImportAllInProgress && !importingAll;
  const [importingAll, setImportingAll] = useState(false);
  const autoImportTriggeredRef = useRef(false);

  // Auto-trigger import-all when structure is empty, navConfig has pages, and we have a live URL
  useEffect(() => {
    if (!pagesDerivedFromNav || !vercelDeploymentUrl || isImportAllInProgress || importingAll || autoImportTriggeredRef.current) return;
    const base = vercelDeploymentUrl.trim();
    if (!base) return;
    autoImportTriggeredRef.current = true;
    setImportingAll(true);
    fetch(`/api/websites/${websiteId}/import-all-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: base }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          toast.info('Importing your content from your live site. This may take a few minutes.');
          onStructureUpdate();
        }
      })
      .catch(() => {})
      .finally(() => setImportingAll(false));
  }, [websiteId, pagesDerivedFromNav, vercelDeploymentUrl, isImportAllInProgress, importingAll, onStructureUpdate]);

  const handlePageChange = (path: string) => {
    setSelectedPagePath(path);
    setExpandedSections(new Set());
    setEditingProps({});
  };

  const currentPage = pages.find(p => p.path === selectedPagePath) || pages[0];
  const components = currentPage?.components || [];

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setExpandedSections(next);
  };

  const getEditProps = (sectionType: string, originalProps: Record<string, any>) => {
    return editingProps[sectionType] || originalProps;
  };

  const updateLocalProp = (sectionType: string, key: string, value: any, originalProps: Record<string, any>) => {
    setEditingProps(prev => ({
      ...prev,
      [sectionType]: { ...(prev[sectionType] || originalProps), [key]: value },
    }));
  };

  const updateArrayItemProp = (sectionType: string, arrayKey: string, index: number, itemKey: string, value: any, originalProps: Record<string, any>) => {
    const current = { ...(editingProps[sectionType] || originalProps) };
    const arr = [...(current[arrayKey] || [])];
    arr[index] = { ...arr[index], [itemKey]: value };
    current[arrayKey] = arr;
    setEditingProps(prev => ({ ...prev, [sectionType]: current }));
  };

  const removeArrayItem = (sectionType: string, arrayKey: string, index: number, originalProps: Record<string, any>) => {
    const current = { ...(editingProps[sectionType] || originalProps) };
    const arr = [...(current[arrayKey] || [])];
    arr.splice(index, 1);
    current[arrayKey] = arr;
    setEditingProps(prev => ({ ...prev, [sectionType]: current }));
  };

  const addArrayItem = (sectionType: string, arrayKey: string, originalProps: Record<string, any>) => {
    const current = { ...(editingProps[sectionType] || originalProps) };
    const arr = [...(current[arrayKey] || [])];
    const template = arr[0] ? Object.fromEntries(Object.keys(arr[0]).map(k => [k, ''])) : { title: '', description: '', imageUrl: '' };
    arr.push(template);
    current[arrayKey] = arr;
    setEditingProps(prev => ({ ...prev, [sectionType]: current }));
  };

  const saveSection = async (sectionType: string) => {
    const propsToSave = editingProps[sectionType];
    if (!propsToSave) return;

    setSavingSection(sectionType);
    try {
      const res = await fetch(`/api/websites/${websiteId}/structure`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'section_props',
          sectionType,
          pagePath: selectedPagePath,
          props: propsToSave,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${humanize(sectionType)} updated!`);
      setEditingProps(prev => { const next = { ...prev }; delete next[sectionType]; return next; });
      onStructureUpdate();
    } catch {
      toast.error('Failed to save section');
    } finally {
      setSavingSection(null);
    }
  };

  const aiRewrite = async (sectionType: string, fieldKey: string, currentText: string, originalProps: Record<string, any>, instruction?: string) => {
    const loadingKey = `${sectionType}.${fieldKey}`;
    setAiLoading(loadingKey);
    try {
      const res = await fetch(`/api/websites/${websiteId}/ai-rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText, field: fieldKey, sectionType, instruction }),
      });
      if (!res.ok) throw new Error('AI rewrite failed');
      const { rewritten } = await res.json();
      updateLocalProp(sectionType, fieldKey, rewritten, originalProps);
      toast.success('AI suggestion applied — review and save');
    } catch {
      toast.error('AI rewrite failed');
    } finally {
      setAiLoading(null);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (!mediaPickerOpen) return;
    const { sectionType, fieldKey, arrayIndex, itemKey } = mediaPickerOpen;
    const comp = components.find(c => c.type === sectionType);
    if (!comp) return;

    if (arrayIndex !== undefined && itemKey) {
      updateArrayItemProp(sectionType, fieldKey, arrayIndex, itemKey, url, comp.props);
    } else {
      updateLocalProp(sectionType, fieldKey, url, comp.props);
    }
    setMediaPickerOpen(null);
  };

  const hasUnsavedChanges = (sectionType: string) => !!editingProps[sectionType];

  return (
    <div className="space-y-4">
      {/* Page Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label className="font-medium">Page</Label>
        </div>
        <Select value={selectedPagePath} onValueChange={handlePageChange}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pages.map(page => (
              <SelectItem key={page.path} value={page.path}>
                {page.name || page.path} ({page.components?.length || 0} sections)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {components.length} section{components.length !== 1 ? 's' : ''}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setImportUrlOpen(true)}
          disabled={importing}
        >
          <Link2 className="h-3.5 w-3.5" />
          Import from URL
        </Button>
        {(pagesDerivedFromNav || needsImportAll) && (
          <Button
            variant={needsImportAll ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setImportAllUrl(vercelDeploymentUrl || importAllUrl || '');
              setImportAllUrlOpen(true);
            }}
            disabled={importingAll || isImportAllInProgress}
          >
            {(importingAll || isImportAllInProgress) ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Importing all pages…
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Import all pages
              </>
            )}
          </Button>
        )}
      </div>

      {/* Import all pages banner when URL missing */}
      {needsImportAll && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription>
            <p className="font-medium">Import your content</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your live site URL isn&apos;t set. Click &quot;Import all pages&quot; and enter your site URL (e.g. https://yoursite.vercel.app) to import all pages with text and images. You can also add the URL in Settings for future auto-import.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Import from URL Dialog */}
      <Dialog open={importUrlOpen} onOpenChange={setImportUrlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import content for this page</DialogTitle>
            <DialogDescription>
              Scrape a URL and add its sections (Hero, About, images, etc.) to <strong>{pages.find(p => p.path === selectedPagePath)?.name || selectedPagePath}</strong>. For best results, use the exact page URL (e.g. yoursite.com/about for the About page). Runs in the background — refresh in a minute to see results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-url">Website URL</Label>
              <Input
                id="import-url"
                placeholder="https://yoursite.com/about"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                disabled={importing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportUrlOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!importUrl.trim()) {
                  toast.error('Enter a URL');
                  return;
                }
                setImporting(true);
                try {
                  const res = await fetch(`/api/websites/${websiteId}/import-from-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: importUrl.trim(), pagePath: selectedPagePath }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Import failed');
                  toast.success(data.message || 'Import started. Refresh in a minute to see your content.');
                  setImportUrl('');
                  setImportUrlOpen(false);
                  onStructureUpdate();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to import');
                } finally {
                  setImporting(false);
                }
              }}
              disabled={importing || !importUrl.trim()}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing…
                </>
              ) : (
                'Import'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import all pages Dialog */}
      <Dialog open={importAllUrlOpen} onOpenChange={setImportAllUrlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import all pages from your live site</DialogTitle>
            <DialogDescription>
              Enter your live site URL. We&apos;ll scrape every page in your menu (Home, About, Contact, etc.) and populate the editor with your actual text and images. This may take a few minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-all-url">Live site URL</Label>
              <Input
                id="import-all-url"
                placeholder="https://yoursite.vercel.app"
                value={importAllUrl}
                onChange={(e) => setImportAllUrl(e.target.value)}
                disabled={importingAll || isImportAllInProgress}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportAllUrlOpen(false)} disabled={importingAll || isImportAllInProgress}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!importAllUrl.trim()) {
                  toast.error('Enter your live site URL');
                  return;
                }
                setImportingAll(true);
                try {
                  const res = await fetch(`/api/websites/${websiteId}/import-all-pages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ baseUrl: importAllUrl.trim() }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Import failed');
                  toast.success(data.message || 'Importing all pages. Refresh in a few minutes.');
                  setImportAllUrlOpen(false);
                  onStructureUpdate();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to import');
                } finally {
                  setImportingAll(false);
                }
              }}
              disabled={importingAll || isImportAllInProgress || !importAllUrl.trim()}
            >
              {(importingAll || isImportAllInProgress) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing…
                </>
              ) : (
                'Import all pages'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template hint */}
      {pagesDerivedFromNav && components.length > 0 && (
        <p className="text-xs text-muted-foreground">
          These are starter sections for your template page. Edit them below, then save to persist your changes.
        </p>
      )}

      {/* Sections */}
      {components.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No sections on this page yet.</p>
            <p className="text-sm mt-1">
              Use the Editor tab to add sections, or use AI Chat to build content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-250px)]">
          <div className="space-y-3 pr-3">
            {components.map((comp, idx) => {
              const props = getEditProps(comp.type, comp.props);
              const { textFields, imageFields, arrayFields } = getEditableFields(props);
              const isExpanded = expandedSections.has(comp.type);
              const unsaved = hasUnsavedChanges(comp.type);
              const isSaving = savingSection === comp.type;
              const editableCount = textFields.length + imageFields.length + arrayFields.length;

              return (
                <Collapsible key={comp.id || `${comp.type}-${idx}`} open={isExpanded} onOpenChange={() => toggleSection(comp.type)}>
                  <Card className={`transition-colors ${unsaved ? 'border-amber-400 bg-amber-50/30' : ''}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <CardTitle className="text-sm font-medium">{humanize(comp.type)}</CardTitle>
                            <Badge variant="secondary" className="text-xs">{editableCount} fields</Badge>
                            {unsaved && <Badge className="bg-amber-500 text-white text-xs">Unsaved</Badge>}
                          </div>
                          {unsaved && (
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingProps(prev => { const next = { ...prev }; delete next[comp.type]; return next; })}>
                                <RotateCcw className="h-3 w-3 mr-1" /> Revert
                              </Button>
                              <Button size="sm" className="h-7 text-xs" onClick={() => saveSection(comp.type)} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 space-y-4">
                        {/* Text Fields */}
                        {textFields.map(({ key, value, isLong }) => (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground">{humanize(key)}</Label>
                              <Button
                                size="sm" variant="ghost"
                                className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1"
                                disabled={aiLoading === `${comp.type}.${key}` || !value}
                                onClick={() => aiRewrite(comp.type, key, props[key] || value, comp.props)}
                              >
                                {aiLoading === `${comp.type}.${key}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                AI Rewrite
                              </Button>
                            </div>
                            {isLong ? (
                              <Textarea
                                value={props[key] ?? value}
                                onChange={e => updateLocalProp(comp.type, key, e.target.value, comp.props)}
                                className="min-h-[80px] text-sm"
                                rows={3}
                              />
                            ) : (
                              <Input
                                value={props[key] ?? value}
                                onChange={e => updateLocalProp(comp.type, key, e.target.value, comp.props)}
                                className="text-sm"
                              />
                            )}
                          </div>
                        ))}

                        {/* Image Fields */}
                        {imageFields.map(({ key, value }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">{humanize(key)}</Label>
                            <div className="flex items-center gap-3">
                              {(props[key] || value) && (
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                                  <img src={props[key] || value} alt={key} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 space-y-2">
                                <Input value={props[key] ?? value} onChange={e => updateLocalProp(comp.type, key, e.target.value, comp.props)} placeholder="Image URL" className="text-sm" />
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMediaPickerOpen({ sectionType: comp.type, fieldKey: key })}>
                                    <Upload className="h-3 w-3 mr-1" /> Browse / Upload
                                  </Button>
                                  {(props[key] || value) && (
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => updateLocalProp(comp.type, key, '', comp.props)}>
                                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Array Fields (items, products, features, etc.) */}
                        {arrayFields.map(({ key, value: items }) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground">{humanize(key)} ({(props[key] || items).length} items)</Label>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addArrayItem(comp.type, key, comp.props)}>
                                <Plus className="h-3 w-3 mr-1" /> Add Item
                              </Button>
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-muted">
                              {(props[key] || items).map((item: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 border space-y-2 relative">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => removeArrayItem(comp.type, key, i, comp.props)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {Object.entries(item).filter(([k]) => k !== 'id' && k !== 'key').map(([itemKey, itemVal]) => {
                                    if (isImageField(itemKey, itemVal)) {
                                      return (
                                        <div key={itemKey} className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">{humanize(itemKey)}</Label>
                                          <div className="flex items-center gap-2">
                                            {itemVal && typeof itemVal === 'string' && (
                                              <div className="w-12 h-12 rounded overflow-hidden border bg-muted flex-shrink-0">
                                                <img src={itemVal as string} alt="" className="w-full h-full object-cover" />
                                              </div>
                                            )}
                                            <Input value={(itemVal as string) || ''} onChange={e => updateArrayItemProp(comp.type, key, i, itemKey, e.target.value, comp.props)} className="text-xs h-8" placeholder="Image URL" />
                                            <Button size="sm" variant="outline" className="h-8 text-xs flex-shrink-0" onClick={() => setMediaPickerOpen({ sectionType: comp.type, fieldKey: key, arrayIndex: i, itemKey })}>
                                              <Upload className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    if (typeof itemVal === 'string') {
                                      return (
                                        <div key={itemKey} className="space-y-1">
                                          <div className="flex items-center justify-between">
                                            <Label className="text-xs text-muted-foreground">{humanize(itemKey)}</Label>
                                            {(itemVal as string).length > 10 && (
                                              <Button size="sm" variant="ghost" className="h-5 text-[10px] text-purple-600 gap-0.5 px-1" onClick={() => {
                                                const currentArr = [...(props[key] || items)];
                                                const currentText = currentArr[i]?.[itemKey] || (itemVal as string);
                                                setAiLoading(`${comp.type}.${key}.${i}.${itemKey}`);
                                                fetch(`/api/websites/${websiteId}/ai-rewrite`, {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ text: currentText, field: itemKey, sectionType: comp.type }),
                                                }).then(r => r.ok ? r.json() : Promise.reject()).then(d => {
                                                  updateArrayItemProp(comp.type, key, i, itemKey, d.rewritten, comp.props);
                                                  toast.success('AI suggestion applied');
                                                }).catch(() => toast.error('AI rewrite failed')).finally(() => setAiLoading(null));
                                              }} disabled={aiLoading === `${comp.type}.${key}.${i}.${itemKey}`}>
                                                {aiLoading === `${comp.type}.${key}.${i}.${itemKey}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                AI
                                              </Button>
                                            )}
                                          </div>
                                          {(itemVal as string).length > 80 ? (
                                            <Textarea value={(itemVal as string) || ''} onChange={e => updateArrayItemProp(comp.type, key, i, itemKey, e.target.value, comp.props)} className="text-xs min-h-[60px]" rows={2} />
                                          ) : (
                                            <Input value={(itemVal as string) || ''} onChange={e => updateArrayItemProp(comp.type, key, i, itemKey, e.target.value, comp.props)} className="text-xs h-8" />
                                          )}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {editableCount === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            This section has no editable text or image fields.
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Media Picker Dialog */}
      <MediaPicker
        websiteId={websiteId}
        open={!!mediaPickerOpen}
        onSelect={handleMediaSelect}
        onClose={() => setMediaPickerOpen(null)}
        type="IMAGE"
      />
    </div>
  );
}
