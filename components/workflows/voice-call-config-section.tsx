'use client';

import React from 'react';
import { WorkflowTask } from './types';
import { VOICE_LANGUAGES } from '@/lib/voice-languages';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Shield, MessageSquare } from 'lucide-react';

interface AIEmployee {
  id: string;
  profession: string;
  customName: string;
  voiceAgentId: string | null;
  isActive: boolean;
}

interface VoiceCallConfigSectionProps {
  editedTask: WorkflowTask;
  setEditedTask: (task: WorkflowTask) => void;
  assignedProfessionalType: string | undefined;
  aiEmployees: AIEmployee[];
}

export function VoiceCallConfigSection({
  editedTask,
  setEditedTask,
  assignedProfessionalType,
  aiEmployees,
}: VoiceCallConfigSectionProps) {
  return (
    <>
      <Card className="p-4 border-purple-200 bg-purple-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-purple-600" />
          <Label className="text-sm font-semibold">Voice Call Language</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Override language for this task. Leave as Default to use the AI employee&apos;s setting.
        </p>
        <Select
          value={(editedTask as any).actionConfig?.voiceLanguage || '__default__'}
          onValueChange={(value) => {
            const currentActionConfig = (editedTask as any).actionConfig || {};
            setEditedTask({
              ...editedTask,
              ...(editedTask as any),
              actionConfig: {
                ...currentActionConfig,
                voiceLanguage: value === '__default__' ? undefined : value,
              },
            } as WorkflowTask);
          }}
        >
          <SelectTrigger className="border-purple-200">
            <SelectValue placeholder="Default (use employee setting)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Default</SelectItem>
            {VOICE_LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Jurisdiction - for Professional AI (Accountant, Legal, etc.) */}
      {assignedProfessionalType && (
        <Card className="p-4 border-sky-200 bg-sky-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-sky-600" />
            <Label className="text-sm font-semibold">Jurisdiction / Region</Label>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Set region for tax, legal, or compliance (e.g. Quebec, Ontario). Applies to Accountant, Legal Assistant, HR.
          </p>
          <Select
            value={(editedTask as any).actionConfig?.jurisdiction || '__default__'}
            onValueChange={(value) => {
              const currentActionConfig = (editedTask as any).actionConfig || {};
              setEditedTask({
                ...editedTask,
                ...(editedTask as any),
                actionConfig: {
                  ...currentActionConfig,
                  jurisdiction: value === '__default__' ? undefined : value,
                },
              } as WorkflowTask);
            }}
          >
            <SelectTrigger className="border-sky-200">
              <SelectValue placeholder="Default (general)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Default (general)</SelectItem>
              <SelectItem value="QUEBEC">Quebec</SelectItem>
              <SelectItem value="ONTARIO">Ontario</SelectItem>
              <SelectItem value="BC">British Columbia</SelectItem>
              <SelectItem value="ALBERTA">Alberta</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="US_FEDERAL">US Federal</SelectItem>
            </SelectContent>
          </Select>
        </Card>
      )}

      {/* Per-task prompt override - same agent, different script per task */}
      <Card className="p-4 border-indigo-200 bg-indigo-50/50">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <Label className="text-sm font-semibold">Customize Agent for This Task</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Override what this agent says for this specific task. Use when the same agent appears in multiple steps (e.g. intro call vs follow-up call).
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">First Message (greeting)</Label>
            <Textarea
              value={(editedTask as any).actionConfig?.firstMessage ?? ''}
              onChange={(e) => {
                const currentActionConfig = (editedTask as any).actionConfig || {};
                setEditedTask({
                  ...editedTask,
                  ...(editedTask as any),
                  actionConfig: {
                    ...currentActionConfig,
                    firstMessage: e.target.value || undefined,
                  },
                } as WorkflowTask);
              }}
              className="bg-white border-indigo-200 text-sm min-h-[60px] focus:border-indigo-500"
              placeholder="e.g. Hi, this is Sarah. I saw you inquired about properties. Do you have a moment to chat?"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">What the agent says when the call connects. Leave empty to use default.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">System Prompt (optional)</Label>
            <Textarea
              value={(editedTask as any).actionConfig?.systemPrompt ?? ''}
              onChange={(e) => {
                const currentActionConfig = (editedTask as any).actionConfig || {};
                setEditedTask({
                  ...editedTask,
                  ...(editedTask as any),
                  actionConfig: {
                    ...currentActionConfig,
                    systemPrompt: e.target.value || undefined,
                  },
                } as WorkflowTask);
              }}
              className="bg-white border-indigo-200 text-sm min-h-[100px] focus:border-indigo-500"
              placeholder="e.g. Focus on scheduling a showing. You already qualified this lead in a previous call."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Override the agent&apos;s full instructions for this task. Leave empty to use default.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
