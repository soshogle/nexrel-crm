'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Code,
  Eye,
  Trash2,
  BarChart,
  Copy,
  RefreshCw,
  ExternalLink,
  Settings,
  Palette,
  Layout,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  stock: number;
}

interface Widget {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  theme: string;
  layout: string;
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  productIds: string[];
  maxProducts: number;
  showOutOfStock: boolean;
  showPrices: boolean;
  showAddToCart: boolean;
  showQuickView: boolean;
  showSearch: boolean;
  enableCheckout: boolean;
  checkoutUrl?: string;
  allowedDomains: string[];
  impressions: number;
  clicks: number;
  conversions: number;
  apiKey: string;
  createdAt: string;
}

interface WidgetBuilderProps {
  onWidgetCreated?: () => void | Promise<void>;
}

export function WidgetBuilder({ onWidgetCreated }: WidgetBuilderProps = {}) {
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [embedCode, setEmbedCode] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('LIGHT');
  const [layout, setLayout] = useState('GRID');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [borderRadius, setBorderRadius] = useState(8);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [maxProducts, setMaxProducts] = useState(12);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showPrices, setShowPrices] = useState(true);
  const [showAddToCart, setShowAddToCart] = useState(true);
  const [showQuickView, setShowQuickView] = useState(true);
  const [showSearch, setShowSearch] = useState(true);
  const [enableCheckout, setEnableCheckout] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load widgets
      const widgetsRes = await fetch('/api/widgets');
      if (widgetsRes.ok) {
        const data = await widgetsRes.json();
        setWidgets(data.widgets || []);
      }

      // Load products
      const productsRes = await fetch('/api/ecommerce/products');
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load widget data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTheme('LIGHT');
    setLayout('GRID');
    setPrimaryColor('#3b82f6');
    setAccentColor('#10b981');
    setBorderRadius(8);
    setSelectedProductIds([]);
    setMaxProducts(12);
    setShowOutOfStock(false);
    setShowPrices(true);
    setShowAddToCart(true);
    setShowQuickView(true);
    setShowSearch(true);
    setEnableCheckout(true);
    setCheckoutUrl('');
    setAllowedDomains('');
    setSelectedWidget(null);
  };

  const handleCreateWidget = async () => {
    if (!name) {
      toast.error('Widget name is required');
      return;
    }

    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      const res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          theme,
          layout,
          primaryColor,
          accentColor,
          borderRadius,
          productIds: selectedProductIds,
          maxProducts,
          showOutOfStock,
          showPrices,
          showAddToCart,
          showQuickView,
          showSearch,
          enableCheckout,
          checkoutUrl: checkoutUrl || undefined,
          allowedDomains: allowedDomains ? allowedDomains.split(',').map(d => d.trim()) : [],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create widget');
      }

      const data = await res.json();
      toast.success('Widget created successfully');
      setEmbedCode(data.embedCode);
      setShowEmbedCode(true);
      resetForm();
      await loadData();
      
      // Call the callback if provided
      if (onWidgetCreated) {
        await onWidgetCreated();
      }
    } catch (error: any) {
      console.error('Error creating widget:', error);
      toast.error(error.message || 'Failed to create widget');
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) {
      return;
    }

    try {
      const res = await fetch(`/api/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete widget');
      }

      toast.success('Widget deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Error deleting widget:', error);
      toast.error(error.message || 'Failed to delete widget');
    }
  };

  const handleViewEmbedCode = async (widgetId: string) => {
    try {
      const res = await fetch(`/api/widgets/${widgetId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch widget');
      }

      const data = await res.json();
      setEmbedCode(data.embedCode);
      setShowEmbedCode(true);
    } catch (error: any) {
      console.error('Error fetching embed code:', error);
      toast.error(error.message || 'Failed to fetch embed code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Widget Builder</h1>
            <p className="text-muted-foreground mt-2">
              Loading widget builder...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Widget Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create embeddable e-commerce widgets for your website
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Sparkles className="h-3 w-3 mr-1" />
          Demo Mode
        </Badge>
      </div>

      {/* Existing Widgets */}
      {widgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Your Widgets ({widgets.length})
            </CardTitle>
            <CardDescription>Manage your existing embeddable widgets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{widget.name}</h4>
                      <Badge variant={widget.isActive ? 'default' : 'secondary'}>
                        {widget.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{widget.layout}</Badge>
                    </div>
                    {widget.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {widget.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {widget.impressions.toLocaleString()} views
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart className="h-3 w-3" />
                        {widget.clicks.toLocaleString()} clicks
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {widget.conversions.toLocaleString()} conversions
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEmbedCode(widget.id)}
                    >
                      <Code className="h-4 w-4 mr-1" />
                      Embed Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWidget(widget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Widget
          </CardTitle>
          <CardDescription>Configure a new embeddable e-commerce widget</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Widget Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Product Widget"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this widget"
                rows={2}
              />
            </div>
          </div>

          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Display Settings
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIGHT">Light</SelectItem>
                    <SelectItem value="DARK">Dark</SelectItem>
                    <SelectItem value="AUTO">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="layout">Layout</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger id="layout">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GRID">Grid</SelectItem>
                    <SelectItem value="LIST">List</SelectItem>
                    <SelectItem value="CAROUSEL">Carousel</SelectItem>
                    <SelectItem value="COMPACT">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#10b981"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="borderRadius">Border Radius (px)</Label>
                <Input
                  id="borderRadius"
                  type="number"
                  value={borderRadius}
                  onChange={(e) => setBorderRadius(Number(e.target.value))}
                  min={0}
                  max={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxProducts">Max Products</Label>
                <Input
                  id="maxProducts"
                  type="number"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(Number(e.target.value))}
                  min={1}
                  max={50}
                />
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Select Products *
            </h3>

            {products.length === 0 ? (
              <div className="text-center py-8 border rounded-lg">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No products available</p>
                <p className="text-sm text-muted-foreground">
                  Create some products first to add them to your widget
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProductIds.includes(product.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleProductSelection(product.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {product.stock}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => {}}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProductIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedProductIds.length} product(s) selected
              </p>
            )}
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Widget Features
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="showOutOfStock">Show Out of Stock Products</Label>
                <Switch
                  id="showOutOfStock"
                  checked={showOutOfStock}
                  onCheckedChange={setShowOutOfStock}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showPrices">Show Prices</Label>
                <Switch
                  id="showPrices"
                  checked={showPrices}
                  onCheckedChange={setShowPrices}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showAddToCart">Show Add to Cart Button</Label>
                <Switch
                  id="showAddToCart"
                  checked={showAddToCart}
                  onCheckedChange={setShowAddToCart}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showQuickView">Show Quick View</Label>
                <Switch
                  id="showQuickView"
                  checked={showQuickView}
                  onCheckedChange={setShowQuickView}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showSearch">Show Search</Label>
                <Switch
                  id="showSearch"
                  checked={showSearch}
                  onCheckedChange={setShowSearch}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enableCheckout">Enable Checkout</Label>
                <Switch
                  id="enableCheckout"
                  checked={enableCheckout}
                  onCheckedChange={setEnableCheckout}
                />
              </div>
            </div>

            {enableCheckout && (
              <div className="space-y-2">
                <Label htmlFor="checkoutUrl">Checkout URL (Optional)</Label>
                <Input
                  id="checkoutUrl"
                  value={checkoutUrl}
                  onChange={(e) => setCheckoutUrl(e.target.value)}
                  placeholder="https://yourstore.com/checkout"
                />
              </div>
            )}
          </div>

          {/* Security */}
          <div className="space-y-4">
            <h3 className="font-medium">Security</h3>

            <div className="space-y-2">
              <Label htmlFor="allowedDomains">Allowed Domains (comma-separated)</Label>
              <Input
                id="allowedDomains"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="example.com, shop.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to allow all domains
              </p>
            </div>
          </div>

          <Button onClick={handleCreateWidget} className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        </CardContent>
      </Card>

      {/* Embed Code Modal */}
      {showEmbedCode && embedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code
            </CardTitle>
            <CardDescription>
              Copy and paste this code into your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>IFrame Embed</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(embedCode.iframe)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                {embedCode.iframe}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>JavaScript Embed</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(embedCode.script)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                {embedCode.script}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(embedCode.preview, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Widget
              </Button>
              <Button onClick={() => setShowEmbedCode(false)} className="flex-1">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
