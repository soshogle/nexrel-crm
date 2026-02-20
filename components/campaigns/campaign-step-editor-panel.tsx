'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CampaignStep } from './campaign-builder-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { X, Save, Sparkles, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoiceAgentSelect } from './voice-agent-select';
import { PersonalizationVariables } from '@/components/workflows/personalization-variables';
import { toast } from 'sonner';

interface CampaignStepEditorPanelProps {
  step: CampaignStep | null;
  steps?: CampaignStep[];
  onClose: () => void;
  onSave: (step: CampaignStep) => void;
  onDelete?: (stepId: string) => void;
  onToggleExpand?: (stepId: string) => void;
}

export function CampaignStepEditorPanel({
  step,
  steps = [],
  onClose,
  onSave,
  onDelete,
  onToggleExpand,
}: CampaignStepEditorPanelProps) {
  const [edited, setEdited] = useState<CampaignStep | null>(step);
  const [aiLoading, setAiLoading] = useState(false);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);
  const smsContentRef = useRef<HTMLTextAreaElement>(null);
  const [showBranching, setShowBranching] = useState(!!step?.parentStepId);
  const [skipConditions, setSkipConditions] = useState<Array<{ field: string; operator: string; value: string }>>(
    step?.skipConditions && Array.isArray(step.skipConditions) ? step.skipConditions : []
  );

  useEffect(() => {
    setEdited(step);
    setShowBranching(!!step?.parentStepId);
    setSkipConditions(
      step?.skipConditions && Array.isArray(step.skipConditions) ? step.skipConditions : []
    );
  }, [step]);

  if (!edited) return null;

  const handleBranchConditionChange = (field: string, value: string) => {
    const current = edited.branchCondition || { field: '', operator: 'equals', value: '' };
    setEdited({ ...edited, branchCondition: { ...current, [field]: value } });
  };

  const handleParentStepChange = (parentStepId: string | null) => {
    setEdited({
      ...edited,
      parentStepId: parentStepId || undefined,
      branchCondition: parentStepId
        ? (edited.branchCondition || { field: 'status', operator: 'equals', value: '' })
        : undefined,
    });
    setShowBranching(!!parentStepId);
  };

  const update = (updates: Partial<CampaignStep>) => {
    setEdited((s) => (s ? { ...s, ...updates } : null));
  };

  const handleAiGenerate = async (field: 'email' | 'sms' | 'voice') => {
    setAiLoading(true);
    try {
      const typeMap = { email: 'EMAIL', sms: 'SMS', voice: 'VOICE_CALL' } as const;
      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType: typeMap[field],
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
      if (field === 'voice' && gen.voice) {
        update({ callScript: gen.voice?.script || gen.voice?.body || '' });
        toast.success('Voice script generated');
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
              <div className="flex items-center justify-between mb-1">
                <Label>Email Content (HTML)</Label>
                <PersonalizationVariables textareaRef={emailContentRef} onInsert={(token) => {
                  update({ htmlContent: (edited.htmlContent || '') + token });
                }} mode="button" />
              </div>
              <Textarea
                ref={emailContentRef}
                value={edited.htmlContent || ''}
                onChange={(e) => update({ htmlContent: e.target.value })}
                placeholder="Hi {{firstName}}, we wanted to reach out..."
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
                <div className="flex items-center gap-1">
                  <PersonalizationVariables textareaRef={smsContentRef} onInsert={(token) => {
                    update({ message: (edited.message || '') + token });
                  }} mode="button" groups={['Contact', 'Business']} />
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
              </div>
              <Textarea
                ref={smsContentRef}
                value={edited.message || ''}
                onChange={(e) => update({ message: e.target.value })}
                placeholder="Hi {{firstName}}, we wanted to reach out..."
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

        {edited.type === 'VOICE' && (
          <>
            <div>
              <Label>Voice Agent *</Label>
              <VoiceAgentSelect
                value={edited.voiceAgentId || ''}
                onChange={(v) => update({ voiceAgentId: v })}
                placeholder="Select voice agent for this step"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Label>Call Script / Instructions</Label>
                <div className="flex items-center gap-1">
                  <PersonalizationVariables onInsert={(token) => {
                    update({ callScript: (edited.callScript || '') + token });
                  }} mode="button" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAiGenerate('voice')}
                    disabled={aiLoading}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {aiLoading ? 'Generating...' : 'AI'}
                  </Button>
                </div>
              </div>
              <Textarea
                value={edited.callScript || ''}
                onChange={(e) => update({ callScript: e.target.value })}
                placeholder="Hi {{firstName}}, this is... Reference {{notes}} or {{lastCallSummary}} for context."
                rows={6}
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

        {/* Skip Conditions (like workflow builder) */}
        <Card className="p-4 border-purple-200 bg-purple-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Label className="text-sm font-semibold">Skip Conditions</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Skip this step if any of these conditions are met
          </p>
          {skipConditions.length === 0 ? (
            <p className="text-center py-2 text-sm text-muted-foreground border-2 border-dashed border-purple-200 rounded-lg">
              No skip conditions
            </p>
          ) : (
            <div className="space-y-2">
              {skipConditions.map((condition, index) => (
                <div key={index} className="flex flex-col gap-2 p-2 bg-white rounded border border-purple-200">
                  <div className="flex gap-2">
                    <Input
                      value={condition.field}
                      onChange={(e) => {
                        const next = [...skipConditions];
                        next[index] = { ...next[index], field: e.target.value };
                        setSkipConditions(next);
                        update({ skipConditions: next });
                      }}
                      placeholder="Field (e.g. status)"
                      className="flex-1 text-sm h-8"
                    />
                    <Select
                      value={condition.operator}
                      onValueChange={(v) => {
                        const next = [...skipConditions];
                        next[index] = { ...next[index], operator: v };
                        setSkipConditions(next);
                        update({ skipConditions: next });
                      }}
                    >
                      <SelectTrigger className="w-28 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">equals</SelectItem>
                        <SelectItem value="not_equals">not equals</SelectItem>
                        <SelectItem value="contains">contains</SelectItem>
                        <SelectItem value="greater_than">greater than</SelectItem>
                        <SelectItem value="less_than">less than</SelectItem>
                        <SelectItem value="is_empty">is empty</SelectItem>
                        <SelectItem value="is_not_empty">is not empty</SelectItem>
                        <SelectItem value="opened">opened (email)</SelectItem>
                        <SelectItem value="replied">replied (SMS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={condition.value}
                      onChange={(e) => {
                        const next = [...skipConditions];
                        next[index] = { ...next[index], value: e.target.value };
                        setSkipConditions(next);
                        update({ skipConditions: next });
                      }}
                      placeholder="Value"
                      className="flex-1 text-sm h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newConditions = skipConditions.filter((_, i) => i !== index);
                        setSkipConditions(newConditions);
                        update({ skipConditions: newConditions.length > 0 ? newConditions : null });
                      }}
                      className="h-8 w-8 p-0 text-red-600 shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newCondition = { field: 'status', operator: 'equals', value: '' };
              const newConditions = [...skipConditions, newCondition];
              setSkipConditions(newConditions);
              update({ skipConditions: newConditions });
            }}
            className="w-full mt-2 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            + Add Skip Condition
          </Button>
        </Card>

        {/* Conditional Branching (like workflow builder) */}
        <Card className="p-4 border-purple-200 bg-green-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-green-600" />
              <Label className="text-sm font-semibold">Conditional Branching</Label>
            </div>
            <Switch
              checked={showBranching}
              onCheckedChange={(checked) => {
                setShowBranching(checked);
                if (!checked) handleParentStepChange(null);
              }}
            />
          </div>
          {showBranching && (
            <div className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Branch From Step</Label>
                <Select
                  value={edited.parentStepId || '__none__'}
                  onValueChange={(v) => handleParentStepChange(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="mt-1 border-purple-200">
                    <SelectValue placeholder="Select parent step" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {steps
                      .filter((s) => s.id !== edited.id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name || `${s.type} ${s.displayOrder}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {edited.branchCondition && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Condition Field</Label>
                    <Input
                      value={edited.branchCondition.field}
                      onChange={(e) => handleBranchConditionChange('field', e.target.value)}
                      className="mt-1 border-purple-200"
                      placeholder="e.g., status"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={edited.branchCondition.operator}
                      onValueChange={(v) => handleBranchConditionChange('operator', v)}
                    >
                      <SelectTrigger className="mt-1 border-purple-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">equals</SelectItem>
                        <SelectItem value="not_equals">not equals</SelectItem>
                        <SelectItem value="contains">contains</SelectItem>
                        <SelectItem value="opened">opened (email)</SelectItem>
                        <SelectItem value="replied">replied (SMS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={edited.branchCondition.value}
                      onChange={(e) => handleBranchConditionChange('value', e.target.value)}
                      className="mt-1 border-purple-200"
                      placeholder="e.g., engaged"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Expand/Collapse */}
        {onToggleExpand && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleExpand(edited.id)}
            className="w-full border-purple-200"
          >
            {edited.isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Collapse Step
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Expand Step
              </>
            )}
          </Button>
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
