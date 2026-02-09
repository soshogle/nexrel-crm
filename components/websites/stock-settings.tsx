/**
 * Stock Settings Component
 * Configure stock management settings for a website
 */

'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface StockSettingsProps {
  websiteId: string;
}

export function StockSettings({ websiteId }: StockSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    lowStockThreshold: 10,
    outOfStockAction: 'HIDE' as 'HIDE' | 'SHOW_OUT_OF_STOCK' | 'PRE_ORDER',
    syncInventory: true,
    autoHideOutOfStock: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [websiteId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/stock`);
      if (response.ok) {
        const data = await response.json();
        if (data.status?.settings) {
          setSettings({
            lowStockThreshold: data.status.settings.lowStockThreshold || 10,
            outOfStockAction: data.status.settings.outOfStockAction || 'HIDE',
            syncInventory: data.status.settings.syncInventory !== false,
            autoHideOutOfStock: data.status.settings.autoHideOutOfStock !== false,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/websites/${websiteId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Stock settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Stock Management Settings
        </CardTitle>
        <CardDescription>
          Configure how stock is managed for this website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
          <Input
            id="lowStockThreshold"
            type="number"
            min="0"
            value={settings.lowStockThreshold}
            onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
          />
          <p className="text-sm text-muted-foreground">
            Products with stock below this number will trigger low stock alerts
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="outOfStockAction">Out of Stock Action</Label>
          <Select
            value={settings.outOfStockAction}
            onValueChange={(value: 'HIDE' | 'SHOW_OUT_OF_STOCK' | 'PRE_ORDER') =>
              setSettings({ ...settings, outOfStockAction: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HIDE">Hide Product</SelectItem>
              <SelectItem value="SHOW_OUT_OF_STOCK">Show as Out of Stock</SelectItem>
              <SelectItem value="PRE_ORDER">Enable Pre-Orders</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            What happens when a product runs out of stock
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="syncInventory">Sync Inventory</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync inventory changes to the website
            </p>
          </div>
          <Switch
            id="syncInventory"
            checked={settings.syncInventory}
            onCheckedChange={(checked) => setSettings({ ...settings, syncInventory: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoHideOutOfStock">Auto-Hide Out of Stock</Label>
            <p className="text-sm text-muted-foreground">
              Automatically hide products when they run out of stock
            </p>
          </div>
          <Switch
            id="autoHideOutOfStock"
            checked={settings.autoHideOutOfStock}
            onCheckedChange={(checked) => setSettings({ ...settings, autoHideOutOfStock: checked })}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
