'use client';

import React, { useState } from 'react';
import { CampaignStep } from './campaign-builder-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CampaignStepEditorPanelProps {
  step: CampaignStep | null;
  onClose: () => void;
  onSave: (step: CampaignStep) => void;
  onDelete?: (stepId: string) => void;
}

export function CampaignStepEditorPanel({
  step,
  onClose,
  onSave,
  onDelete,
}: CampaignStepEditorPanelProps) {
  const [edited, setEdited] = useState<CampaignStep | null>(step);
  const [aiLoading, setAiLoading] = useState(false);

  if (!edited) return null;

  const update = (updates: Partial<CampaignStep>) => {
    setEdited((s) => (s ? { ...s, ...updates } : null));
  };

  const handleAiGenerate = async (field: 'email' | 'sms') => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType: field === 'email' ? 'EMAIL' : 'SMS',
          goal: 'Welcome and nurture new leads',
          targetAudience: 'New leads',
          tone: 'professional',
        }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      const gen = data.generated || data;
      if (field === 'email' && (gen.email || gen.emailSubjects)) {
        update({
          subject: gen.emailSubjects?.[0] || gen.email?.subject || '',
          htmlContent: gen.email?.html || gen.email?.body || '',
          textContent: gen.email?.body || '',
        });
        toast.success('Email content generated');
      }
      if (field === 'sms' && gen.sms) {
        update({ message: gen.sms?.smsText || gen.sms?.message || '' });
        toast.success('SMS content generated');
      }
    } catch (e) {
      toast.error('Failed to generate with AI');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full max-w-md">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">
          Edit {edited.type} Step
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <Label>Step Name</Label>
          <Input
            value={edited.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g., Welcome Email"
          />
        </div>

        {edited.type === 'EMAIL' && (
          <>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Subject Line</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAiGenerate('email')}
                  disabled={aiLoading}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI'}
                </Button>
              </div>
              <Input
                value={edited.subject || ''}
                onChange={(e) => update({ subject: e.target.value })}
                placeholder="Enter subject..."
              />
            </div>
            <div>
              <Label>Preview Text</Label>
              <Input
                value={edited.previewText || ''}
                onChange={(e) => update({ previewText: e.target.value })}
                placeholder="Inbox preview..."
              />
            </div>
            <div>
              <Label>Email Content (HTML)</Label>
              <Textarea
                value={edited.htmlContent || ''}
                onChange={(e) => update({ htmlContent: e.target.value })}
                placeholder="Enter HTML content..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Plain Text (Fallback)</Label>
              <Textarea
                value={edited.textContent || ''}
                onChange={(e) => update({ textContent: e.target.value })}
                placeholder="Plain text version..."
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Skip if Lead Engaged</Label>
                <p className="text-xs text-gray-500">Don&apos;t send if lead opened/clicked previous</p>
              </div>
              <Switch
                checked={edited.skipIfEngaged ?? false}
                onCheckedChange={(c) => update({ skipIfEngaged: c })}
              />
            </div>
          </>
        )}

        {edited.type === 'SMS' && (
          <>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Message Content</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAiGenerate('sms')}
                  disabled={aiLoading}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {aiLoading ? 'Generating...' : 'AI'}
                </Button>
              </div>
              <Textarea
                value={edited.message || ''}
                onChange={(e) => update({ message: e.target.value })}
                placeholder="Enter SMS message..."
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                {edited.message?.length || 0} chars
                {(edited.message?.length || 0) > 160 &&
                  ` • ${Math.ceil((edited.message?.length || 0) / 160)} segments`}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Skip if Lead Replied</Label>
                <p className="text-xs text-gray-500">Don&apos;t send if lead replied to previous SMS</p>
              </div>
              <Switch
                checked={edited.skipIfReplied ?? false}
                onCheckedChange={(c) => update({ skipIfReplied: c })}
              />
            </div>
          </>
        )}

        {edited.type === 'DELAY' && (
          <>
            <div>
              <Label>Delay (Days)</Label>
              <Input
                type="number"
                min={0}
                value={edited.delayDays ?? 0}
                onChange={(e) => update({ delayDays: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Additional Delay (Hours)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={edited.delayHours ?? 0}
                onChange={(e) => update({ delayHours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Preferred Send Time (HH:MM)</Label>
              <Input
                type="time"
                value={edited.sendTime || ''}
                onChange={(e) => update({ sendTime: e.target.value })}
              />
            </div>
          </>
        )}

        {edited.type !== 'DELAY' && (
          <div>
            <Label>Delay After Previous (Days)</Label>
            <Input
              type="number"
              min={0}
              value={edited.delayDays ?? 0}
              onChange={(e) => update({ delayDays: parseInt(e.target.value) || 0 })}
            />
          </div>
        )}
      </div>
      <div className="p-4 border-t flex gap-2">
        <Button onClick={() => onSave(edited)} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        {onDelete && edited.displayOrder > 1 && (
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              onDelete(edited.id);
              onClose();
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
