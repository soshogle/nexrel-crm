'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Image as ImageIcon, Globe, FileText } from 'lucide-react';
import { toast } from 'sonner';

export interface GlobalSeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  twitterCard?: string;
}

export interface PageSeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
}

interface SeoEditorProps {
  websiteId: string;
  websiteName: string;
  seoData: GlobalSeoData | null;
  structure: { pages?: Array<{ id?: string; name?: string; path?: string; seo?: PageSeoData }> } | null;
  onSave: (data: { seoData?: GlobalSeoData; pageSeo?: Record<string, PageSeoData> }) => Promise<void>;
}

export function SeoEditor({
  websiteId,
  websiteName,
  seoData,
  structure,
  onSave,
}: SeoEditorProps) {
  const [globalSeo, setGlobalSeo] = useState<GlobalSeoData>({});
  const [pageSeoMap, setPageSeoMap] = useState<Record<string, PageSeoData>>({});
  const [saving, setSaving] = useState(false);

  const pages = structure?.pages || [];

  useEffect(() => {
    setGlobalSeo((seoData as GlobalSeoData) || {});
  }, [seoData]);

  useEffect(() => {
    const map: Record<string, PageSeoData> = {};
    pages.forEach((p) => {
      const path = p.path || '/';
      map[path] = p.seo || {};
    });
    setPageSeoMap(map);
  }, [structure?.pages]);

  const handleSaveGlobal = async () => {
    setSaving(true);
    try {
      await onSave({ seoData: globalSeo });
      toast.success('Global SEO settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePageSeo = async (path: string, data: PageSeoData) => {
    setSaving(true);
    try {
      const updated = { ...pageSeoMap, [path]: data };
      await onSave({ pageSeo: updated });
      setPageSeoMap(updated);
      toast.success('Page SEO saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updatePageSeo = (path: string, field: keyof PageSeoData, value: string | string[] | undefined) => {
    setPageSeoMap((prev) => ({
      ...prev,
      [path]: { ...(prev[path] || {}), [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Global SEO</TabsTrigger>
          <TabsTrigger value="pages">Per-Page SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Site SEO
              </CardTitle>
              <CardDescription>
                Default meta tags for your entire site. Used when a page doesn&apos;t have its own SEO settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meta Title</Label>
                <Input
                  id="title"
                  placeholder={websiteName || 'Your Business Name'}
                  value={globalSeo.title || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, title: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Recommended: 50–60 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Meta Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business and what visitors will find on your site."
                  value={globalSeo.description || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, description: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Recommended: 150–160 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  placeholder="real estate, broker, Montreal, homes"
                  value={Array.isArray(globalSeo.keywords) ? globalSeo.keywords.join(', ') : ''}
                  onChange={(e) =>
                    setGlobalSeo((s) => ({
                      ...s,
                      keywords: e.target.value ? e.target.value.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogImage">Open Graph Image URL</Label>
                <Input
                  id="ogImage"
                  placeholder="https://yoursite.com/og-image.jpg"
                  value={globalSeo.ogImage || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, ogImage: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Image shown when sharing on social (1200×630px recommended)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogTitle">OG Title (override)</Label>
                <Input
                  id="ogTitle"
                  placeholder="Leave blank to use default title"
                  value={globalSeo.ogTitle || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, ogTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG Description (override)</Label>
                <Textarea
                  id="ogDescription"
                  placeholder="Leave blank to use default description"
                  value={globalSeo.ogDescription || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, ogDescription: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  placeholder="https://yoursite.com"
                  value={globalSeo.canonicalUrl || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, canonicalUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Preferred URL for search engines</p>
              </div>
              <Button onClick={handleSaveGlobal} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Save Global SEO
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Per-Page SEO
              </CardTitle>
              <CardDescription>
                Override meta tags for each page. Leave blank to use global defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pages in structure yet.</p>
              ) : (
                pages.map((page) => {
                  const path = page.path || '/';
                  const name = page.name || path || 'Page';
                  const seo = pageSeoMap[path] || {};
                  return (
                    <div key={path} className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">{name} ({path})</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Page Title</Label>
                          <Input
                            placeholder={`${name} - ${websiteName}`}
                            value={seo.title || ''}
                            onChange={(e) => updatePageSeo(path, 'title', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Page Description</Label>
                          <Textarea
                            placeholder="Page-specific description for search results"
                            value={seo.description || ''}
                            onChange={(e) => updatePageSeo(path, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Keywords</Label>
                          <Input
                            placeholder="Page-specific keywords"
                            value={Array.isArray(seo.keywords) ? seo.keywords.join(', ') : ''}
                            onChange={(e) =>
                              updatePageSeo(
                                path,
                                'keywords',
                                e.target.value ? e.target.value.split(',').map((k) => k.trim()).filter(Boolean) : undefined
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>OG Image URL</Label>
                          <Input
                            placeholder="Page-specific share image"
                            value={seo.ogImage || ''}
                            onChange={(e) => updatePageSeo(path, 'ogImage', e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSavePageSeo(path, pageSeoMap[path] || {})}
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save {name}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
