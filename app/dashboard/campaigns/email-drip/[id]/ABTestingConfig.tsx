'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, TestTube2, TrendingUp } from 'lucide-react';

interface Variant {
  id: string;
  group: 'A' | 'B';
  subject: string;
  previewText: string;
  htmlContent: string;
  textContent: string;
  // Stats
  totalSent?: number;
  totalOpened?: number;
  totalClicked?: number;
  openRate?: number;
  clickRate?: number;
}

interface ABTestingConfigProps {
  campaignId: string;
  sequenceId: string;
  originalSubject: string;
  originalPreviewText: string;
  originalHtmlContent: string;
  originalTextContent: string;
  enableAbTesting: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function ABTestingConfig({
  campaignId,
  sequenceId,
  originalSubject,
  originalPreviewText,
  originalHtmlContent,
  originalTextContent,
  enableAbTesting,
  onToggle,
}: ABTestingConfigProps) {
  const [variantA, setVariantA] = useState<Variant>({
    id: 'variant-a',
    group: 'A',
    subject: originalSubject,
    previewText: originalPreviewText,
    htmlContent: originalHtmlContent,
    textContent: originalTextContent,
  });

  const [variantB, setVariantB] = useState<Variant>({
    id: 'variant-b',
    group: 'B',
    subject: '',
    previewText: '',
    htmlContent: '',
    textContent: '',
  });

  const [splitPercentage, setSplitPercentage] = useState(50);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!enableAbTesting) {
      toast.error('Please enable A/B testing first');
      return;
    }

    if (!variantB.subject.trim()) {
      toast.error('Variant B: Subject is required');
      return;
    }

    if (!variantB.htmlContent.trim()) {
      toast.error('Variant B: Email content is required');
      return;
    }

    try {
      setSaving(true);

      // Create variant B as a separate sequence
      const response = await fetch(
        `/api/campaigns/drip/${campaignId}/sequences/${sequenceId}/ab-variant`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantA: {
              subject: variantA.subject,
              previewText: variantA.previewText,
              htmlContent: variantA.htmlContent,
              textContent: variantA.textContent,
            },
            variantB: {
              subject: variantB.subject,
              previewText: variantB.previewText,
              htmlContent: variantB.htmlContent,
              textContent: variantB.textContent,
            },
            splitPercentage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save A/B test configuration');
      }

      toast.success('A/B test configuration saved successfully');
    } catch (error: any) {
      console.error('Error saving A/B test:', error);
      toast.error(error.message || 'Failed to save A/B test configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!enableAbTesting) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                A/B Testing
              </CardTitle>
              <CardDescription className="mt-2">
                Test different subject lines and content to optimize engagement
              </CardDescription>
            </div>
            <Switch checked={enableAbTesting} onCheckedChange={onToggle} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Enable A/B testing to create variant versions of your email and compare performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                A/B Testing Configuration
              </CardTitle>
              <CardDescription className="mt-2">
                Create two variants to test which performs better
              </CardDescription>
            </div>
            <Switch checked={enableAbTesting} onCheckedChange={onToggle} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Traffic Split</Label>
            <div className="flex items-center gap-4">
              <Input
                type="range"
                min="10"
                max="90"
                step="10"
                value={splitPercentage}
                onChange={(e) => setSplitPercentage(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="text-sm font-medium min-w-24 text-right">
                A: {splitPercentage}% | B: {100 - splitPercentage}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variant A */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-blue-500">Variant A (Control)</Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Original version - {splitPercentage}% of traffic
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={variantA.subject}
                onChange={(e) =>
                  setVariantA({ ...variantA, subject: e.target.value })
                }
                placeholder="Enter subject line..."
              />
            </div>

            <div className="space-y-2">
              <Label>Preview Text</Label>
              <Input
                value={variantA.previewText}
                onChange={(e) =>
                  setVariantA({ ...variantA, previewText: e.target.value })
                }
                placeholder="Enter preview text..."
              />
            </div>

            <div className="space-y-2">
              <Label>Email Content (HTML)</Label>
              <Textarea
                value={variantA.htmlContent}
                onChange={(e) =>
                  setVariantA({ ...variantA, htmlContent: e.target.value })
                }
                placeholder="Enter HTML content..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {variantA.totalSent !== undefined && variantA.totalSent > 0 && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-semibold">{variantA.totalSent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Opened</p>
                    <p className="font-semibold">
                      {variantA.totalOpened} ({variantA.openRate?.toFixed(1)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Clicked</p>
                    <p className="font-semibold">
                      {variantA.totalClicked} ({variantA.clickRate?.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variant B */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-green-500">Variant B (Test)</Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Test version - {100 - splitPercentage}% of traffic
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={variantB.subject}
                onChange={(e) =>
                  setVariantB({ ...variantB, subject: e.target.value })
                }
                placeholder="Enter alternative subject line..."
              />
            </div>

            <div className="space-y-2">
              <Label>Preview Text</Label>
              <Input
                value={variantB.previewText}
                onChange={(e) =>
                  setVariantB({ ...variantB, previewText: e.target.value })
                }
                placeholder="Enter alternative preview text..."
              />
            </div>

            <div className="space-y-2">
              <Label>Email Content (HTML)</Label>
              <Textarea
                value={variantB.htmlContent}
                onChange={(e) =>
                  setVariantB({ ...variantB, htmlContent: e.target.value })
                }
                placeholder="Enter alternative HTML content..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {variantB.totalSent !== undefined && variantB.totalSent > 0 && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-semibold">{variantB.totalSent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Opened</p>
                    <p className="font-semibold">
                      {variantB.totalOpened} ({variantB.openRate?.toFixed(1)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Clicked</p>
                    <p className="font-semibold">
                      {variantB.totalClicked} ({variantB.clickRate?.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save A/B Test Configuration'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How A/B Testing Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            • Leads will be randomly split between variants A and B based on your traffic split
          </p>
          <p>
            • Each lead will consistently receive emails from their assigned variant throughout the sequence
          </p>
          <p>
            • Performance metrics (open rate, click rate) will be tracked separately for each variant
          </p>
          <p>
            • After collecting enough data, you can choose the winning variant for future campaigns
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
