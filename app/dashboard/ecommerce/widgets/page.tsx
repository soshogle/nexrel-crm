'use client';

/**
 * E-commerce Widgets Page
 * Manage and monitor embeddable product widgets
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { WidgetBuilder } from '@/components/ecommerce/widget-builder';
import { Code, Copy, Eye, BarChart3, Trash2, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Widget {
  id: string;
  name: string;
  description?: string;
  layout: string;
  theme: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  conversions: number;
  embedCode: string;
  createdAt: string;
  _count?: {
    embeds: number;
  };
}

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ecommerce/widgets');
      if (!response.ok) throw new Error('Failed to fetch widgets');
      const data = await response.json();
      setWidgets(data.widgets || []);
    } catch (error: any) {
      console.error('Error fetching widgets:', error);
      toast.error('Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ecommerce/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete widget');
      
      toast.success('Widget deleted successfully');
      fetchWidgets();
    } catch (error: any) {
      console.error('Error deleting widget:', error);
      toast.error('Failed to delete widget');
    }
  };

  const copyEmbedCode = (embedCode: string) => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return 0;
    return ((clicks / impressions) * 100).toFixed(2);
  };

  const calculateConversionRate = (conversions: number, clicks: number) => {
    if (clicks === 0) return 0;
    return ((conversions / clicks) * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-commerce Widgets</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage embeddable product catalogs
          </p>
        </div>
        <WidgetBuilder onWidgetCreated={fetchWidgets} />
      </div>

      {/* Widgets List */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading widgets...</p>
          </CardContent>
        </Card>
      ) : widgets.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first embeddable widget to showcase products on external websites
              </p>
              <WidgetBuilder onWidgetCreated={fetchWidgets} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {widgets.map((widget) => (
            <Card key={widget.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {widget.name}
                      {widget.isActive ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </CardTitle>
                    {widget.description && (
                      <CardDescription className="mt-1">{widget.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <span>Layout: {widget.layout}</span>
                      <span>•</span>
                      <span>Theme: {widget.theme}</span>
                      {widget._count && widget._count.embeds > 0 && (
                        <>
                          <span>•</span>
                          <span>{widget._count.embeds} embed(s)</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowEmbedCode(true);
                      }}
                    >
                      <Code className="mr-2 h-3 w-3" />
                      Embed Code
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(widget.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{widget.impressions.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Impressions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{widget.clicks.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Clicks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{widget.conversions.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Conversions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {calculateCTR(widget.clicks, widget.impressions)}%
                    </div>
                    <div className="text-xs text-muted-foreground">CTR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {calculateConversionRate(widget.conversions, widget.clicks)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Conv. Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedCode} onOpenChange={setShowEmbedCode}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Embed Code for {selectedWidget?.name}</DialogTitle>
            <DialogDescription>
              Copy and paste this code into your website to embed the widget
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Textarea
                value={selectedWidget?.embedCode || ''}
                readOnly
                className="font-mono text-xs min-h-[200px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => selectedWidget && copyEmbedCode(selectedWidget.embedCode)}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Integration Instructions:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Copy the embed code above</li>
                <li>Paste it into your website's HTML where you want the widget to appear</li>
                <li>The widget will automatically load and display your products</li>
                <li>Track performance in the dashboard analytics</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
