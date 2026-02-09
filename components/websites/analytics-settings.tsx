/**
 * Analytics Settings Component
 * Configure Google Analytics and Facebook Pixel for a website
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink, BarChart3, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalyticsSettingsProps {
  websiteId: string;
}

export function AnalyticsSettings({ websiteId }: AnalyticsSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  }>({});
  const [trackingCodes, setTrackingCodes] = useState<{
    googleAnalytics?: string;
    facebookPixel?: string;
  }>({});

  useEffect(() => {
    fetchConfig();
  }, [websiteId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/analytics/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || {});
        setTrackingCodes(data.trackingCodes || {});
      }
    } catch (error) {
      console.error('Error fetching analytics config:', error);
      toast.error('Failed to load analytics settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/websites/${websiteId}/analytics/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleAnalyticsId: config.googleAnalyticsId || null,
          facebookPixelId: config.facebookPixelId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingCodes(data.trackingCodes || {});
        toast.success('Analytics settings saved successfully!');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving analytics config:', error);
      toast.error(error.message || 'Failed to save analytics settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} code copied to clipboard!`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="tracking-codes">Tracking Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Google Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Analytics
              </CardTitle>
              <CardDescription>
                Track website visitors and behavior with Google Analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ga-id">Google Analytics ID</Label>
                <Input
                  id="ga-id"
                  placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                  value={config.googleAnalyticsId || ''}
                  onChange={(e) => setConfig({ ...config, googleAnalyticsId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Google Analytics 4 (G-XXXXXXXXXX) or Universal Analytics (UA-XXXXXXXXX-X) tracking ID
                </p>
              </div>
              {config.googleAnalyticsId && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Google Analytics configured</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Facebook Pixel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5" />
                Facebook Pixel
              </CardTitle>
              <CardDescription>
                Track conversions and optimize Facebook ads with Facebook Pixel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fb-pixel-id">Facebook Pixel ID</Label>
                <Input
                  id="fb-pixel-id"
                  placeholder="1234567890123456"
                  value={config.facebookPixelId || ''}
                  onChange={(e) => setConfig({ ...config, facebookPixelId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Facebook Pixel ID (15-16 digits)
                </p>
              </div>
              {config.facebookPixelId && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Facebook Pixel configured</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Analytics Settings'
            )}
          </Button>
        </TabsContent>

        <TabsContent value="tracking-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Installation Instructions</CardTitle>
              <CardDescription>
                Copy and paste these tracking codes into your website&apos;s HTML head section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Analytics Code */}
              {trackingCodes.googleAnalytics ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Google Analytics Code</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(trackingCodes.googleAnalytics!, 'Google Analytics')}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {trackingCodes.googleAnalytics}
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    Paste this code in the &lt;head&gt; section of your website, before the closing &lt;/head&gt; tag
                  </p>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Google Analytics not configured</span>
                  </div>
                </div>
              )}

              {/* Facebook Pixel Code */}
              {trackingCodes.facebookPixel ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Facebook Pixel Code</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(trackingCodes.facebookPixel!, 'Facebook Pixel')}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {trackingCodes.facebookPixel}
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    Paste this code in the &lt;head&gt; section of your website, before the closing &lt;/head&gt; tag
                  </p>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Facebook Pixel not configured</span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      How to Install Tracking Codes
                    </h4>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                      <li>Copy the tracking code above</li>
                      <li>Open your website&apos;s HTML source code</li>
                      <li>Find the &lt;head&gt; section</li>
                      <li>Paste the code before the closing &lt;/head&gt; tag</li>
                      <li>Save and publish your website</li>
                    </ol>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Note: If you&apos;re using our website builder, these codes will be automatically injected into your deployed website.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
