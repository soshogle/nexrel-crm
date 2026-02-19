'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import { Loader2, Save, Package, FileText, Video, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
}

interface VariantOption {
  value: string;
  priceModifier?: string;
  colorHex?: string;
}

interface ProductVariant {
  attributeName: string;
  options: VariantOption[];
}

interface ProductData {
  id: string;
  title: string;
  slug: string;
  price: string;
  salePrice?: string;
  image?: string;
  gallery?: string[];
  categories?: string[];
  categorySlugs?: string[];
  description?: string;
  excerpt?: string;
  sku?: string;
  weight?: string;
  stockStatus?: string;
  variants?: ProductVariant[];
}

interface EcommerceContent {
  products: ProductData[];
  pages: PageData[];
  videos: { url: string; title?: string }[];
  policies: Record<string, { title: string; slug: string; content: string }>;
}

const POLICY_SLUGS = [
  'shipping-and-returns',
  'privacy-policy-for-darksword-armory-inc',
  'privacy-policy',
  'terms-and-conditions',
];

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
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`/api/websites/${websiteId}/ecommerce-content`)
      .then((r) => r.json())
      .then((data) => {
        const products = (data.products ?? []) as ProductData[];
        const pages = Array.isArray(data.pages) ? data.pages : [];
        setContent({
          products,
          pages,
          videos: data.videos ?? [],
          policies: data.policies ?? {},
        });
        const initial: Record<string, string> = {};
        for (const p of pages) {
          initial[p.slug] = p.content ?? '';
        }
        setEditedPages(initial);
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

  const handleSaveProduct = async (updated: ProductData) => {
    if (!content) return;
    setSaving(true);
    try {
      // Clean variants: keep only options with non-empty value
      const cleaned = {
        ...updated,
        variants: updated.variants
          ?.map((v) => ({
            ...v,
            options: v.options.filter((o) => o.value?.trim()),
          }))
          .filter((v) => v.options.length > 0),
      };
      const updatedProducts = content.products.map((p) =>
        p.id === updated.id ? cleaned : p
      );
      const res = await fetch(`/api/websites/${websiteId}/ecommerce-content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setContent((c) => (c ? { ...c, products: updatedProducts } : null));
      setEditingProduct(null);
      toast.success('Product saved. Changes will appear on your live site.');
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const policyPages = content?.pages?.filter((p) => POLICY_SLUGS.includes(p.slug)) ?? [];
  const filteredProducts =
    content?.products.filter(
      (p) =>
        !searchQuery ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const hasContent = (content?.products?.length ?? 0) > 0 || (content?.pages?.length ?? 0) > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!content || !hasContent) {
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

  const defaultTab =
    content.products.length > 0 ? 'products' : policyPages[0]?.slug ?? 'content';

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-commerce Content</CardTitle>
        <CardDescription>
          Edit products (prices, sizes, colors, product definitions), policy pages, and content.
          Changes appear on your live site without redeploy.
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
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {content.products.length > 0 && (
              <TabsTrigger value="products">Products</TabsTrigger>
            )}
            {policyPages.map((p) => (
              <TabsTrigger key={p.slug} value={p.slug}>
                {p.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {content.products.length > 0 && (
            <TabsContent value="products" className="space-y-4 mt-4">
              <div>
                <Input
                  placeholder="Search products by title or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50"
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-sm text-muted-foreground">
                        ${p.price}
                        {p.salePrice && parseFloat(p.salePrice) > 0 && (
                          <span className="ml-2 line-through">${p.salePrice}</span>
                        )}
                        {p.sku && (
                          <span className="ml-2 text-muted-foreground">SKU: {p.sku}</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProduct({ ...p })}
                      disabled={saving}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

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
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save {p.title}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Product edit dialog */}
      <ProductEditDialog
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleSaveProduct}
        saving={saving}
      />
    </Card>
  );
}

function ProductEditDialog({
  product,
  onClose,
  onSave,
  saving,
}: {
  product: ProductData | null;
  onClose: () => void;
  onSave: (p: ProductData) => void;
  saving: boolean;
}) {
  const [edited, setEdited] = useState<ProductData | null>(null);

  useEffect(() => {
    setEdited(product ? { ...product } : null);
  }, [product]);

  if (!edited) return null;

  const update = (updates: Partial<ProductData>) =>
    setEdited((p) => (p ? { ...p, ...updates } : null));

  const updateVariant = (index: number, updates: Partial<ProductVariant>) => {
    setEdited((p) => {
      if (!p) return null;
      const variants = [...(p.variants ?? [])];
      variants[index] = { ...variants[index], ...updates };
      return { ...p, variants };
    });
  };

  const addVariant = () => {
    setEdited((p) => {
      if (!p) return null;
      const variants = [...(p.variants ?? [])];
      variants.push({ attributeName: 'Size', options: [{ value: '' }] });
      return { ...p, variants };
    });
  };

  const removeVariant = (index: number) => {
    setEdited((p) => {
      if (!p) return null;
      const variants = [...(p.variants ?? [])].filter((_, i) => i !== index);
      return { ...p, variants };
    });
  };

  const addVariantOption = (variantIndex: number) => {
    setEdited((p) => {
      if (!p) return null;
      const variants = [...(p.variants ?? [])];
      const v = variants[variantIndex];
      if (!v) return p;
      variants[variantIndex] = {
        ...v,
        options: [...v.options, { value: '' }],
      };
      return { ...p, variants };
    });
  };

  const updateVariantOption = (
    variantIndex: number,
    optionIndex: number,
    updates: Partial<VariantOption>
  ) => {
    setEdited((p) => {
      if (!p) return null;
      const variants = [...(p.variants ?? [])];
      const v = variants[variantIndex];
      if (!v) return p;
      const options = [...v.options];
      options[optionIndex] = { ...options[optionIndex], ...updates };
      variants[variantIndex] = { ...v, options };
      return { ...p, variants };
    });
  };

  const removeVariantOption = (variantIndex: number, optionIndex: number) => {
    setEdited((p) => {
      if (!p) return null;
      const variants = [...(p.variants ?? [])];
      const v = variants[variantIndex];
      if (!v || v.options.length <= 1) return p;
      const options = v.options.filter((_, i) => i !== optionIndex);
      variants[variantIndex] = { ...v, options };
      return { ...p, variants };
    });
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update prices, sizes, colors, and product details. Changes appear on your live site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={edited.title ?? ''}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={edited.slug ?? ''}
                onChange={(e) => update({ slug: e.target.value })}
                placeholder="product-url-slug"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price</Label>
              <Input
                type="text"
                value={edited.price ?? ''}
                onChange={(e) => update({ price: e.target.value })}
                placeholder="99.00"
              />
            </div>
            <div>
              <Label>Sale Price (optional)</Label>
              <Input
                type="text"
                value={edited.salePrice ?? ''}
                onChange={(e) => update({ salePrice: e.target.value })}
                placeholder="79.00"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={edited.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Product description"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label>Excerpt (short description)</Label>
            <Textarea
              value={edited.excerpt ?? ''}
              onChange={(e) => update({ excerpt: e.target.value })}
              placeholder="Brief summary"
              className="min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Image URL</Label>
              <Input
                value={edited.image ?? ''}
                onChange={(e) => update({ image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={edited.sku ?? ''}
                onChange={(e) => update({ sku: e.target.value })}
                placeholder="SKU-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Weight</Label>
              <Input
                value={edited.weight ?? ''}
                onChange={(e) => update({ weight: e.target.value })}
                placeholder="1 lb"
              />
            </div>
            <div>
              <Label>Stock Status</Label>
              <Select
                value={edited.stockStatus ?? 'instock'}
                onValueChange={(v) => update({ stockStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Gallery URLs (one per line)</Label>
            <Textarea
              value={(edited.gallery ?? []).join('\n')}
              onChange={(e) =>
                update({
                  gallery: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="https://...&#10;https://..."
              className="min-h-[80px] font-mono text-sm"
            />
          </div>

          {/* Sizes & Colors (variants) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Sizes & Colors (variants)</Label>
              <Button variant="outline" size="sm" onClick={addVariant} type="button">
                <Plus className="h-4 w-4 mr-2" />
                Add variant
              </Button>
            </div>
            {(edited.variants ?? []).map((v, vi) => (
              <div
                key={vi}
                className="p-3 rounded-lg border bg-muted/30 space-y-2 mb-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={v.attributeName}
                    onChange={(e) =>
                      updateVariant(vi, { attributeName: e.target.value })
                    }
                    placeholder="Size or Color"
                    className="w-40"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(vi)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 pl-4">
                  {v.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <Input
                        value={opt.value}
                        onChange={(e) =>
                          updateVariantOption(vi, oi, { value: e.target.value })
                        }
                        placeholder={
                          v.attributeName.toLowerCase().includes('color')
                            ? 'Red'
                            : 'S'
                        }
                        className="w-24"
                      />
                      {v.attributeName.toLowerCase().includes('color') && (
                        <Input
                          type="text"
                          value={opt.colorHex ?? ''}
                          onChange={(e) =>
                            updateVariantOption(vi, oi, {
                              colorHex: e.target.value || undefined,
                            })
                          }
                          placeholder="#ff0000"
                          className="w-24"
                        />
                      )}
                      <Input
                        type="text"
                        value={opt.priceModifier ?? ''}
                        onChange={(e) =>
                          updateVariantOption(vi, oi, {
                            priceModifier: e.target.value || undefined,
                          })
                        }
                        placeholder="+$10"
                        className="w-20"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariantOption(vi, oi)}
                        disabled={v.options.length <= 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addVariantOption(vi)}
                    type="button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add option
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(edited)} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
