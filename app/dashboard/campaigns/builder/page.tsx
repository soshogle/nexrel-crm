'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CampaignCanvas } from '@/components/campaigns/campaign-canvas';
import { CampaignStepEditorPanel } from '@/components/campaigns/campaign-step-editor-panel';
import {
  CampaignStep,
  CampaignBuilderState,
} from '@/components/campaigns/campaign-builder-types';

function createStep(type: CampaignStep['type'], order: number): CampaignStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    displayOrder: order,
    name: type === 'EMAIL' ? `Email ${order}` : type === 'SMS' ? `SMS ${order}` : `Wait ${order}d`,
    delayDays: order > 1 ? 1 : 0,
    delayHours: 0,
    sendTime: '',
  };
}

export default function CampaignBuilderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<CampaignBuilderState>({
    name: '',
    description: '',
    campaignType: 'email-drip',
    triggerType: 'MANUAL',
    steps: [createStep('EMAIL', 1)],
  });

  const allowedStepTypes = campaign.campaignType === 'email-drip' ? (['EMAIL', 'DELAY'] as const) : (['SMS', 'DELAY'] as const);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const selectedStep = campaign.steps.find((s) => s.id === selectedStepId) || null;

  const addStep = (type: CampaignStep['type']) => {
    if (!allowedStepTypes.includes(type)) return;
    const nextOrder = campaign.steps.length + 1;
    const step = createStep(type, nextOrder);
    setCampaign((c) => ({
      ...c,
      steps: [...c.steps, step].map((s, i) => ({ ...s, displayOrder: i + 1 })),
    }));
    setSelectedStepId(step.id);
  };

  const updateStep = (step: CampaignStep) => {
    setCampaign((c) => ({
      ...c,
      steps: c.steps.map((s) => (s.id === step.id ? step : s)),
    }));
  };

  const reorderSteps = (steps: CampaignStep[]) => {
    setCampaign((c) => ({ ...c, steps }));
  };

  const removeStep = (stepId: string) => {
    if (campaign.steps.length <= 1) {
      toast.error('Campaign must have at least one step');
      return;
    }
    const filtered = campaign.steps.filter((s) => s.id !== stepId);
    setCampaign((c) => ({
      ...c,
      steps: filtered.map((s, i) => ({ ...s, displayOrder: i + 1 })),
    }));
    setSelectedStepId(null);
  };

  const handleSave = async (status: 'DRAFT' | 'ACTIVE' = 'DRAFT') => {
    if (!campaign.name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    const steps = [...campaign.steps].sort((a, b) => a.displayOrder - b.displayOrder).filter((s) => s.type !== 'DELAY');
    if (steps.length === 0) {
      toast.error('Add at least one Email or SMS step');
      return;
    }
    const isEmailDrip = campaign.campaignType === 'email-drip';
    if (isEmailDrip && !campaign.fromEmail?.trim()) {
      toast.error('From Email is required for email campaigns');
      return;
    }
    const apiBase = isEmailDrip ? '/api/campaigns/drip' : '/api/campaigns/sms-drip';

    try {
      setSaving(true);
      const campaignBody: Record<string, unknown> = {
        name: campaign.name,
        description: campaign.description,
        status,
        triggerType: campaign.triggerType,
        tags: campaign.tags?.trim() || undefined,
      };
      if (isEmailDrip) {
        campaignBody.fromName = campaign.fromName;
        campaignBody.fromEmail = campaign.fromEmail;
        campaignBody.replyTo = campaign.replyTo;
      } else {
        campaignBody.fromNumber = campaign.fromNumber;
      }

      const campaignRes = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignBody),
      });
      if (!campaignRes.ok) {
        const err = await campaignRes.json();
        throw new Error(err.error || 'Failed to create campaign');
      }
      const { campaign: created } = await campaignRes.json();

      const seqApiBase = isEmailDrip
        ? `/api/campaigns/drip/${created.id}/sequences`
        : `/api/campaigns/sms-drip/${created.id}/sequences`;

      const orderedSteps = [...campaign.steps].sort((a, b) => a.displayOrder - b.displayOrder);
      let seqIndex = 0;
      let accumulatedDelayDays = 0;
      let accumulatedDelayHours = 0;
      let lastSendTime = '';
      for (const s of orderedSteps) {
        if (s.type === 'DELAY') {
          accumulatedDelayDays += s.delayDays ?? 0;
          accumulatedDelayHours += s.delayHours ?? 0;
          if (s.sendTime) lastSendTime = s.sendTime;
          continue;
        }
        seqIndex++;
        const seqBody: Record<string, unknown> = {
          sequenceOrder: seqIndex,
          name: s.name,
          delayDays: s.delayDays ?? accumulatedDelayDays,
          delayHours: s.delayHours ?? accumulatedDelayHours,
          sendTime: s.sendTime || lastSendTime || undefined,
        };
        accumulatedDelayDays = 0;
        accumulatedDelayHours = 0;
        if (s.type === 'EMAIL') {
          seqBody.subject = s.subject;
          seqBody.previewText = s.previewText;
          seqBody.htmlContent = s.htmlContent;
          seqBody.textContent = s.textContent;
          seqBody.skipIfEngaged = s.skipIfEngaged;
        }
        if (s.type === 'SMS') {
          seqBody.message = s.message;
          seqBody.skipIfReplied = s.skipIfReplied;
        }
        await fetch(seqApiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seqBody),
        });
      }

      toast.success(status === 'ACTIVE' ? 'Campaign created and activated!' : 'Campaign saved as draft');
      const redirect = isEmailDrip
        ? `/dashboard/campaigns/email-drip/${created.id}`
        : `/dashboard/campaigns/sms-drip/${created.id}`;
      router.push(redirect);
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Builder</h1>
            <p className="text-sm text-gray-500">
              Drag-and-drop canvas. Add Email, SMS, or Delay steps.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave('ACTIVE')} disabled={saving}>
            {saving ? 'Creating...' : 'Create & Activate'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
          <h3 className="font-semibold text-gray-900 mb-3">Campaign Details</h3>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={campaign.name}
                onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g., Welcome Series"
              />
            </div>
            <div>
              <Label>Campaign Type</Label>
              <Select
                value={campaign.campaignType}
                onValueChange={(v: 'email-drip' | 'sms-drip') => {
                  setCampaign((c) => ({
                    ...c,
                    campaignType: v,
                    steps: [createStep(v === 'email-drip' ? 'EMAIL' : 'SMS', 1)],
                  }));
                  setSelectedStepId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email-drip">Email Drip</SelectItem>
                  <SelectItem value="sms-drip">SMS Drip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={campaign.description}
                onChange={(e) => setCampaign((c) => ({ ...c, description: e.target.value }))}
                placeholder="Describe this campaign..."
                rows={2}
              />
            </div>
            <div>
              <Label>Trigger</Label>
              <Select
                value={campaign.triggerType}
                onValueChange={(v) => setCampaign((c) => ({ ...c, triggerType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="LEAD_CREATED">When Lead is Created</SelectItem>
                  <SelectItem value="LEAD_STATUS">When Lead Status Changes</SelectItem>
                  <SelectItem value="TAG_ADDED">When Tag is Added</SelectItem>
                  <SelectItem value="WEBSITE_VOICE_AI_LEAD">Website Voice AI Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {campaign.steps.some((s) => s.type === 'EMAIL') && (
              <>
                <div>
                  <Label>From Email *</Label>
                  <Input
                    value={campaign.fromEmail || ''}
                    onChange={(e) => setCampaign((c) => ({ ...c, fromEmail: e.target.value }))}
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={campaign.fromName || ''}
                    onChange={(e) => setCampaign((c) => ({ ...c, fromName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
              </>
            )}
            {campaign.steps.some((s) => s.type === 'SMS') && (
              <div>
                <Label>From Number (optional)</Label>
                <Input
                  value={campaign.fromNumber || ''}
                  onChange={(e) => setCampaign((c) => ({ ...c, fromNumber: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 p-4">
          <CampaignCanvas
            campaign={campaign}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            onUpdateStep={updateStep}
            onReorderSteps={reorderSteps}
            onAddStep={addStep}
            allowedStepTypes={allowedStepTypes}
          />
        </div>

        {selectedStep && (
          <CampaignStepEditorPanel
            step={selectedStep}
            onClose={() => setSelectedStepId(null)}
            onSave={(s) => {
              updateStep(s);
              setSelectedStepId(null);
            }}
            onDelete={removeStep}
          />
        )}
      </div>
    </div>
  );
}
