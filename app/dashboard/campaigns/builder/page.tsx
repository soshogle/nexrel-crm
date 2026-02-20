'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CampaignCanvas } from '@/components/campaigns/campaign-canvas';
import { CampaignStepEditorPanel } from '@/components/campaigns/campaign-step-editor-panel';
import { CampaignDetailsSidebar } from '@/components/campaigns/campaign-details-sidebar';
import {
  CampaignStep,
  CampaignBuilderState,
} from '@/components/campaigns/campaign-builder-types';

function createStep(type: CampaignStep['type'], order: number): CampaignStep {
  const names: Record<string, string> = {
    EMAIL: `Email ${order}`,
    SMS: `SMS ${order}`,
    VOICE: `Voice Call ${order}`,
    DELAY: `Wait ${order}d`,
  };
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    displayOrder: order,
    name: names[type] || `Step ${order}`,
    delayDays: order > 1 ? 1 : 0,
    delayHours: 0,
    sendTime: '',
  };
}

export default function CampaignBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<CampaignBuilderState>({
    name: '',
    description: '',
    campaignType: 'email-drip',
    triggerType: 'MANUAL',
    steps: [createStep('EMAIL', 1)],
  });

  useEffect(() => {
    if (typeParam === 'sms-drip') {
      setCampaign((c) => ({
        ...c,
        campaignType: 'sms-drip',
        steps: [createStep('SMS', 1)],
        audience: c.audience || { type: 'FILTERED', filters: { minLeadScore: 75 } },
      }));
    } else if (typeParam === 'email-drip') {
      setCampaign((c) => ({
        ...c,
        campaignType: 'email-drip',
        steps: [createStep('EMAIL', 1)],
        audience: c.audience || { type: 'FILTERED', filters: { minLeadScore: 75 } },
      }));
    } else if (typeParam === 'voice') {
      setCampaign((c) => ({
        ...c,
        campaignType: 'voice',
        steps: [createStep('VOICE', 1)],
        minLeadScore: c.minLeadScore ?? 75,
        maxCallsPerDay: c.maxCallsPerDay ?? 50,
        callWindowStart: c.callWindowStart ?? '09:00',
        callWindowEnd: c.callWindowEnd ?? '17:00',
        maxRetries: c.maxRetries ?? 2,
        audience: c.audience || { type: 'FILTERED', filters: { minLeadScore: 75, hasPhone: true } },
      }));
    }
  }, [typeParam]);

  const allowedStepTypes =
    campaign.campaignType === 'voice'
      ? (['VOICE', 'DELAY'] as const)
      : campaign.campaignType === 'email-drip'
        ? (['EMAIL', 'DELAY'] as const)
        : (['SMS', 'DELAY'] as const);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showAddStepDialog, setShowAddStepDialog] = useState(false);
  const [newStepType, setNewStepType] = useState<CampaignStep['type']>('EMAIL');
  const [newStepName, setNewStepName] = useState('');

  const selectedStep = campaign.steps.find((s) => s.id === selectedStepId) || null;

  const addStep = (type: CampaignStep['type'], customName?: string) => {
    if (!allowedStepTypes.includes(type)) return;
    const nextOrder = campaign.steps.length + 1;
    const step = createStep(type, nextOrder);
    if (customName?.trim()) {
      step.name = customName.trim();
    }
    setCampaign((c) => ({
      ...c,
      steps: [...c.steps, step].map((s, i) => ({ ...s, displayOrder: i + 1 })),
    }));
    setSelectedStepId(step.id);
    setShowAddStepDialog(false);
    setNewStepName('');
  };

  const handleAddStepFromDialog = () => {
    addStep(newStepType, newStepName || undefined);
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
      toast.error('Add at least one Email, SMS, or Voice step');
      return;
    }
    const isVoice = campaign.campaignType === 'voice';
    const isEmailDrip = campaign.campaignType === 'email-drip';
    if (isVoice) {
      const voiceStep = steps.find((s) => s.type === 'VOICE');
      const voiceAgentId = voiceStep?.voiceAgentId || campaign.voiceAgentId;
      if (!voiceAgentId?.trim()) {
        toast.error('Voice campaigns require a voice agent. Select one in the step or campaign details.');
        return;
      }
    }
    if (isEmailDrip && !campaign.fromEmail?.trim()) {
      toast.error('From Email is required for email campaigns');
      return;
    }

    // Voice campaigns use /api/campaigns
    if (isVoice) {
      try {
        setSaving(true);
        const voiceStep = steps.find((s) => s.type === 'VOICE');
        const voiceAgentId = voiceStep?.voiceAgentId || campaign.voiceAgentId;
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: campaign.name.trim(),
            description: campaign.description || undefined,
            type: 'VOICE_CALL',
            voiceAgentId,
            callScript: voiceStep?.callScript || undefined,
            minLeadScore: campaign.minLeadScore ?? campaign.audience?.filters?.minLeadScore ?? 75,
            maxCallsPerDay: campaign.maxCallsPerDay ?? 50,
            callWindowStart: campaign.callWindowStart ?? '09:00',
            callWindowEnd: campaign.callWindowEnd ?? '17:00',
            maxRetries: campaign.maxRetries ?? 2,
            targetAudience: campaign.audience?.filters || { minScore: campaign.minLeadScore ?? 75 },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create voice campaign');
        }
        const data = await res.json();
        toast.success('Voice campaign created!');
        router.push(`/dashboard/campaigns/${data.campaign?.id || data.id}`);
      } catch (e: unknown) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Failed to create voice campaign');
      } finally {
        setSaving(false);
      }
      return;
    }

    const apiBase = isEmailDrip ? '/api/campaigns/drip' : '/api/campaigns/sms-drip';

    try {
      setSaving(true);
      // Always create as DRAFT first so we can add sequences, then activate
      const campaignBody: Record<string, unknown> = {
        name: campaign.name,
        description: campaign.description,
        status: 'DRAFT',
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
      // Map stepId -> sequenceOrder (1-based) for non-DELAY steps
      const stepIdToSeqOrder: Record<string, number> = {};
      let seqIdx = 0;
      for (const st of orderedSteps) {
        if (st.type === 'DELAY') continue;
        seqIdx++;
        stepIdToSeqOrder[st.id] = seqIdx;
      }

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
        // Persist skip conditions, branching (like workflow builder)
        const hasSkip = s.skipConditions && Array.isArray(s.skipConditions) && s.skipConditions.length > 0;
        const hasBranch = s.parentStepId && stepIdToSeqOrder[s.parentStepId] != null;
        if (hasSkip || hasBranch) {
          seqBody.sendConditions = {
            skipConditions: hasSkip ? s.skipConditions : undefined,
            branchFromSequenceOrder: hasBranch ? stepIdToSeqOrder[s.parentStepId!] : undefined,
            branchCondition: hasBranch && s.branchCondition ? s.branchCondition : undefined,
          };
        }
        await fetch(seqApiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seqBody),
        });
      }

      // If user chose ACTIVE, activate the campaign now that sequences are added
      if (status === 'ACTIVE') {
        const activateUrl = isEmailDrip
          ? `/api/campaigns/drip/${created.id}/activate`
          : `/api/campaigns/sms-drip/${created.id}/activate`;
        const activateRes = await fetch(activateUrl, { method: 'POST' });
        if (!activateRes.ok) {
          console.error('Failed to activate campaign, left as DRAFT');
          toast.warning('Campaign saved as draft (activation failed — activate manually)');
        }
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
          <Button variant="ghost" onClick={() => router.push('/dashboard/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Builder</h1>
            <p className="text-sm text-gray-500">
              Drag-and-drop canvas. Add Email, SMS, Voice, or Delay steps.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Step</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Step Type</Label>
                  <Select
                    value={newStepType}
                    onValueChange={(v) => setNewStepType(v as CampaignStep['type'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStepTypes.includes('EMAIL') && (
                        <SelectItem value="EMAIL">📧 Email</SelectItem>
                      )}
                      {allowedStepTypes.includes('SMS') && (
                        <SelectItem value="SMS">💬 SMS</SelectItem>
                      )}
                      {allowedStepTypes.includes('VOICE') && (
                        <SelectItem value="VOICE">📞 Voice</SelectItem>
                      )}
                      {allowedStepTypes.includes('DELAY') && (
                        <SelectItem value="DELAY">⏱️ Delay</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Step Name (optional)</Label>
                  <Input
                    placeholder={
                      newStepType === 'EMAIL'
                        ? 'e.g., Welcome Email'
                        : newStepType === 'SMS'
                          ? 'e.g., Follow-up SMS'
                          : newStepType === 'VOICE'
                            ? 'e.g., Initial Call'
                            : 'e.g., Wait 3 days'
                    }
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStepFromDialog()}
                  />
                </div>
                <Button onClick={handleAddStepFromDialog} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
        <CampaignDetailsSidebar
          campaign={campaign}
          setCampaign={setCampaign}
          onResetStep={() => setSelectedStepId(null)}
        />

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
            steps={campaign.steps}
            onClose={() => setSelectedStepId(null)}
            onSave={(s) => {
              updateStep(s);
              setSelectedStepId(null);
            }}
            onDelete={removeStep}
            onToggleExpand={(stepId) => {
              setCampaign((c) => ({
                ...c,
                steps: c.steps.map((s) =>
                  s.id === stepId ? { ...s, isExpanded: !s.isExpanded } : s
                ),
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}
