'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionEditor } from '@/components/website-builder/section-editor';
import { SectionRewriteEditor } from '@/components/website-builder/section-rewrite-editor';
import { GlobalStylesEditor } from '@/components/website-builder/global-styles-editor';
import { WebsiteFilesManager } from '@/components/website-builder/website-files-manager';
import { Eye, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractPages } from '@/lib/website-builder/extract-pages';

interface EditorTabProps {
  website: any;
  selectedPageIndex: number;
  setSelectedPageIndex: (i: number) => void;
  editorMode: 'simple' | 'advanced';
  setEditorMode: (m: any) => void;
  fetchWebsite: () => Promise<void>;
  onPreview: () => void;
}

export function EditorTab({
  website,
  selectedPageIndex,
  setSelectedPageIndex,
  editorMode,
  setEditorMode,
  fetchWebsite,
  onPreview,
}: EditorTabProps) {
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [templateFallbackOpen, setTemplateFallbackOpen] = useState(false);
  const [fallbackTemplates, setFallbackTemplates] = useState<any[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const pages = extractPages(website.structure);
  const isBuilding = website.status === 'BUILDING';

  return (
    <>
      <Dialog open={templateFallbackOpen} onOpenChange={setTemplateFallbackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Use a template instead</DialogTitle>
            <DialogDescription>
              Add sections from a pre-built template to your page. These templates work without scraping.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {fallbackTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading templates…</p>
            ) : (
              fallbackTemplates.map((tpl: any) => (
                <Button
                  key={tpl.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  disabled={applyingTemplate}
                  onClick={async () => {
                    setApplyingTemplate(true);
                    try {
                      const pagePath = pages[selectedPageIndex]?.path || '/';
                      const res = await fetch(`/api/websites/${website?.id}/apply-template`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ templateId: tpl.id, pagePath }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed');
                      toast.success(`Added ${data.addedCount} sections from ${tpl.name}`);
                      setTemplateFallbackOpen(false);
                      await fetchWebsite();
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to apply template');
                    } finally {
                      setApplyingTemplate(false);
                    }
                  }}
                >
                  <span className="font-medium">{tpl.name}</span>
                  {tpl.category && (
                    <span className="text-muted-foreground text-xs ml-2">({tpl.category})</span>
                  )}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Customize your website below. When ready, preview or publish.
        </p>
        <Button onClick={onPreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview Website
        </Button>
      </div>
      <GlobalStylesEditor
        styles={website.structure?.globalStyles}
        onSave={async (styles) => {
          const res = await fetch(`/api/websites/${website.id}/structure`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'global_styles', globalStyles: styles }),
          });
          if (!res.ok) throw new Error((await res.json()).error);
          await fetchWebsite();
        }}
      />
      <WebsiteFilesManager websiteId={website.id} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Page Sections</CardTitle>
              <CardDescription>
                Drag sections to reorder. Click an image to replace, or use AI Chat to add or change content.
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Simple:</strong> Reorder and delete only. <strong>Advanced:</strong> Layout, image replace, and config per section.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SectionRewriteEditor
                websiteId={website.id}
                pages={pages}
                selectedPageIndex={selectedPageIndex}
                onSave={async (pagePath, sectionType, props) => {
                  const res = await fetch(`/api/websites/${website.id}/structure`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'section_props',
                      sectionType,
                      pagePath,
                      props,
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  await fetchWebsite();
                }}
              />
              <Dialog open={importUrlOpen} onOpenChange={setImportUrlOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Import from URL
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import from URL</DialogTitle>
                    <DialogDescription>
                      Scrape a website and add its sections (Hero, About, images, contact form, etc.) to the current page. Runs in the background — you can close this and come back in a minute.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="import-url">Website URL</Label>
                      <Input
                        id="import-url"
                        placeholder="https://example.com"
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
                          const pagePath = pages[selectedPageIndex]?.path || '/';
                          const res = await fetch(`/api/websites/${website.id}/import-from-url`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: importUrl.trim(), pagePath }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Import failed');
                          if (data.status === 'in_progress') {
                            toast.success(data.message || 'Import started. Come back in a minute or refresh.');
                            setImportUrl('');
                            setImportUrlOpen(false);
                            await fetchWebsite();
                          } else {
                            toast.success(`Added ${data.addedCount} sections from the URL`);
                            setImportUrl('');
                            setImportUrlOpen(false);
                            await fetchWebsite();
                          }
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
              {pages.length > 1 && (
                <Tabs
                  value={String(selectedPageIndex)}
                  onValueChange={(v) => setSelectedPageIndex(parseInt(v, 10))}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    {pages.map((p: any, i: number) => (
                      <TabsTrigger key={p.id || i} value={String(i)} className="text-xs">
                        {p.name || p.path || `Page ${i + 1}`}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v)} className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="simple" className="text-xs">Simple</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SectionEditor
            compactMode={editorMode === 'simple'}
            websiteId={website.id}
            pagePath={pages[selectedPageIndex]?.path || '/'}
            components={pages[selectedPageIndex]?.components || []}
            isBuilding={isBuilding}
            buildProgress={website.buildProgress ?? 0}
            onReorder={async (from, to) => {
              const pagePath = pages[selectedPageIndex]?.path || '/';
              const res = await fetch('/api/ai-assistant/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'reorder_section',
                  parameters: { websiteId: website.id, fromIndex: from, toIndex: to, pagePath },
                }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              await fetchWebsite();
            }}
            onDelete={async (sectionType) => {
              const pagePath = pages[selectedPageIndex]?.path || '/';
              const res = await fetch('/api/ai-assistant/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'delete_section',
                  parameters: { websiteId: website.id, sectionType, pagePath },
                }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              await fetchWebsite();
            }}
            onUpdateImage={async (sectionType, imageUrl, alt) => {
              const pagePath = pages[selectedPageIndex]?.path || '/';
              const res = await fetch('/api/ai-assistant/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'add_website_image',
                  parameters: { websiteId: website.id, sectionType, imageUrl, alt, pagePath },
                }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              await fetchWebsite();
            }}
            onUpdateLayout={async (sectionType, layout) => {
              const pagePath = pages[selectedPageIndex]?.path || '/';
              const res = await fetch(`/api/websites/${website.id}/structure`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'section_layout',
                  sectionType,
                  pagePath,
                  layout: {
                    padding: layout.padding,
                    margin: layout.margin,
                    alignment: layout.alignment,
                    visibility: layout.visibility,
                  },
                }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              await fetchWebsite();
            }}
            onUpdateProps={async (sectionType, props) => {
              const pagePath = pages[selectedPageIndex]?.path || '/';
              const res = await fetch(`/api/websites/${website.id}/structure`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'section_props',
                  sectionType,
                  pagePath,
                  props,
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || 'Failed to save');
              if (data.deploy?.ok) {
                toast.success('Saved! Deploying to live site…');
              } else if (data.deploy?.error) {
                toast.warning('Saved, but deploy failed: ' + data.deploy.error);
              }
              await fetchWebsite();
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
