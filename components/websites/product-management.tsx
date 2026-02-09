/**
 * Product Management Component
 * Full UI for managing products on a website
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Package, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface ProductManagementProps {
  websiteId: string;
}

export function ProductManagement({ websiteId }: ProductManagementProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, productsRes] = await Promise.all([
        fetch(`/api/websites/${websiteId}/stock`),
        fetch('/api/ecommerce/products'),
      ]);

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        setProducts(stockData.status?.products || []);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setAvailableProducts(productsData.products || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add product');
      }

      toast.success('Product added to website');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add product');
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove product');
      }

      toast.success('Product removed from website');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove product');
    }
  };

  const handleToggleVisibility = async (productId: string, isVisible: boolean) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !isVisible }),
      });

      if (!response.ok) {
        throw new Error('Failed to update visibility');
      }

      toast.success(`Product ${!isVisible ? 'shown' : 'hidden'}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update visibility');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableToAdd = availableProducts.filter(
    (ap) => !products.some((p) => p.id === ap.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Management</h2>
          <p className="text-muted-foreground">Manage products displayed on your website</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Products to Website</DialogTitle>
              <DialogDescription>
                Select products from your catalog to add to this website
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableToAdd
                  .filter((p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted cursor-pointer"
                      onClick={() => {
                        handleAddProduct(product.id);
                        setDialogOpen(false);
                      }}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku} • ${(product.price / 100).toFixed(2)} • Stock: {product.inventory}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Add
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Input
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      {/* Products List */}
      <div className="grid gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.isVisible ? (
                      <Badge variant="default">Visible</Badge>
                    ) : (
                      <Badge variant="secondary">Hidden</Badge>
                    )}
                    <Badge variant={product.status === 'OUT_OF_STOCK' ? 'destructive' : product.status === 'LOW_STOCK' ? 'warning' : 'default'}>
                      {product.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    SKU: {product.sku} • Stock: {product.stock} units
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleVisibility(product.id, product.isVisible)}
                  >
                    {product.isVisible ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No products found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
