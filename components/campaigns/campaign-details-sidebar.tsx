'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { VoiceAgentSelect } from '@/components/campaigns/voice-agent-select';
import { CampaignBuilderState } from '@/components/campaigns/campaign-builder-types';
import { CampaignStep } from '@/components/campaigns/campaign-builder-types';

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

interface CampaignDetailsSidebarProps {
  campaign: CampaignBuilderState;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignBuilderState>>;
  onResetStep: () => void;
}

export function CampaignDetailsSidebar({ campaign, setCampaign, onResetStep }: CampaignDetailsSidebarProps) {
  return (
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
            onValueChange={(v: 'email-drip' | 'sms-drip' | 'voice') => {
              const stepType = v === 'email-drip' ? 'EMAIL' : v === 'sms-drip' ? 'SMS' : 'VOICE';
              setCampaign((c) => ({
                ...c,
                campaignType: v,
                steps: [createStep(stepType, 1)],
              }));
              onResetStep();
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email-drip">Email Drip</SelectItem>
              <SelectItem value="sms-drip">SMS Drip</SelectItem>
              <SelectItem value="voice">Voice Campaign</SelectItem>
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="LEAD_CREATED">When Lead is Created</SelectItem>
              <SelectItem value="LEAD_STATUS">When Lead Status Changes</SelectItem>
              <SelectItem value="TAG_ADDED">When Tag is Added</SelectItem>
              <SelectItem value="FORM_SUBMITTED">When Form is Submitted</SelectItem>
              <SelectItem value="WEBSITE_VOICE_AI_LEAD">Website Voice AI Lead</SelectItem>
              <SelectItem value="TRIAL_ENDED">When Trial Ends</SelectItem>
              <SelectItem value="DEAL_WON">When Deal is Won</SelectItem>
              <SelectItem value="SERVICE_COMPLETED">When Service/Appointment Completed</SelectItem>
              <SelectItem value="WORKFLOW_TASK_COMPLETED">When Workflow Task Completes</SelectItem>
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
        {campaign.campaignType === 'voice' && (
          <>
            <div>
              <Label>Default Voice Agent</Label>
              <VoiceAgentSelect
                value={campaign.voiceAgentId || ''}
                onChange={(v) => setCampaign((c) => ({ ...c, voiceAgentId: v }))}
                placeholder="Select voice agent"
              />
            </div>
            <div>
              <Label>Min Lead Score</Label>
              <Input
                type="number" min={0} max={100}
                value={campaign.minLeadScore ?? 75}
                onChange={(e) => setCampaign((c) => ({ ...c, minLeadScore: parseInt(e.target.value) || 75 }))}
              />
            </div>
            <div>
              <Label>Max Calls Per Day</Label>
              <Input
                type="number" min={1}
                value={campaign.maxCallsPerDay ?? 50}
                onChange={(e) => setCampaign((c) => ({ ...c, maxCallsPerDay: parseInt(e.target.value) || 50 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Call Window Start</Label>
                <Input type="time" value={campaign.callWindowStart || '09:00'} onChange={(e) => setCampaign((c) => ({ ...c, callWindowStart: e.target.value }))} />
              </div>
              <div>
                <Label>Call Window End</Label>
                <Input type="time" value={campaign.callWindowEnd || '17:00'} onChange={(e) => setCampaign((c) => ({ ...c, callWindowEnd: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Max Retry Attempts</Label>
              <Input
                type="number" min={0} max={5}
                value={campaign.maxRetries ?? 2}
                onChange={(e) => setCampaign((c) => ({ ...c, maxRetries: parseInt(e.target.value) || 2 }))}
              />
            </div>
          </>
        )}
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Target Audience (Bulk)</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Filters applied when sending to contacts. Personalize with {'{{firstName}}'}, {'{{notes}}'}, etc.
          </p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Min Lead Score</Label>
              <Input
                type="number" min={0} max={100}
                value={campaign.audience?.filters?.minLeadScore ?? campaign.minLeadScore ?? 75}
                onChange={(e) =>
                  setCampaign((c) => ({
                    ...c,
                    audience: {
                      ...c.audience,
                      type: c.audience?.type || 'FILTERED',
                      filters: { ...c.audience?.filters, minLeadScore: parseInt(e.target.value) || 75 },
                    },
                  }))
                }
              />
            </div>
            {campaign.campaignType === 'voice' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={campaign.audience?.filters?.hasPhone ?? true}
                  onChange={(e) =>
                    setCampaign((c) => ({
                      ...c,
                      audience: {
                        ...c.audience,
                        type: c.audience?.type || 'FILTERED',
                        filters: { ...c.audience?.filters, hasPhone: e.target.checked },
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-xs">Has phone number</span>
              </label>
            )}
            {(campaign.campaignType === 'email-drip' || campaign.campaignType === 'sms-drip') && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={campaign.audience?.filters?.hasEmail ?? false}
                  onChange={(e) =>
                    setCampaign((c) => ({
                      ...c,
                      audience: {
                        ...c.audience,
                        type: c.audience?.type || 'FILTERED',
                        filters: { ...c.audience?.filters, hasEmail: e.target.checked },
                      },
                    }))
                  }
                  className="rounded"
                />
                <span className="text-xs">Has email</span>
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
