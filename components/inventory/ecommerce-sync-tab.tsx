
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  Link as LinkIcon,
  ShoppingCart,
  Package,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Webhook,
} from 'lucide-react';

export default function EcommerceSyncTab() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Set webhook URL based on current domain
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/general-inventory/ecommerce/webhook`);
    
    // Generate simple API key (in production, this should be stored securely)
    const generatedKey = `inv_${Math.random().toString(36).substr(2, 24)}`;
    setApiKey(generatedKey);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: string) => {
    try {
      toast.info(`Exporting inventory in ${format} format...`);
      const response = await fetch(`/api/general-inventory/ecommerce/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${format}_inventory_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${format.charAt(0).toUpperCase() + format.slice(1)} export downloaded successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export inventory');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">E-Commerce Integration</h3>
        <p className="text-sm text-muted-foreground">
          Connect your inventory with e-commerce platforms for automatic stock synchronization
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">CSV Export</TabsTrigger>
          <TabsTrigger value="webhook">Webhook Sync</TabsTrigger>
          <TabsTrigger value="internal">Internal Store</TabsTrigger>
        </TabsList>

        {/* CSV Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Inventory Data
              </CardTitle>
              <CardDescription>
                Download your inventory in formats compatible with popular e-commerce platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shopify */}
                <Card className="border-2 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <ShoppingCart className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Shopify</h4>
                          <p className="text-xs text-muted-foreground">Product CSV format</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExport('shopify')}
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export for Shopify
                    </Button>
                  </CardContent>
                </Card>

                {/* WooCommerce */}
                <Card className="border-2 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <ShoppingCart className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold">WooCommerce</h4>
                          <p className="text-xs text-muted-foreground">WordPress plugin format</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExport('woocommerce')}
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export for WooCommerce
                    </Button>
                  </CardContent>
                </Card>

                {/* BigCommerce */}
                <Card className="border-2 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <ShoppingCart className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold">BigCommerce</h4>
                          <p className="text-xs text-muted-foreground">BigCommerce CSV format</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExport('bigcommerce')}
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export for BigCommerce
                    </Button>
                  </CardContent>
                </Card>

                {/* Generic */}
                <Card className="border-2 hover:border-purple-500/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <Package className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Generic Format</h4>
                          <p className="text-xs text-muted-foreground">Universal CSV format</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExport('generic')}
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Generic CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  After exporting, import the CSV file into your e-commerce platform's product management section.
                  Check your platform's documentation for specific import instructions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Set up automatic inventory updates from your e-commerce platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copy this URL and add it to your e-commerce platform's webhook settings
                  </p>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input value={apiKey} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(apiKey, 'API Key')}
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include this API key in all webhook requests for authentication
                  </p>
                </div>

                {/* Webhook Payload Example */}
                <div className="space-y-2">
                  <Label>Webhook Payload Example</Label>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "api_key": "${apiKey}",
  "action": "order_created",
  "sku": "ITEM-SKU",
  "quantity_change": -2,
  "order_id": "ORDER-123",
  "platform": "shopify"
}`}
                  </pre>
                </div>

                {/* Supported Actions */}
                <div className="space-y-2">
                  <Label>Supported Actions</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">order_created</Badge>
                    <Badge variant="outline">stock_update</Badge>
                    <Badge variant="outline">product_update</Badge>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    When an order is placed on your e-commerce site, it will automatically update your inventory stock levels in real-time.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Platform-Specific Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Setup Guides</CardTitle>
              <CardDescription>Quick setup instructions for popular platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                    Shopify
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Settings → Notifications → Webhooks → Create webhook
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subscribe to: Order creation, Order cancelled, Inventory levels update
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-purple-500" />
                    WooCommerce
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Install "WooCommerce Webhooks" plugin → Add new webhook
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Topics: order.created, order.updated, product.updated
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                    BigCommerce
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Advanced Settings → Webhooks → Create a Webhook
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scope: store/order/created, store/product/inventory/updated
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Internal Store Tab */}
        <TabsContent value="internal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Internal CRM Store Integration
              </CardTitle>
              <CardDescription>
                Your CRM e-commerce store is automatically connected to this inventory system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  <strong>Auto-Sync Enabled:</strong> Your internal e-commerce store automatically updates inventory
                  levels when orders are placed. No additional configuration needed.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Package className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Stock Synchronization</h4>
                      <p className="text-sm text-muted-foreground">Real-time inventory updates</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <RefreshCw className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Order Processing</h4>
                      <p className="text-sm text-muted-foreground">Auto-deduct on sale</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Low Stock Alerts</h4>
                      <p className="text-sm text-muted-foreground">Automatic notifications</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full" asChild>
                  <a href="/dashboard/ecommerce" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open E-Commerce Dashboard
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
