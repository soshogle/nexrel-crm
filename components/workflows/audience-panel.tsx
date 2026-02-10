/**
 * Audience Panel Component
 * Shows audience targeting options for campaign mode workflows
 * Only appears when executionMode === 'CAMPAIGN'
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Filter, X, CheckCircle2, Globe } from 'lucide-react';
import { toast } from 'sonner';

export interface AudienceConfig {
  type: 'SINGLE' | 'FILTERED' | 'MANUAL' | 'WEBSITE_LEADS';
  customerId?: string;
  websiteId?: string; // For WEBSITE_LEADS - filter by specific website
  filters?: {
    minLeadScore?: number;
    statuses?: string[];
    tags?: string[];
    types?: string[];
    hasPhone?: boolean;
    hasEmail?: boolean;
    sources?: string[]; // e.g. ['website', 'manual', 'referral']
  };
  recipientIds?: string[];
}

interface AudiencePanelProps {
  audience: AudienceConfig | null;
  onAudienceChange: (audience: AudienceConfig) => void;
  executionMode: 'WORKFLOW' | 'CAMPAIGN';
}

export function AudiencePanel({
  audience,
  onAudienceChange,
  executionMode,
}: AudiencePanelProps) {
  const [localAudience, setLocalAudience] = useState<AudienceConfig>(
    audience || {
      type: 'FILTERED',
      filters: {
        minLeadScore: 75,
        statuses: [],
        tags: [],
        types: [],
        hasPhone: false,
        hasEmail: false,
      },
    }
  );
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [websites, setWebsites] = useState<{ id: string; name: string }[]>([]);
  const SOURCE_OPTIONS = [
    { value: 'website', label: 'Website' },
    { value: 'Website Form', label: 'Website Form' },
    { value: 'manual', label: 'Manual' },
    { value: 'referral', label: 'Referral' },
    { value: 'messaging', label: 'Messaging' },
  ];

  // Only show if campaign mode
  if (executionMode !== 'CAMPAIGN') {
    return null;
  }

  useEffect(() => {
    fetchRecipientCount();
    fetchAvailableFilters();
  }, [localAudience]);

  useEffect(() => {
    if (localAudience.type === 'WEBSITE_LEADS') {
      fetch('/api/websites')
        .then((r) => r.ok ? r.json() : { websites: [] })
        .then((d) => setWebsites(d.websites || []))
        .catch(() => setWebsites([]));
    }
  }, [localAudience.type]);

  const fetchRecipientCount = async () => {
    if (localAudience.type !== 'FILTERED' && localAudience.type !== 'WEBSITE_LEADS') {
      setRecipientCount(null);
      return;
    }

    setLoadingCount(true);
    try {
      const filters = localAudience.type === 'WEBSITE_LEADS'
        ? { ...localAudience.filters, sources: ['website', 'website_form', 'Website Form'] }
        : localAudience.filters;
      const body = localAudience.type === 'WEBSITE_LEADS'
        ? { filters, websiteId: localAudience.websiteId }
        : { filters };
      const response = await fetch('/api/workflows/campaigns/preview-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setRecipientCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching recipient count:', error);
    } finally {
      setLoadingCount(false);
    }
  };

  const fetchAvailableFilters = async () => {
    try {
      const response = await fetch('/api/leads/filters');
      if (response.ok) {
        const data = await response.json();
        setAvailableStatuses(data.statuses || []);
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const handleFilterChange = (key: keyof AudienceConfig['filters'], value: any) => {
    const newFilters = {
      ...localAudience.filters,
      [key]: value,
    };
    const newAudience = {
      ...localAudience,
      filters: newFilters,
    };
    setLocalAudience(newAudience);
    onAudienceChange(newAudience);
  };

  const toggleStatus = (status: string) => {
    const currentStatuses = localAudience.filters?.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    handleFilterChange('statuses', newStatuses);
  };

  const toggleTag = (tag: string) => {
    const currentTags = localAudience.filters?.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    handleFilterChange('tags', newTags);
  };

  const toggleSource = (source: string) => {
    const currentSources = localAudience.filters?.sources || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter((s) => s !== source)
      : [...currentSources, source];
    handleFilterChange('sources', newSources);
  };

  return (
    <Card className="border-purple-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          Target Audience
        </CardTitle>
        <CardDescription>
          Define who will receive this campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audience Type */}
        <div className="space-y-2">
          <Label>Audience Type</Label>
          <Select
            value={localAudience.type}
            onValueChange={(value: AudienceConfig['type']) => {
              const newAudience = { ...localAudience, type: value };
              setLocalAudience(newAudience);
              onAudienceChange(newAudience);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FILTERED">Filtered Leads (Recommended)</SelectItem>
              <SelectItem value="WEBSITE_LEADS">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website Visitors / Form Submissions
                </div>
              </SelectItem>
              <SelectItem value="MANUAL">Manual Selection</SelectItem>
              <SelectItem value="SINGLE">Single Recipient</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtered Audience Options */}
        {localAudience.type === 'FILTERED' && (
          <div className="space-y-4 border-t pt-4">
            {/* Lead Score Filter */}
            <div className="space-y-2">
              <Label>Minimum Lead Score</Label>
              <Select
                value={localAudience.filters?.minLeadScore?.toString() || '75'}
                onValueChange={(value) =>
                  handleFilterChange('minLeadScore', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60+ (Good)</SelectItem>
                  <SelectItem value="70">70+ (High Quality)</SelectItem>
                  <SelectItem value="75">75+ (Excellent)</SelectItem>
                  <SelectItem value="80">80+ (Premium)</SelectItem>
                  <SelectItem value="90">90+ (Top Tier)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            {availableStatuses.length > 0 && (
              <div className="space-y-2">
                <Label>Lead Status</Label>
                <div className="flex flex-wrap gap-2">
                  {availableStatuses.map((status) => {
                    const isSelected = localAudience.filters?.statuses?.includes(status);
                    return (
                      <Badge
                        key={status}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleStatus(status)}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {status}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Source Filter */}
            <div className="space-y-2">
              <Label>Lead Source</Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((opt) => {
                  const isSelected = localAudience.filters?.sources?.includes(opt.value);
                  return (
                    <Badge
                      key={opt.value}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSource(opt.value)}
                    >
                      {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {opt.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = localAudience.filters?.tags?.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contact Requirements */}
            <div className="space-y-2">
              <Label>Contact Requirements</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAudience.filters?.hasPhone || false}
                    onChange={(e) => handleFilterChange('hasPhone', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Has Phone Number</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAudience.filters?.hasEmail || false}
                    onChange={(e) => handleFilterChange('hasEmail', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Has Email Address</span>
                </label>
              </div>
            </div>

            {/* Recipient Count Preview */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Estimated Recipients</Label>
                  {loadingCount ? (
                    <p className="text-sm text-muted-foreground">Calculating...</p>
                  ) : recipientCount !== null ? (
                    <p className="text-2xl font-bold text-purple-600">{recipientCount.toLocaleString()}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to preview</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRecipientCount}
                  disabled={loadingCount}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Website Visitors / Form Submissions */}
        {localAudience.type === 'WEBSITE_LEADS' && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Target leads created from website form submissions and visitors who submitted contact info.
            </p>
            {websites.length > 0 && (
              <div className="space-y-2">
                <Label>Specific Website (optional)</Label>
                <Select
                  value={localAudience.websiteId || 'all'}
                  onValueChange={(value) => {
                    const newAudience = { ...localAudience, websiteId: value === 'all' ? undefined : value };
                    setLocalAudience(newAudience);
                    onAudienceChange(newAudience);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All websites</SelectItem>
                    {websites.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Estimated Recipients</Label>
                  {loadingCount ? (
                    <p className="text-sm text-muted-foreground">Calculating...</p>
                  ) : recipientCount !== null ? (
                    <p className="text-2xl font-bold text-purple-600">{recipientCount.toLocaleString()}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to preview</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={fetchRecipientCount} disabled={loadingCount}>
                  <Filter className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Selection */}
        {localAudience.type === 'MANUAL' && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Manual selection will be available in the campaign execution view
            </p>
          </div>
        )}

        {/* Single Recipient */}
        {localAudience.type === 'SINGLE' && (
          <div className="border-t pt-4 space-y-2">
            <Label>Customer</Label>
            <Input
              placeholder="Search for customer..."
              value={localAudience.customerId || ''}
              onChange={(e) => {
                const newAudience = { ...localAudience, customerId: e.target.value };
                setLocalAudience(newAudience);
                onAudienceChange(newAudience);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
