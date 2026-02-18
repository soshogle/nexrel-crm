'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  salePrice?: string | null;
  imageUrl?: string | null;
  status?: string;
}

interface ProductsEditorProps {
  websiteId: string;
  vercelDeploymentUrl?: string | null;
}

export function ProductsEditor({ websiteId, vercelDeploymentUrl }: ProductsEditorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', slug: '' });

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/websites/${websiteId}/products?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('different setup')) {
          setError('This site uses a different setup. Product editing is available for sites deployed with the new automation.');
        } else if (data.error?.includes('not deployed')) {
          setError('Deploy your site first. Product editing is available once your site is live.');
        } else {
          setError(data.error || 'Failed to load products');
        }
        setProducts([]);
        setTotal(0);
        return;
      }
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Failed to reach your site. Is it deployed and running?');
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId && vercelDeploymentUrl) {
      fetchProducts();
    } else if (websiteId) {
      setLoading(false);
      setError('Deploy your site first. Product editing is available once your site is live.');
    }
  }, [websiteId, vercelDeploymentUrl, page]);

  const handleUpdate = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/products/${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProduct.name,
          price: editProduct.price,
          salePrice: editProduct.salePrice || null,
          slug: editProduct.slug,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      toast.success('Product updated');
      setEditProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newProduct.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const slug = newProduct.slug || newProduct.name.toLowerCase().replace(/\s+/g, '-');
      const res = await fetch(`/api/websites/${websiteId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          slug,
          price: newProduct.price || '0',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      toast.success('Product created');
      setCreateOpen(false);
      setNewProduct({ name: '', price: '', slug: '' });
      fetchProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/products/${product.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Product deleted');
      fetchProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  if (!vercelDeploymentUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products
          </CardTitle>
          <CardDescription>
            Deploy your site first. Once deployed, you can manage products here. No redeploy needed for changes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading && products.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
              <CardDescription>
                Manage products. Changes appear on your live site within 30 seconds. No redeploy needed.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
              {vercelDeploymentUrl && (
                <a href={vercelDeploymentUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Site
                  </Button>
                </a>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {total} product{total !== 1 ? 's' : ''} total
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${p.price}
                    {p.salePrice && parseFloat(p.salePrice) > 0 && (
                      <span className="ml-2 line-through">${p.salePrice}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditProduct({ ...p })}
                    disabled={saving}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p)}
                    disabled={saving}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {total > limit && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit) || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Changes appear on your live site within 30 seconds.</DialogDescription>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editProduct.name}
                  onChange={(e) => setEditProduct((p) => p ? { ...p, name: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editProduct.slug}
                  onChange={(e) => setEditProduct((p) => p ? { ...p, slug: e.target.value } : null)}
                  placeholder="product-url-slug"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editProduct.price}
                    onChange={(e) => setEditProduct((p) => p ? { ...p, price: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Sale Price (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editProduct.salePrice || ''}
                    onChange={(e) =>
                      setEditProduct((p) =>
                        p ? { ...p, salePrice: e.target.value || null } : null
                      )
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>New products appear on your live site within 30 seconds.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={newProduct.slug}
                onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))}
                placeholder="product-url-slug"
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newProduct.price}
                onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newProduct.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
