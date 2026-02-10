/**
 * Campaign Settings Panel Component
 * Shows campaign-specific settings (scheduling, rate limits, frequency)
 * Only appears when executionMode === 'CAMPAIGN'
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, TrendingUp, Zap } from 'lucide-react';

export interface CampaignSettings {
  scheduledFor?: string;
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dailyLimit?: number;
  weeklyLimit?: number;
  tone?: 'professional' | 'casual' | 'friendly' | 'urgent';
}

interface CampaignSettingsPanelProps {
  settings: CampaignSettings | null;
  onSettingsChange: (settings: CampaignSettings) => void;
  executionMode: 'WORKFLOW' | 'CAMPAIGN';
}

export function CampaignSettingsPanel({
  settings,
  onSettingsChange,
  executionMode,
}: CampaignSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<CampaignSettings>(
    settings || {
      frequency: 'ONE_TIME',
      tone: 'professional',
    }
  );

  // Only show if campaign mode
  if (executionMode !== 'CAMPAIGN') {
    return null;
  }

  const handleChange = (key: keyof CampaignSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <Card className="border-purple-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Campaign Settings
        </CardTitle>
        <CardDescription>
          Configure scheduling, frequency, and rate limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scheduling */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </Label>
          <div className="flex gap-2">
            <Select
              value={localSettings.scheduledFor ? 'scheduled' : 'immediate'}
              onValueChange={(value) => {
                if (value === 'immediate') {
                  const { scheduledFor, ...rest } = localSettings;
                  handleChange('scheduledFor', undefined);
                } else {
                  // Will be handled by date picker
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Send Immediately</SelectItem>
                <SelectItem value="scheduled">Schedule for Later</SelectItem>
              </SelectContent>
            </Select>
            {localSettings.scheduledFor !== undefined && (
              <Input
                type="datetime-local"
                value={localSettings.scheduledFor || ''}
                onChange={(e) => handleChange('scheduledFor', e.target.value)}
                className="flex-1"
              />
            )}
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={localSettings.frequency}
            onValueChange={(value: CampaignSettings['frequency']) =>
              handleChange('frequency', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ONE_TIME">One-Time</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {localSettings.frequency === 'ONE_TIME' && 'Campaign runs once'}
            {localSettings.frequency === 'DAILY' && 'Campaign runs every day'}
            {localSettings.frequency === 'WEEKLY' && 'Campaign runs once per week'}
            {localSettings.frequency === 'MONTHLY' && 'Campaign runs once per month'}
          </p>
        </div>

        {/* Rate Limiting */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <Label className="text-base font-semibold">Rate Limiting</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Control how many messages are sent per day/week to avoid overwhelming recipients
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Daily Limit</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={localSettings.dailyLimit || ''}
                onChange={(e) =>
                  handleChange('dailyLimit', e.target.value ? parseInt(e.target.value) : undefined)
                }
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Max messages per day (leave empty for unlimited)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Weekly Limit</Label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={localSettings.weeklyLimit || ''}
                onChange={(e) =>
                  handleChange('weeklyLimit', e.target.value ? parseInt(e.target.value) : undefined)
                }
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Max messages per week (leave empty for unlimited)
              </p>
            </div>
          </div>
        </div>

        {/* Tone Selection */}
        <div className="border-t pt-4 space-y-2">
          <Label className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Content Tone
          </Label>
          <Select
            value={localSettings.tone || 'professional'}
            onValueChange={(value: CampaignSettings['tone']) =>
              handleChange('tone', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used for AI content generation (if enabled)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
