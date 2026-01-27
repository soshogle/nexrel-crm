
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock, Bell, AlertTriangle, Save, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AutoReplySettings {
  id: string;
  isEnabled: boolean;
  responseTone: string;
  responseLanguage: string;
  businessHoursEnabled: boolean;
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  businessDays: string | null;
  timezone: string;
  afterHoursMessage: string | null;
  maxResponseLength: number;
  confidenceThreshold: number;
  useConversationHistory: boolean;
  historyDepth: number;
  escalationKeywords: string | null;
  escalationTopics: string | null;
  notifyOnEscalation: boolean;
  notificationEmail: string | null;
  notificationPhone: string | null;
}

export function AutoReplySettings() {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/auto-reply-settings');
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load auto-reply settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/auto-reply-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          businessDays: settings.businessDays ? JSON.parse(settings.businessDays) : [],
          escalationKeywords: settings.escalationKeywords
            ? JSON.parse(settings.escalationKeywords)
            : [],
          escalationTopics: settings.escalationTopics
            ? JSON.parse(settings.escalationTopics)
            : [],
        }),
      });

      if (response.ok) {
        toast.success('Auto-reply settings saved');
        fetchSettings();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof AutoReplySettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const businessDays = settings?.businessDays ? JSON.parse(settings.businessDays) : [];
  const escalationKeywords = settings?.escalationKeywords
    ? JSON.parse(settings.escalationKeywords)
    : [];
  const escalationTopics = settings?.escalationTopics
    ? JSON.parse(settings.escalationTopics)
    : [];

  if (loading) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-700">
        <p className="text-center text-gray-400">Loading settings...</p>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-700">
        <p className="text-center text-red-400">Failed to load settings</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Auto-Reply Settings
          </h3>
          <p className="text-sm text-gray-400">
            Configure intelligent auto-responses for customer messages
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="enable-auto-reply" className="text-white">
              {settings.isEnabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="enable-auto-reply"
              checked={settings.isEnabled}
              onCheckedChange={(checked) => updateSetting('isEnabled', checked)}
            />
          </div>
          {settings.isEnabled && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Zap className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Response Behavior */}
      <Card className="p-6 bg-gray-900 border-gray-700">
        <h4 className="text-md font-medium text-white mb-4">Response Behavior</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone" className="text-white">Response Tone</Label>
              <Select
                value={settings.responseTone}
                onValueChange={(value) => updateSetting('responseTone', value)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="professional" className="text-white">Professional</SelectItem>
                  <SelectItem value="casual" className="text-white">Casual</SelectItem>
                  <SelectItem value="friendly" className="text-white">Friendly</SelectItem>
                  <SelectItem value="formal" className="text-white">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language" className="text-white">Response Language</Label>
              <Select
                value={settings.responseLanguage}
                onValueChange={(value) => updateSetting('responseLanguage', value)}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="en" className="text-white">English</SelectItem>
                  <SelectItem value="es" className="text-white">Spanish</SelectItem>
                  <SelectItem value="fr" className="text-white">French</SelectItem>
                  <SelectItem value="de" className="text-white">German</SelectItem>
                  <SelectItem value="it" className="text-white">Italian</SelectItem>
                  <SelectItem value="pt" className="text-white">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="max-length" className="text-white">
              Max Response Length: {settings.maxResponseLength} characters
            </Label>
            <Slider
              id="max-length"
              min={100}
              max={1000}
              step={50}
              value={[settings.maxResponseLength]}
              onValueChange={([value]) => updateSetting('maxResponseLength', value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="confidence" className="text-white">
              Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
            </Label>
            <p className="text-xs text-gray-400 mt-1">
              Responses below this confidence will be escalated to human review
            </p>
            <Slider
              id="confidence"
              min={0.3}
              max={0.95}
              step={0.05}
              value={[settings.confidenceThreshold]}
              onValueChange={([value]) => updateSetting('confidenceThreshold', value)}
              className="mt-2"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-history" className="text-white">Use Conversation History</Label>
              <p className="text-xs text-gray-400">
                Include previous messages for better context
              </p>
            </div>
            <Switch
              id="use-history"
              checked={settings.useConversationHistory}
              onCheckedChange={(checked) => updateSetting('useConversationHistory', checked)}
            />
          </div>

          {settings.useConversationHistory && (
            <div>
              <Label htmlFor="history-depth" className="text-white">
                History Depth: {settings.historyDepth} messages
              </Label>
              <Slider
                id="history-depth"
                min={3}
                max={20}
                step={1}
                value={[settings.historyDepth]}
                onValueChange={([value]) => updateSetting('historyDepth', value)}
                className="mt-2"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Business Hours */}
      <Card className="p-6 bg-gray-900 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-white" />
            <h4 className="text-md font-medium text-white">Business Hours</h4>
          </div>
          <Switch
            checked={settings.businessHoursEnabled}
            onCheckedChange={(checked) => updateSetting('businessHoursEnabled', checked)}
          />
        </div>

        {settings.businessHoursEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-time" className="text-white">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={settings.businessHoursStart || '09:00'}
                  onChange={(e) => updateSetting('businessHoursStart', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-white">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={settings.businessHoursEnd || '17:00'}
                  onChange={(e) => updateSetting('businessHoursEnd', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="timezone" className="text-white">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => updateSetting('timezone', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="America/New_York" className="text-white">Eastern (ET)</SelectItem>
                    <SelectItem value="America/Chicago" className="text-white">Central (CT)</SelectItem>
                    <SelectItem value="America/Denver" className="text-white">Mountain (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles" className="text-white">Pacific (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Business Days</Label>
              <div className="flex gap-2 flex-wrap">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                  (day) => (
                    <Badge
                      key={day}
                      className={`cursor-pointer ${
                        businessDays.includes(day)
                          ? 'bg-primary text-white'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                      onClick={() => {
                        const newDays = businessDays.includes(day)
                          ? businessDays.filter((d: string) => d !== day)
                          : [...businessDays, day];
                        updateSetting('businessDays', JSON.stringify(newDays));
                      }}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </Badge>
                  )
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="after-hours" className="text-white">After Hours Message</Label>
              <Textarea
                id="after-hours"
                placeholder="Message to send outside business hours..."
                value={settings.afterHoursMessage || ''}
                onChange={(e) => updateSetting('afterHoursMessage', e.target.value)}
                rows={3}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Escalation Rules */}
      <Card className="p-6 bg-gray-900 border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h4 className="text-md font-medium text-white">Human Handoff Rules</h4>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="escalation-keywords" className="text-white">
              Escalation Keywords (comma-separated)
            </Label>
            <p className="text-xs text-gray-400 mb-2">
              Messages containing these words will be flagged for human review
            </p>
            <Input
              id="escalation-keywords"
              placeholder="complaint, refund, cancel, angry, manager"
              value={escalationKeywords.join(', ')}
              onChange={(e) => {
                const keywords = e.target.value.split(',').map((k) => k.trim()).filter(Boolean);
                updateSetting('escalationKeywords', JSON.stringify(keywords));
              }}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="escalation-topics" className="text-white">
              Auto-Escalate Topics (comma-separated)
            </Label>
            <Input
              id="escalation-topics"
              placeholder="complaint, technical_issue, billing_dispute"
              value={escalationTopics.join(', ')}
              onChange={(e) => {
                const topics = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                updateSetting('escalationTopics', JSON.stringify(topics));
              }}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6 bg-gray-900 border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-white" />
          <h4 className="text-md font-medium text-white">Escalation Notifications</h4>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-escalation" className="text-white">
              Notify on Escalation
            </Label>
            <Switch
              id="notify-escalation"
              checked={settings.notifyOnEscalation}
              onCheckedChange={(checked) => updateSetting('notifyOnEscalation', checked)}
            />
          </div>

          {settings.notifyOnEscalation && (
            <>
              <div>
                <Label htmlFor="notification-email" className="text-white">Notification Email</Label>
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="your@email.com"
                  value={settings.notificationEmail || ''}
                  onChange={(e) => updateSetting('notificationEmail', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="notification-phone" className="text-white">
                  Notification Phone (optional)
                </Label>
                <Input
                  id="notification-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={settings.notificationPhone || ''}
                  onChange={(e) => updateSetting('notificationPhone', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
