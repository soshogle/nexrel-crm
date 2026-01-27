
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Bell, Mail, MessageSquare, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface LowStockAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LowStockAlertsDialog({
  open,
  onOpenChange,
}: LowStockAlertsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    enabled: true,
    checkDaily: true,
    alertTime: '09:00',
    sendEmail: true,
    emailAddresses: '',
    sendSMS: false,
    smsNumbers: '',
    alertOnLowStock: true,
    alertOnOutOfStock: true,
    alertOnCritical: true,
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchLowStockItems();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/general-inventory/alerts/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      if (data.settings) {
        setFormData(data.settings);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const response = await fetch('/api/general-inventory/alerts/send');
      if (!response.ok) throw new Error('Failed to fetch items');
      
      const data = await response.json();
      setLowStockItems(data.items || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/general-inventory/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      toast.success('Alert settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestAlert = async () => {
    setIsSending(true);
    try {
      const response = await fetch('/api/general-inventory/alerts/send', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send alert');
      }

      const data = await response.json();
      toast.success(
        `Alert sent! ${data.emailSent ? 'Email ✓' : ''} ${data.smsSent ? 'SMS ✓' : ''}`
      );
      
      // Refresh items after sending
      await fetchLowStockItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send alert');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Out of Stock</Badge>;
      case 'CRITICAL':
        return <Badge className="bg-orange-500"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
      case 'LOW':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Low Stock</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Low Stock Alerts
          </DialogTitle>
          <DialogDescription>
            Configure automatic alerts for low inventory levels
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Settings Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Alerts Enabled</Label>
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Check Daily</Label>
                  <Switch
                    checked={formData.checkDaily}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, checkDaily: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Alert Time</Label>
                  <Input
                    type="time"
                    value={formData.alertTime}
                    onChange={(e) =>
                      setFormData({ ...formData, alertTime: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Send Email</Label>
                  <Switch
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, sendEmail: checked })
                    }
                  />
                </div>

                {formData.sendEmail && (
                  <div className="space-y-2">
                    <Label>Email Addresses (comma-separated)</Label>
                    <Input
                      type="email"
                      placeholder="admin@example.com, manager@example.com"
                      value={formData.emailAddresses}
                      onChange={(e) =>
                        setFormData({ ...formData, emailAddresses: e.target.value })
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Send SMS</Label>
                  <Switch
                    checked={formData.sendSMS}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, sendSMS: checked })
                    }
                  />
                </div>

                {formData.sendSMS && (
                  <div className="space-y-2">
                    <Label>Phone Numbers (comma-separated)</Label>
                    <Input
                      type="tel"
                      placeholder="+1234567890, +1987654321"
                      value={formData.smsNumbers}
                      onChange={(e) =>
                        setFormData({ ...formData, smsNumbers: e.target.value })
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Low Stock</Label>
                  <Switch
                    checked={formData.alertOnLowStock}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, alertOnLowStock: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Out of Stock</Label>
                  <Switch
                    checked={formData.alertOnOutOfStock}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, alertOnOutOfStock: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Critical (&lt; 10% reorder)</Label>
                  <Switch
                    checked={formData.alertOnCritical}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, alertOnCritical: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={sendTestAlert}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Send Test Alert
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Low Stock Items Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Alerts</CardTitle>
                <CardDescription>
                  {lowStockItems.length} items require attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>All items are well-stocked!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg space-y-1"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          </div>
                          {getStatusBadge(item.status)}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Quantity:</span>{' '}
                          <span className="font-medium">{item.quantity}</span>
                          {item.reorderLevel > 0 && (
                            <span className="text-muted-foreground">
                              {' '}
                              (Reorder at: {item.reorderLevel})
                            </span>
                          )}
                        </div>
                        {(item.category || item.location) && (
                          <div className="text-sm text-muted-foreground">
                            {item.category && <span>Category: {item.category}</span>}
                            {item.category && item.location && <span> • </span>}
                            {item.location && <span>Location: {item.location}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
