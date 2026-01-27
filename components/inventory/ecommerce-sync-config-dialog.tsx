
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface EcommerceSyncConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EcommerceSyncConfigDialog({
  open,
  onOpenChange,
  onSuccess,
}: EcommerceSyncConfigDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'shopify',
    autoSync: false,
    syncInventory: false,
    syncPrices: false,
    syncProducts: false,
    shopifyDomain: '',
    shopifyAccessToken: '',
    woocommerceUrl: '',
    woocommerceConsumerKey: '',
    woocommerceConsumerSecret: '',
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/general-inventory/ecommerce-sync');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      if (data.settings) {
        setFormData((prev) => ({
          ...prev,
          platform: data.settings.platform,
          autoSync: data.settings.autoSync,
          syncInventory: data.settings.syncInventory,
          syncPrices: data.settings.syncPrices,
          syncProducts: data.settings.syncProducts,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/general-inventory/ecommerce-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      toast.success('E-commerce sync configured successfully');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/general-inventory/ecommerce-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, testOnly: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Connection test failed');
      }

      toast.success('Connection successful!');
    } catch (error: any) {
      toast.error(error.message || 'Connection failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure E-commerce Sync</DialogTitle>
          <DialogDescription>
            Connect your Shopify or WooCommerce store for bi-directional inventory sync
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={formData.platform}
              onValueChange={(value) => setFormData({ ...formData, platform: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shopify">Shopify</SelectItem>
                <SelectItem value="woocommerce">WooCommerce</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shopify Credentials */}
          {formData.platform === 'shopify' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">Shopify Credentials</h3>
              <div className="space-y-2">
                <Label>Store Domain</Label>
                <Input
                  placeholder="your-store.myshopify.com"
                  value={formData.shopifyDomain}
                  onChange={(e) =>
                    setFormData({ ...formData, shopifyDomain: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Admin API Access Token</Label>
                <Input
                  type="password"
                  placeholder="shpat_..."
                  value={formData.shopifyAccessToken}
                  onChange={(e) =>
                    setFormData({ ...formData, shopifyAccessToken: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          )}

          {/* WooCommerce Credentials */}
          {formData.platform === 'woocommerce' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">WooCommerce Credentials</h3>
              <div className="space-y-2">
                <Label>Store URL</Label>
                <Input
                  placeholder="https://yourstore.com"
                  value={formData.woocommerceUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, woocommerceUrl: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Consumer Key</Label>
                <Input
                  placeholder="ck_..."
                  value={formData.woocommerceConsumerKey}
                  onChange={(e) =>
                    setFormData({ ...formData, woocommerceConsumerKey: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Consumer Secret</Label>
                <Input
                  type="password"
                  placeholder="cs_..."
                  value={formData.woocommerceConsumerSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, woocommerceConsumerSecret: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          )}

          {/* Sync Options */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Sync Options</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Sync Enabled</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically push inventory changes to external platform
                </p>
              </div>
              <Switch
                checked={formData.autoSync}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoSync: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Sync Inventory Levels</Label>
                <p className="text-sm text-muted-foreground">
                  Push stock quantity updates
                </p>
              </div>
              <Switch
                checked={formData.syncInventory}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, syncInventory: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Sync Prices</Label>
                <p className="text-sm text-muted-foreground">
                  Push price changes
                </p>
              </div>
              <Switch
                checked={formData.syncPrices}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, syncPrices: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Sync Product Details</Label>
                <p className="text-sm text-muted-foreground">
                  Push name, description changes
                </p>
              </div>
              <Switch
                checked={formData.syncProducts}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, syncProducts: checked })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={isTesting || isLoading}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
