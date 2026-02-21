'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Globe, FileText, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { extractPages } from '@/lib/website-builder/extract-pages';

export interface GlobalSeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  twitterCard?: string;
  locale?: string;
  type?: string;
  robots?: string;
  googleVerification?: string;
  bingVerification?: string;
  favicon?: string;
}

export interface PageSeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  robots?: string;
  canonicalUrl?: string;
}

interface SeoEditorProps {
  websiteId: string;
  websiteName: string;
  seoData: GlobalSeoData | null;
  structure: any;
  onSave: (data: { seoData?: GlobalSeoData; pageSeo?: Record<string, PageSeoData> }) => Promise<void>;
}

function SeoScore({ seo, label }: { seo: GlobalSeoData | PageSeoData; label?: string }) {
  let score = 0;
  let total = 0;

  const checks = [
    { ok: !!seo.title && seo.title.length >= 10, label: 'Title (10+ chars)' },
    { ok: !!seo.title && seo.title.length <= 60, label: 'Title under 60 chars' },
    { ok: !!seo.description && seo.description.length >= 50, label: 'Description (50+ chars)' },
    { ok: !!seo.description && seo.description.length <= 160, label: 'Description under 160 chars' },
    { ok: Array.isArray(seo.keywords) && seo.keywords.length >= 2, label: 'Keywords (2+)' },
    { ok: !!seo.ogImage, label: 'OG Image set' },
  ];

  checks.forEach((c) => {
    total++;
    if (c.ok) score++;
  });

  const pct = Math.round((score / total) * 100);
  const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="flex items-center gap-2">
      {pct >= 80 ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      )}
      <span className={`text-sm font-medium ${color}`}>
        {label ? `${label}: ` : ''}SEO Score: {pct}%
      </span>
      <span className="text-xs text-muted-foreground">({score}/{total} checks)</span>
    </div>
  );
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
  const [generating, setGenerating] = useState(false);

  const pages = extractPages(structure);

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
  }, [structure]);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/generate-seo`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setGlobalSeo(data.globalSeo || {});
      toast.success(`SEO auto-generated for ${data.pagesCount} page(s). Review and save.`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-generate SEO');
    } finally {
      setGenerating(false);
    }
  };

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

  const titleLen = (globalSeo.title || '').length;
  const descLen = (globalSeo.description || '').length;

  return (
    <div className="space-y-6">
      {/* Auto-Generate Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Auto-Generate SEO
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                Automatically fill in titles, descriptions, keywords, and Open Graph tags for all pages based on your website content.
              </p>
            </div>
            <Button onClick={handleAutoGenerate} disabled={generating} variant="default" size="sm">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating...' : 'Auto-Generate All SEO'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Global SEO</TabsTrigger>
          <TabsTrigger value="pages">Per-Page SEO ({pages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Site SEO
              </CardTitle>
              <CardDescription>
                Default meta tags for your entire site. These are used when a page doesn&apos;t have its own overrides.
              </CardDescription>
              <SeoScore seo={globalSeo} />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meta Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Meta Title</Label>
                <Input
                  id="title"
                  placeholder={websiteName || 'Your Business Name'}
                  value={globalSeo.title || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, title: e.target.value }))}
                />
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">Recommended: 50–60 characters</p>
                  <Badge variant={titleLen >= 50 && titleLen <= 60 ? 'default' : titleLen > 0 ? 'secondary' : 'outline'} className="text-xs">
                    {titleLen}/60
                  </Badge>
                </div>
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Meta Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business and what visitors will find on your site."
                  value={globalSeo.description || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, description: e.target.value }))}
                  rows={3}
                />
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">Recommended: 150–160 characters</p>
                  <Badge variant={descLen >= 120 && descLen <= 160 ? 'default' : descLen > 0 ? 'secondary' : 'outline'} className="text-xs">
                    {descLen}/160
                  </Badge>
                </div>
              </div>

              {/* Keywords */}
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
                <p className="text-xs text-muted-foreground">
                  Target 3–8 relevant keywords for your business
                </p>
              </div>

              {/* Canonical URL */}
              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input
                  id="canonicalUrl"
                  placeholder="https://yoursite.com"
                  value={globalSeo.canonicalUrl || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, canonicalUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">The preferred URL search engines should index</p>
              </div>

              {/* Robots Directive */}
              <div className="space-y-2">
                <Label htmlFor="robots">Robots Directive</Label>
                <Select
                  value={globalSeo.robots || 'index, follow'}
                  onValueChange={(v) => setGlobalSeo((s) => ({ ...s, robots: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="index, follow">Index &amp; Follow (recommended)</SelectItem>
                    <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                    <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                    <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Controls how search engines crawl and index your site</p>
              </div>

              {/* Locale */}
              <div className="space-y-2">
                <Label htmlFor="locale">Locale / Language</Label>
                <Select
                  value={globalSeo.locale || 'en_US'}
                  onValueChange={(v) => setGlobalSeo((s) => ({ ...s, locale: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="en_GB">English (UK)</SelectItem>
                    <SelectItem value="en_CA">English (Canada)</SelectItem>
                    <SelectItem value="fr_FR">French (France)</SelectItem>
                    <SelectItem value="fr_CA">French (Canada)</SelectItem>
                    <SelectItem value="es_ES">Spanish</SelectItem>
                    <SelectItem value="de_DE">German</SelectItem>
                    <SelectItem value="it_IT">Italian</SelectItem>
                    <SelectItem value="pt_BR">Portuguese (Brazil)</SelectItem>
                    <SelectItem value="zh_CN">Chinese (Simplified)</SelectItem>
                    <SelectItem value="ja_JP">Japanese</SelectItem>
                    <SelectItem value="ko_KR">Korean</SelectItem>
                    <SelectItem value="ar_SA">Arabic</SelectItem>
                    <SelectItem value="he_IL">Hebrew</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Open Graph section header */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-3">Open Graph &amp; Social Sharing</h4>
              </div>

              {/* OG Image */}
              <div className="space-y-2">
                <Label htmlFor="ogImage">OG Image URL</Label>
                <Input
                  id="ogImage"
                  placeholder="https://yoursite.com/og-image.jpg"
                  value={globalSeo.ogImage || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, ogImage: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Image shown when sharing on social media (1200x630px recommended)</p>
              </div>

              {/* OG Title */}
              <div className="space-y-2">
                <Label htmlFor="ogTitle">OG Title (override)</Label>
                <Input
                  id="ogTitle"
                  placeholder="Leave blank to use meta title"
                  value={globalSeo.ogTitle || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, ogTitle: e.target.value }))}
                />
              </div>

              {/* OG Description */}
              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG Description (override)</Label>
                <Textarea
                  id="ogDescription"
                  placeholder="Leave blank to use meta description"
                  value={globalSeo.ogDescription || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, ogDescription: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Twitter Card */}
              <div className="space-y-2">
                <Label htmlFor="twitterCard">Twitter Card Type</Label>
                <Select
                  value={globalSeo.twitterCard || 'summary_large_image'}
                  onValueChange={(v) => setGlobalSeo((s) => ({ ...s, twitterCard: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary_large_image">Summary Large Image (recommended)</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="app">App</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verification header */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-3">Search Engine Verification</h4>
              </div>

              {/* Google Verification */}
              <div className="space-y-2">
                <Label htmlFor="googleVerification">Google Site Verification</Label>
                <Input
                  id="googleVerification"
                  placeholder="Paste your Google verification meta tag content"
                  value={globalSeo.googleVerification || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, googleVerification: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">From Google Search Console &rarr; Settings &rarr; Ownership verification</p>
              </div>

              {/* Bing Verification */}
              <div className="space-y-2">
                <Label htmlFor="bingVerification">Bing Site Verification</Label>
                <Input
                  id="bingVerification"
                  placeholder="Paste your Bing verification code"
                  value={globalSeo.bingVerification || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, bingVerification: e.target.value }))}
                />
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon URL</Label>
                <Input
                  id="favicon"
                  placeholder="https://yoursite.com/favicon.ico"
                  value={globalSeo.favicon || ''}
                  onChange={(e) => setGlobalSeo((s) => ({ ...s, favicon: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Small icon shown in browser tabs (32x32px .ico or .png)</p>
              </div>

              <Button onClick={handleSaveGlobal} disabled={saving} className="mt-2">
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
                <p className="text-sm text-muted-foreground">
                  No pages detected. Build your website first using the Editor or AI Chat tab, then come back to configure per-page SEO.
                </p>
              ) : (
                pages.map((page) => {
                  const path = page.path || '/';
                  const name = page.name || path || 'Page';
                  const seo = pageSeoMap[path] || {};
                  const pageTitleLen = (seo.title || '').length;
                  const pageDescLen = (seo.description || '').length;
                  return (
                    <div key={path} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{name} <span className="text-muted-foreground font-normal">({path})</span></h4>
                        <SeoScore seo={seo} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Page Title</Label>
                          <Input
                            placeholder={`${name} | ${websiteName}`}
                            value={seo.title || ''}
                            onChange={(e) => updatePageSeo(path, 'title', e.target.value)}
                          />
                          <div className="flex justify-between">
                            <p className="text-xs text-muted-foreground">50–60 characters ideal</p>
                            <Badge variant={pageTitleLen >= 50 && pageTitleLen <= 60 ? 'default' : pageTitleLen > 0 ? 'secondary' : 'outline'} className="text-xs">
                              {pageTitleLen}/60
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Page Description</Label>
                          <Textarea
                            placeholder={`Learn about ${name.toLowerCase()} at ${websiteName}`}
                            value={seo.description || ''}
                            onChange={(e) => updatePageSeo(path, 'description', e.target.value)}
                            rows={2}
                          />
                          <div className="flex justify-between">
                            <p className="text-xs text-muted-foreground">150–160 characters ideal</p>
                            <Badge variant={pageDescLen >= 120 && pageDescLen <= 160 ? 'default' : pageDescLen > 0 ? 'secondary' : 'outline'} className="text-xs">
                              {pageDescLen}/160
                            </Badge>
                          </div>
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
                        <div className="space-y-2">
                          <Label>OG Title</Label>
                          <Input
                            placeholder="Leave blank for page title"
                            value={seo.ogTitle || ''}
                            onChange={(e) => updatePageSeo(path, 'ogTitle', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>OG Description</Label>
                          <Input
                            placeholder="Leave blank for page description"
                            value={seo.ogDescription || ''}
                            onChange={(e) => updatePageSeo(path, 'ogDescription', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Canonical URL</Label>
                          <Input
                            placeholder="Leave blank to auto-generate"
                            value={seo.canonicalUrl || ''}
                            onChange={(e) => updatePageSeo(path, 'canonicalUrl', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Robots Directive</Label>
                          <Select
                            value={seo.robots || 'index, follow'}
                            onValueChange={(v) => updatePageSeo(path, 'robots', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="index, follow">Index &amp; Follow</SelectItem>
                              <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                              <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                            </SelectContent>
                          </Select>
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
