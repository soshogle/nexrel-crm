'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Package, FileText, Video } from 'lucide-react';
import { toast } from 'sonner';

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
}

interface EcommerceContent {
  products: unknown[];
  pages: PageData[];
  videos: { url: string; title?: string }[];
  policies: Record<string, { title: string; slug: string; content: string }>;
}

export function EcommerceContentEditor({
  websiteId,
  onSaved,
}: {
  websiteId: string;
  onSaved?: () => void;
}) {
  const [content, setContent] = useState<EcommerceContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPages, setEditedPages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/websites/${websiteId}/ecommerce-content`)
      .then((r) => r.json())
      .then((data) => {
        if (data.pages && Array.isArray(data.pages)) {
          setContent({
            products: data.products ?? [],
            pages: data.pages,
            videos: data.videos ?? [],
            policies: data.policies ?? {},
          });
          const initial: Record<string, string> = {};
          for (const p of data.pages) {
            initial[p.slug] = p.content ?? '';
          }
          setEditedPages(initial);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [websiteId]);

  const handleSavePage = async (slug: string) => {
    if (!content) return;
    setSaving(true);
    try {
      const updatedPages = content.pages.map((p) =>
        p.slug === slug ? { ...p, content: editedPages[slug] ?? p.content } : p
      );
      const res = await fetch(`/api/websites/${websiteId}/ecommerce-content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: updatedPages }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setContent((c) => (c ? { ...c, pages: updatedPages } : null));
      toast.success('Page saved. Changes will appear on your live site.');
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const policySlugs = ['shipping-and-returns', 'privacy-policy-for-darksword-armory-inc', 'terms-and-conditions'];
  const policyPages = content?.pages?.filter((p) => policySlugs.includes(p.slug)) ?? [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!content || content.pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>E-commerce Content</CardTitle>
          <CardDescription>
            No content yet. Run the seed script to import products and pages from your static data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1">npm run seed:darksword-ecommerce</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-commerce Content</CardTitle>
        <CardDescription>
          Edit policy pages and content. Changes appear on your live site without redeploy.
        </CardDescription>
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            {content.products.length} products
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {content.pages.length} pages
          </span>
          <span className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            {content.videos.length} videos
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={policyPages[0]?.slug ?? 'shipping-and-returns'}>
          <TabsList>
            {policyPages.map((p) => (
              <TabsTrigger key={p.slug} value={p.slug}>
                {p.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {policyPages.map((p) => (
            <TabsContent key={p.slug} value={p.slug} className="space-y-4 mt-4">
              <div>
                <Label>Content (HTML)</Label>
                <Textarea
                  className="min-h-[300px] font-mono text-sm mt-2"
                  value={editedPages[p.slug] ?? p.content}
                  onChange={(e) =>
                    setEditedPages((prev) => ({ ...prev, [p.slug]: e.target.value }))
                  }
                />
              </div>
              <Button onClick={() => handleSavePage(p.slug)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save {p.title}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
