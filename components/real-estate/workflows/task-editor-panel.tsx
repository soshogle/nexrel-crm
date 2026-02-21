'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkflowTask, RE_AGENTS, TASK_TYPE_ICONS } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2, Save, Shield, Clock, User, GitBranch, Settings, Globe, MessageSquare, AlertTriangle, Phone, Bell, Loader2 } from 'lucide-react';
import { VOICE_LANGUAGES } from '@/lib/voice-languages';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { CalendarConfigSection } from '@/components/workflows/calendar-config-section';
import { PersonalizationVariables } from '@/components/workflows/personalization-variables';

interface TaskEditorPanelProps {
  task: WorkflowTask | null;
  workflowTasks: WorkflowTask[];
  onClose: () => void;
  onSave: (task: WorkflowTask) => void | Promise<boolean>;
  onDelete: (taskId: string) => void;
}

const TASK_TYPES = [
  'QUALIFICATION', 'MLS_SEARCH', 'SHOWING_SCHEDULE', 'SHOWING_FEEDBACK',
  'OFFER_PREP', 'OFFER_SUBMIT', 'CONDITION_TRACKING', 'CLOSING_COORDINATION',
  'POST_CLOSE_FOLLOWUP', 'CMA_GENERATION', 'LISTING_PREP', 'PHOTO_SCHEDULING',
  'MARKETING_DRAFT', 'LISTING_PUBLISH', 'CUSTOM'
];

const DELAY_UNITS = ['MINUTES', 'HOURS', 'DAYS'];

interface AIEmployee {
  id: string;
  profession: string;
  customName: string;
  voiceAgentId: string | null;
  isActive: boolean;
}

const BRANCH_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const BRANCH_FIELDS = [
  { value: 'feedback', label: 'Showing Feedback' },
  { value: 'offer_status', label: 'Offer Status' },
  { value: 'inspection_result', label: 'Inspection Result' },
  { value: 'financing_status', label: 'Financing Status' },
  { value: 'custom', label: 'Custom Field' },
];

const BRANCH_ACTIONS = [
  { value: 'email', label: 'Send Email', icon: '📧' },
  { value: 'sms', label: 'Send SMS', icon: '💬' },
  { value: 'voice_call', label: 'Make Voice Call', icon: '📞' },
  { value: 'task', label: 'Create Task', icon: '✅' },
  { value: 'calendar', label: 'Schedule Calendar Event', icon: '📅' },
  { value: 'document', label: 'Generate Document', icon: '📄' },
  { value: 'cma_generation', label: 'Generate CMA Report', icon: '📊' },
  { value: 'presentation_generation', label: 'Generate Presentation', icon: '📽️' },
  { value: 'market_research', label: 'Run Market Research', icon: '🔍' },
  { value: 'request_review', label: 'Request Review', icon: '⭐' },
  { value: 'notification', label: 'Send Notification', icon: '🔔' },
  { value: 'update_status', label: 'Update Lead Status', icon: '🔄' },
];

const AVAILABLE_ACTIONS = [
  { value: 'voice_call', label: 'Voice Call', icon: '📞', description: 'Make AI voice call via Soshogle AI' },
  { value: 'sms', label: 'SMS', icon: '💬', description: 'Send SMS message via Soshogle AI' },
  { value: 'email', label: 'Email', icon: '📧', description: 'Send email via Soshogle AI' },
  { value: 'task', label: 'Create Task', icon: '✅', description: 'Create a task in CRM' },
  { value: 'calendar', label: 'Calendar Event', icon: '📅', description: 'Create calendar appointment' },
  { value: 'cma_generation', label: 'Generate CMA', icon: '📊', description: 'Create Comparative Market Analysis report' },
  { value: 'presentation_generation', label: 'Generate Presentation', icon: '📽️', description: 'Create property presentation' },
  { value: 'market_research', label: 'Market Research', icon: '🔍', description: 'Generate buyer/seller market report' },
  { value: 'document', label: 'Generate Document', icon: '📄', description: 'Generate document (generic)' },
  { value: 'request_review', label: 'Request Review', icon: '⭐', description: 'Send review request to a client via SMS/email' },
  { value: 'respond_to_review', label: 'AI Review Response', icon: '🤖', description: 'Auto-generate AI response to a review' },
];

export function TaskEditorPanel({
  task,
  workflowTasks,
  onClose,
  onSave,
  onDelete,
}: TaskEditorPanelProps) {
  const [editedTask, setEditedTask] = useState<WorkflowTask | null>(task);
  const [showBranching, setShowBranching] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [aiEmployees, setAiEmployees] = useState<AIEmployee[]>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef<string>('');
  const smsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);

  const buildEffectiveTask = useCallback(() => {
    if (!editedTask) return null;
    const ac = (editedTask as any).actionConfig || {};
    return {
      ...editedTask,
      actionConfig: { ...ac, actions: selectedActions },
    };
  }, [editedTask, selectedActions]);

  const hasUnsavedChanges = (() => {
    const effective = buildEffectiveTask();
    if (!effective) return false;
    const current = JSON.stringify(effective);
    if (!lastSavedRef.current) {
      lastSavedRef.current = current;
      return false;
    }
    return current !== lastSavedRef.current;
  })();

  useEffect(() => {
    fetch('/api/ai-employees/user')
      .then((res) => res.ok ? res.json() : { employees: [] })
      .then((data) => setAiEmployees(data.employees || []))
      .catch(() => setAiEmployees([]));
    fetch('/api/team')
      .then((res) => res.ok ? res.json() : { members: [] })
      .then((data) => {
        const members = data.members || data.teamMembers || [];
        setTeamMembers(Array.isArray(members) ? members : []);
      })
      .catch(() => setTeamMembers([]));
  }, []);
  
  useEffect(() => {
    setEditedTask(task);
    setShowBranching(task?.parentTaskId !== null && task?.parentTaskId !== undefined);

    if (task) {
      const actionConfig = (task as any).actionConfig || {};
      setSelectedActions(actionConfig.actions || []);

      const effective = {
        ...task,
        actionConfig: { ...actionConfig, actions: actionConfig.actions || [] },
      };
      lastSavedRef.current = JSON.stringify(effective);
    }
  }, [task]);
  
  if (!editedTask) return null;
  
  // Update actionConfig when actions change
  const handleActionToggle = (action: string) => {
    const newActions = selectedActions.includes(action)
      ? selectedActions.filter(a => a !== action)
      : [...selectedActions, action];
    
    setSelectedActions(newActions);
    
    // Update task's actionConfig
    const currentActionConfig = (editedTask as any).actionConfig || {};
    setEditedTask({
      ...editedTask,
      ...(editedTask as any),
      actionConfig: {
        ...currentActionConfig,
        actions: newActions,
      },
    } as WorkflowTask);
  };
  
  const handleAgentChange = (value: string) => {
    if (value === 'unassigned') {
      setEditedTask({
        ...editedTask,
        assignedAgentId: null,
        assignedAgentName: null,
        agentColor: '#6B7280',
        assignedAIEmployeeId: null,
      });
      return;
    }
    if (value.startsWith('ai_team:')) {
      const employeeId = value.slice(8);
      const employee = aiEmployees.find((e) => e.id === employeeId);
      setEditedTask({
        ...editedTask,
        assignedAgentId: null,
        assignedAgentName: employee?.customName || employee?.profession || null,
        agentColor: '#8b5cf6',
        assignedAIEmployeeId: employeeId,
      });
      return;
    }
    const agent = RE_AGENTS.find((a) => a.id === value);
    setEditedTask({
      ...editedTask,
      assignedAgentId: value,
      assignedAgentName: agent?.name || null,
      agentColor: agent?.color || '#8b5cf6',
      assignedAIEmployeeId: null,
    });
  };

  const agentSelectValue =
    editedTask.assignedAIEmployeeId
      ? `ai_team:${editedTask.assignedAIEmployeeId}`
      : (editedTask.assignedAgentId || 'unassigned');
  
  const handleBranchConditionChange = (field: string, value: any) => {
    const currentCondition = editedTask.branchCondition || { field: '', operator: 'equals', value: '' };
    setEditedTask({
      ...editedTask,
      branchCondition: { ...currentCondition, [field]: value },
    });
  };
  
  const handleParentTaskChange = (parentTaskId: string | null) => {
    setEditedTask({
      ...editedTask,
      parentTaskId: parentTaskId || undefined,
      branchCondition: parentTaskId ? (editedTask.branchCondition || { field: 'feedback', operator: 'equals', value: '' }) : undefined,
    });
    setShowBranching(!!parentTaskId);
  };
  
  const parentTask = editedTask.parentTaskId 
    ? workflowTasks.find(t => t.id === editedTask.parentTaskId)
    : null;

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSaveAndClose = async () => {
    const taskToSave = {
      ...editedTask,
      actionConfig: {
        ...((editedTask as any).actionConfig || {}),
        actions: selectedActions,
      },
    };
    await Promise.resolve(onSave(taskToSave as WorkflowTask));
    lastSavedRef.current = JSON.stringify(taskToSave);
    setShowCloseConfirm(false);
    onClose();
  };
  
  return (
    <div className="w-96 bg-white border-l-2 border-purple-200 h-full overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-white border-b-2 border-purple-200 p-4 flex items-center justify-between z-10">
        <h3 className="text-lg font-bold text-gray-900">Edit Task</h3>
        <Button variant="ghost" size="icon" onClick={handleCloseAttempt} className="hover:bg-purple-100">
          <X className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Task Preview Card */}
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md border-2 border-white"
              style={{ backgroundColor: editedTask.agentColor || '#8b5cf6' }}
            >
              {TASK_TYPE_ICONS[editedTask.taskType]}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{editedTask.name}</p>
              <p className="text-sm text-gray-600">
                {editedTask.assignedAgentName || 'Unassigned'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {editedTask.isHITL && (
              <Badge className="bg-amber-500 text-white">
                <Shield className="w-3 h-3 mr-1" />
                HITL Gate
              </Badge>
            )}
            {editedTask.delayMinutes > 0 && (
              <Badge className="bg-blue-500 text-white">
                <Clock className="w-3 h-3 mr-1" />
                Delay: {editedTask.delayMinutes}m
              </Badge>
            )}
            {editedTask.parentTaskId && (
              <Badge className="bg-green-500 text-white">
                <GitBranch className="w-3 h-3 mr-1" />
                Branch
              </Badge>
            )}
          </div>
        </Card>
        
        {/* Task Name */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-semibold">Task Name</Label>
          <Input
            value={editedTask.name}
            onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
            className="bg-white border-purple-200 text-gray-900 focus:border-purple-500"
            placeholder="Enter task name"
          />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-semibold">Description</Label>
          <Textarea
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            className="bg-white border-purple-200 text-gray-900 min-h-[80px] focus:border-purple-500"
            placeholder="Describe what this task does..."
          />
        </div>
        
        {/* Task Type */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-semibold">Task Type</Label>
          <Select
            value={editedTask.taskType}
            onValueChange={(value) => setEditedTask({ ...editedTask, taskType: value as WorkflowTask['taskType'] })}
          >
            <SelectTrigger className="bg-white border-purple-200 text-gray-900 focus:border-purple-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-purple-200">
              {TASK_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="text-gray-900 hover:bg-purple-50">
                  <span className="flex items-center gap-2">
                    <span>{TASK_TYPE_ICONS[type]}</span>
                    <span>{type.replace('_', ' ')}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Assigned Agent */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            Assigned AI Agent
          </Label>
          <Select value={agentSelectValue} onValueChange={handleAgentChange}>
            <SelectTrigger className="bg-white border-purple-200 text-gray-900 focus:border-purple-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-purple-200">
              <SelectItem value="unassigned" className="text-gray-500 hover:bg-purple-50">
                Unassigned
              </SelectItem>
              {RE_AGENTS.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="text-gray-900 hover:bg-purple-50">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-gray-500 text-xs">({agent.role})</span>
                  </span>
                </SelectItem>
              ))}
              {aiEmployees.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                    My AI Team
                  </div>
                  {aiEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={`ai_team:${emp.id}`} className="text-gray-900 hover:bg-purple-50">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="font-medium">{emp.customName || emp.profession}</span>
                        <span className="text-gray-500 text-xs">({emp.profession})</span>
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Call Language - when voice call is selected and agent assigned */}
        {selectedActions.includes('voice_call') && (editedTask.assignedAIEmployeeId || editedTask.assignedAgentId) && (
          <>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-semibold text-gray-900">Voice Call Language</Label>
            </div>
            <p className="text-xs text-gray-600 mb-2">
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
              <SelectTrigger className="bg-white border-purple-200 text-gray-900">
                <SelectValue placeholder="Default (use employee setting)" />
              </SelectTrigger>
              <SelectContent className="bg-white border-purple-200">
                <SelectItem value="__default__">Default</SelectItem>
                {VOICE_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="text-gray-900">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          {/* Per-task prompt override - same agent, different script per task */}
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <Label className="text-sm font-semibold text-gray-900">Customize Agent for This Task</Label>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Override what this agent says for this specific task. Use when the same agent appears in multiple steps (e.g. intro call vs follow-up call).
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">First Message (greeting)</Label>
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
                  className="bg-white border-indigo-200 text-gray-900 text-sm min-h-[60px] focus:border-indigo-500"
                  placeholder="e.g. Hi, this is Sarah. I saw you inquired about properties. Do you have a moment to chat?"
                  rows={2}
                />
                <p className="text-xs text-gray-500">What the agent says when the call connects. Leave empty to use default.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">System Prompt (optional)</Label>
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
                  className="bg-white border-indigo-200 text-gray-900 text-sm min-h-[100px] focus:border-indigo-500"
                  placeholder="e.g. Focus on scheduling a showing. You already qualified this lead in a previous call."
                  rows={4}
                />
                <p className="text-xs text-gray-500">Override the agent&apos;s full instructions for this task. Leave empty to use default.</p>
              </div>
            </div>
          </Card>
          </>
        )}

        {/* SMS Message - when SMS action is selected */}
        {selectedActions.includes('sms') && (
          <Card className="p-4 bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200">
            <Label className="text-sm font-semibold text-gray-900">SMS Message</Label>
            <div className="space-y-2 mt-2">
              <div>
                <Label className="text-xs text-gray-600">Send To</Label>
                <Select
                  value={(editedTask as any).actionConfig?.smsRecipient ?? 'lead'}
                  onValueChange={(v) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, smsRecipient: v } } as WorkflowTask);
                  }}
                >
                  <SelectTrigger className="bg-white border-cyan-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead / Contact (from workflow)</SelectItem>
                    <SelectItem value="assigned_agent">Assigned Agent</SelectItem>
                    <SelectItem value="owner">Account Owner</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={`team:${m.id}`}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-gray-600">Message</Label>
                  <PersonalizationVariables textareaRef={smsTextareaRef} onInsert={(token) => {
                    const cur = (editedTask as any).actionConfig?.smsMessage ?? '';
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, smsMessage: cur + token } } as WorkflowTask);
                  }} mode="button" groups={['Contact', 'Business']} />
                </div>
                <Textarea
                  ref={smsTextareaRef}
                  value={(editedTask as any).actionConfig?.smsMessage ?? ''}
                  onChange={(e) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, smsMessage: e.target.value || undefined } } as WorkflowTask);
                  }}
                  placeholder="e.g. Hi {{firstName}}, just following up..."
                  rows={4}
                  className="bg-white border-cyan-200"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Email Content - when Email action is selected */}
        {selectedActions.includes('email') && (
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-gray-900">Email Content</Label>
              <PersonalizationVariables
                inputRef={emailSubjectRef}
                textareaRef={emailBodyRef}
                mode="button"
                groups={['Contact', 'Business', 'Context']}
              />
            </div>
            <div className="space-y-2 mt-2">
              <div>
                <Label className="text-xs text-gray-600">Send To</Label>
                <Select
                  value={(editedTask as any).actionConfig?.emailRecipient ?? 'lead'}
                  onValueChange={(v) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, emailRecipient: v } } as WorkflowTask);
                  }}
                >
                  <SelectTrigger className="bg-white border-blue-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead / Contact (from workflow)</SelectItem>
                    <SelectItem value="assigned_agent">Assigned Agent</SelectItem>
                    <SelectItem value="owner">Account Owner</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={`team:${m.id}`}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Subject</Label>
                <Input
                  ref={emailSubjectRef}
                  value={(editedTask as any).actionConfig?.emailSubject ?? ''}
                  onChange={(e) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, emailSubject: e.target.value || undefined } } as WorkflowTask);
                  }}
                  placeholder="Email subject"
                  className="bg-white border-blue-200"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Body</Label>
                <Textarea
                  ref={emailBodyRef}
                  value={(editedTask as any).actionConfig?.emailBody ?? ''}
                  onChange={(e) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, emailBody: e.target.value || undefined } } as WorkflowTask);
                  }}
                  placeholder="Email body"
                  rows={5}
                  className="bg-white border-blue-200"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Generate CMA - config for CMA component */}
        {selectedActions.includes('cma_generation') && (
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200">
            <Label className="text-sm font-semibold text-gray-900">Generate CMA</Label>
            <p className="text-xs text-gray-600 mb-2">CMA-comparable info will be sent to the Real Estate Command Center.</p>
            <Textarea
              value={(editedTask as any).actionConfig?.cmaInstructions ?? ''}
              onChange={(e) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, cmaInstructions: e.target.value || undefined } } as WorkflowTask);
              }}
              placeholder="Additional instructions for CMA generation..."
              rows={3}
              className="bg-white border-emerald-200"
            />
          </Card>
        )}

        {/* Market Research - config */}
        {selectedActions.includes('market_research') && (
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200">
            <Label className="text-sm font-semibold text-gray-900">Market Research</Label>
            <p className="text-xs text-gray-600 mb-2">Buyer/seller market report settings.</p>
            <Select
              value={(editedTask as any).actionConfig?.marketResearchType ?? 'buyer'}
              onValueChange={(v) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, marketResearchType: v } } as WorkflowTask);
              }}
            >
              <SelectTrigger className="bg-white border-amber-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer Market Report</SelectItem>
                <SelectItem value="seller">Seller Market Report</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        )}

        {/* Generate Presentation - config */}
        {selectedActions.includes('presentation_generation') && (
          <Card className="p-4 bg-gradient-to-br from-violet-50 to-white border-2 border-violet-200">
            <Label className="text-sm font-semibold text-gray-900">Generate Presentation</Label>
            <p className="text-xs text-gray-600 mb-2">Property presentation settings.</p>
            <Textarea
              value={(editedTask as any).actionConfig?.presentationInstructions ?? ''}
              onChange={(e) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, presentationInstructions: e.target.value || undefined } } as WorkflowTask);
              }}
              placeholder="What to include in the presentation..."
              rows={3}
              className="bg-white border-violet-200"
            />
          </Card>
        )}

        {/* Generate Document - config */}
        {selectedActions.includes('document') && (
          <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200">
            <Label className="text-sm font-semibold text-gray-900">Generate Document</Label>
            <p className="text-xs text-gray-600 mb-2">Document type and style.</p>
            <div className="space-y-2">
              <Select
                value={(editedTask as any).actionConfig?.documentType ?? 'proposal'}
                onValueChange={(v) => {
                  const ac = (editedTask as any).actionConfig || {};
                  setEditedTask({ ...editedTask, actionConfig: { ...ac, documentType: v } } as WorkflowTask);
                }}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={(editedTask as any).actionConfig?.documentInstructions ?? ''}
                onChange={(e) => {
                  const ac = (editedTask as any).actionConfig || {};
                  setEditedTask({ ...editedTask, actionConfig: { ...ac, documentInstructions: e.target.value || undefined } } as WorkflowTask);
                }}
                placeholder="Instructions, style, what to include..."
                rows={3}
                className="bg-white border-slate-200"
              />
            </div>
          </Card>
        )}

        {/* Calendar - when Calendar action is selected */}
        {selectedActions.includes('calendar') && (
          <Card className="p-4 bg-gradient-to-br from-violet-50 to-white border-2 border-violet-200">
            <Label className="text-sm font-semibold text-gray-900">Calendar</Label>
            <CalendarConfigSection
              actionConfig={(editedTask as any).actionConfig || {}}
              onConfigChange={(updates) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, ...updates } } as WorkflowTask);
              }}
            />
          </Card>
        )}

        {/* Request Review config */}
        {selectedActions.includes('request_review') && (
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200">
            <Label className="text-sm font-semibold text-gray-900">Request Review</Label>
            <p className="text-xs text-gray-600 mb-2">Send a review request to a satisfied client.</p>
            <div className="space-y-2">
              <Select
                value={(editedTask as any).actionConfig?.reviewRequestMethod ?? 'SMS'}
                onValueChange={(v) => {
                  const ac = (editedTask as any).actionConfig || {};
                  setEditedTask({ ...editedTask, actionConfig: { ...ac, reviewRequestMethod: v } } as WorkflowTask);
                }}
              >
                <SelectTrigger className="bg-white border-yellow-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="BOTH">Both SMS &amp; Email</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={(editedTask as any).actionConfig?.reviewUrl ?? ''}
                onChange={(e) => {
                  const ac = (editedTask as any).actionConfig || {};
                  setEditedTask({ ...editedTask, actionConfig: { ...ac, reviewUrl: e.target.value || undefined } } as WorkflowTask);
                }}
                placeholder="https://g.page/your-business/review"
                className="bg-white border-yellow-200"
              />
            </div>
          </Card>
        )}

        {/* AI Review Response config */}
        {selectedActions.includes('respond_to_review') && (
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
            <Label className="text-sm font-semibold text-gray-900">AI Review Response</Label>
            <p className="text-xs text-gray-600 mb-2">Auto-generate a response when a review comes in.</p>
            <Select
              value={(editedTask as any).actionConfig?.responseTone ?? 'professional'}
              onValueChange={(v) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, responseTone: v } } as WorkflowTask);
              }}
            >
              <SelectTrigger className="bg-white border-blue-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="empathetic">Empathetic</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        )}

        {/* HITL - Who when human-in-the-loop */}
        {editedTask.isHITL && (
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200">
            <Label className="text-sm font-semibold text-gray-900">Assign to Human</Label>
            <p className="text-xs text-gray-600 mb-2">Who should review this task?</p>
            <Select
              value={(editedTask as any).actionConfig?.hitlAssignee ?? 'unassigned'}
              onValueChange={(v) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, hitlAssignee: v === 'unassigned' ? undefined : v } } as WorkflowTask);
              }}
            >
              <SelectTrigger className="bg-white border-amber-200">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned (Owner)</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamMembers.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                No team members found. The task will default to you. Add team members in <a href="/dashboard/team" className="underline font-medium">Team Management</a>.
              </p>
            )}

            {/* Escalation: AI reminder if human doesn't complete by deadline */}
            <div className="mt-4 pt-3 border-t border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-orange-500" />
                <Label className="text-sm font-semibold text-gray-900">Escalation Reminder</Label>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                If the assignee doesn&apos;t complete by the deadline, an AI employee will remind them.
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">Deadline</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={(editedTask as any).actionConfig?.hitlDeadlineAmount ?? ''}
                      onChange={(e) => {
                        const ac = (editedTask as any).actionConfig || {};
                        setEditedTask({ ...editedTask, actionConfig: { ...ac, hitlDeadlineAmount: parseInt(e.target.value) || undefined } } as WorkflowTask);
                      }}
                      placeholder="e.g. 24"
                      className="flex-1 bg-white border-amber-200"
                    />
                    <Select
                      value={(editedTask as any).actionConfig?.hitlDeadlineUnit ?? 'HOURS'}
                      onValueChange={(v) => {
                        const ac = (editedTask as any).actionConfig || {};
                        setEditedTask({ ...editedTask, actionConfig: { ...ac, hitlDeadlineUnit: v } } as WorkflowTask);
                      }}
                    >
                      <SelectTrigger className="w-28 bg-white border-amber-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MINUTES">Minutes</SelectItem>
                        <SelectItem value="HOURS">Hours</SelectItem>
                        <SelectItem value="DAYS">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">AI Employee to Remind</Label>
                  <Select
                    value={(() => {
                      const v = (editedTask as any).actionConfig?.hitlEscalationAgent;
                      if (!v || v === 'none') return 'none';
                      if (v.startsWith('ai_team:')) return v;
                      if (aiEmployees.some((e) => e.id === v)) return `ai_team:${v}`;
                      return v;
                    })()}
                    onValueChange={(v) => {
                      const ac = (editedTask as any).actionConfig || {};
                      setEditedTask({ ...editedTask, actionConfig: { ...ac, hitlEscalationAgent: v === 'none' ? undefined : v } } as WorkflowTask);
                    }}
                  >
                    <SelectTrigger className="bg-white border-amber-200">
                      <SelectValue placeholder="Select AI employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (no reminder)</SelectItem>
                      {RE_AGENTS.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                            {agent.name} ({agent.role})
                          </span>
                        </SelectItem>
                      ))}
                      {aiEmployees.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                            My AI Team
                          </div>
                          {aiEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={`ai_team:${emp.id}`}>
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                {emp.customName || emp.profession}
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {(editedTask as any).actionConfig?.hitlEscalationAgent && (
                  <div>
                    <Label className="text-xs text-gray-600">Remind Via</Label>
                    <Select
                      value={(editedTask as any).actionConfig?.hitlEscalationMethod ?? 'sms'}
                      onValueChange={(v) => {
                        const ac = (editedTask as any).actionConfig || {};
                        setEditedTask({ ...editedTask, actionConfig: { ...ac, hitlEscalationMethod: v } } as WorkflowTask);
                      }}
                    >
                      <SelectTrigger className="bg-white border-amber-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="call">Voice Call</SelectItem>
                        <SelectItem value="both">Both (SMS + Call)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
        
        {/* HITL Gate Toggle */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">HITL Gate</p>
                <p className="text-xs text-gray-600">Require human approval</p>
              </div>
            </div>
            <Switch
              checked={editedTask.isHITL}
              onCheckedChange={(checked) => setEditedTask({ ...editedTask, isHITL: checked })}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </Card>

        {/* Request Review config */}
        {selectedActions.includes('request_review') && (
          <Card className="p-4 border-yellow-200 bg-yellow-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⭐</span>
              <Label className="text-sm font-semibold">Request Review</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Send a review request to the client after a successful closing or showing.
            </p>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Send Via</Label>
                <Select
                  value={(editedTask as any).actionConfig?.reviewRequestMethod ?? 'SMS'}
                  onValueChange={(v) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, reviewRequestMethod: v } } as WorkflowTask);
                  }}
                >
                  <SelectTrigger className="bg-white border-yellow-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="BOTH">Both SMS &amp; Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Review Link</Label>
                <Input
                  value={(editedTask as any).actionConfig?.reviewUrl ?? ''}
                  onChange={(e) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, reviewUrl: e.target.value || undefined } } as WorkflowTask);
                  }}
                  placeholder="https://g.page/your-business/review"
                  className="bg-white border-yellow-200"
                />
              </div>
            </div>
          </Card>
        )}

        {/* AI Review Response config */}
        {selectedActions.includes('respond_to_review') && (
          <Card className="p-4 border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <Label className="text-sm font-semibold">AI Review Response</Label>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Response Tone</Label>
                <Select
                  value={(editedTask as any).actionConfig?.responseTone ?? 'professional'}
                  onValueChange={(v) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, responseTone: v } } as WorkflowTask);
                  }}
                >
                  <SelectTrigger className="bg-white border-blue-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Delay Configuration */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Delay Before Task
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={editedTask.delayMinutes}
              onChange={(e) => setEditedTask({ ...editedTask, delayMinutes: parseInt(e.target.value) || 0 })}
              className="bg-white border-purple-200 text-gray-900 focus:border-purple-500"
              placeholder="0"
            />
            <Select
              value={editedTask.delayUnit || 'MINUTES'}
              onValueChange={(value) => setEditedTask({ ...editedTask, delayUnit: value as 'MINUTES' | 'HOURS' | 'DAYS' })}
            >
              <SelectTrigger className="w-32 bg-white border-purple-200 text-gray-900 focus:border-purple-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-purple-200">
                {DELAY_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit} className="text-gray-900 hover:bg-purple-50">
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Conditional Branching */}
        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-2 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-bold text-gray-900">Conditional Branching</p>
                <p className="text-xs text-gray-600">Run only if condition is met</p>
              </div>
            </div>
            <Switch
              checked={showBranching}
              onCheckedChange={(checked) => {
                setShowBranching(checked);
                if (!checked) {
                  setEditedTask({ ...editedTask, parentTaskId: undefined, branchCondition: undefined });
                }
              }}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
          
          {showBranching && (
            <div className="space-y-3 mt-3 pt-3 border-t border-green-200">
              {/* Parent Task Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Branch From Task</Label>
                <Select
                  value={editedTask.parentTaskId || '__none__'}
                  onValueChange={(value) => handleParentTaskChange(value === '__none__' ? null : value)}
                >
                  <SelectTrigger className="bg-white border-green-200 text-gray-900 text-sm">
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-green-200">
                    <SelectItem value="__none__" className="text-gray-500">None</SelectItem>
                    {workflowTasks
                      .filter(t => t.id !== editedTask.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-gray-900 hover:bg-green-50">
                          {t.displayOrder}. {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Branch Condition */}
              {editedTask.parentTaskId && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Condition Field</Label>
                    <Select
                      value={editedTask.branchCondition?.field || 'feedback'}
                      onValueChange={(value) => handleBranchConditionChange('field', value)}
                    >
                      <SelectTrigger className="bg-white border-green-200 text-gray-900 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        {BRANCH_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value} className="text-gray-900 hover:bg-green-50">
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editedTask.branchCondition?.field === 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">Custom Field Name</Label>
                      <Input
                        value={editedTask.branchCondition?.customFieldName || ''}
                        onChange={(e) => handleBranchConditionChange('customFieldName', e.target.value)}
                        className="bg-white border-green-200 text-gray-900 text-sm focus:border-green-500"
                        placeholder="e.g., lead_score, property_type, budget_range"
                      />
                      <p className="text-xs text-gray-500">Enter the name of the field you want to evaluate</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Operator</Label>
                    <Select
                      value={editedTask.branchCondition?.operator || 'equals'}
                      onValueChange={(value) => handleBranchConditionChange('operator', value)}
                    >
                      <SelectTrigger className="bg-white border-green-200 text-gray-900 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        {BRANCH_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value} className="text-gray-900 hover:bg-green-50">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {editedTask.branchCondition?.operator !== 'is_empty' && 
                   editedTask.branchCondition?.operator !== 'is_not_empty' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">Expected Value</Label>
                      <Input
                        value={editedTask.branchCondition?.value || ''}
                        onChange={(e) => handleBranchConditionChange('value', e.target.value)}
                        className="bg-white border-green-200 text-gray-900 text-sm focus:border-green-500"
                        placeholder="e.g., accepted, liked, approved"
                      />
                    </div>
                  )}

                  {/* Branch Action - what to do when condition is met */}
                  <div className="space-y-2 pt-2 mt-2 border-t border-green-200">
                    <Label className="text-xs text-gray-600 font-semibold">Then Do (Branch Action)</Label>
                    <p className="text-xs text-gray-500">What action to perform when this condition is met</p>
                    <Select
                      value={editedTask.branchCondition?.branchAction || '__none__'}
                      onValueChange={(value) => handleBranchConditionChange('branchAction', value === '__none__' ? undefined : value)}
                    >
                      <SelectTrigger className="bg-white border-green-200 text-gray-900 text-sm">
                        <SelectValue placeholder="Select an action" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-green-200">
                        <SelectItem value="__none__" className="text-gray-500">No specific action</SelectItem>
                        {BRANCH_ACTIONS.map((action) => (
                          <SelectItem key={action.value} value={action.value} className="text-gray-900 hover:bg-green-50">
                            <span className="flex items-center gap-2">
                              <span>{action.icon}</span>
                              <span>{action.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {parentTask && (
                    <div className="mt-3 p-2 bg-green-100 rounded text-xs text-gray-700">
                      <strong>Branching from:</strong> {parentTask.name}
                      <br />
                      <strong>If:</strong>{' '}
                      {editedTask.branchCondition?.field === 'custom'
                        ? (editedTask.branchCondition?.customFieldName || 'custom field')
                        : editedTask.branchCondition?.field}{' '}
                      {editedTask.branchCondition?.operator}{' '}
                      {editedTask.branchCondition?.operator !== 'is_empty' && editedTask.branchCondition?.operator !== 'is_not_empty'
                        ? `"${editedTask.branchCondition?.value}"`
                        : ''}
                      {editedTask.branchCondition?.branchAction && (
                        <>
                          <br />
                          <strong>Then:</strong>{' '}
                          {BRANCH_ACTIONS.find(a => a.value === editedTask.branchCondition?.branchAction)?.icon}{' '}
                          {BRANCH_ACTIONS.find(a => a.value === editedTask.branchCondition?.branchAction)?.label}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
        
        {/* Display Order */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-semibold">Execution Order</Label>
          <Input
            type="number"
            min="1"
            value={editedTask.displayOrder}
            onChange={(e) => setEditedTask({ ...editedTask, displayOrder: parseInt(e.target.value) || 1 })}
            className="bg-white border-purple-200 text-gray-900 focus:border-purple-500"
          />
        </div>
        
        {/* Action Configuration */}
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-bold text-gray-900">Task Actions</p>
              <p className="text-xs text-gray-600">Select what this task will execute</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {AVAILABLE_ACTIONS.map((action) => (
              <div
                key={action.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedActions.includes(action.value)
                    ? 'bg-purple-100 border-purple-400 shadow-sm'
                    : 'bg-white border-purple-200 hover:border-purple-300'
                }`}
                onClick={() => handleActionToggle(action.value)}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedActions.includes(action.value)
                    ? 'bg-purple-600 border-purple-600'
                    : 'border-gray-300'
                }`}>
                  {selectedActions.includes(action.value) && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{action.icon}</span>
                    <span className="font-medium text-gray-900 text-sm">{action.label}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {selectedActions.length === 0 && (
            <p className="text-xs text-amber-600 mt-2 italic">
              ⚠️ No actions selected. This task won't execute anything.
            </p>
          )}
        </Card>
        
        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t-2 border-purple-200">
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(editedTask.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          {hasUnsavedChanges && (
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
              disabled={isSaving}
              onClick={async () => {
                const taskToSave = {
                  ...editedTask,
                  actionConfig: {
                    ...((editedTask as any).actionConfig || {}),
                    actions: selectedActions,
                  },
                };
                setIsSaving(true);
                try {
                  const success = await Promise.resolve(onSave(taskToSave as WorkflowTask));
                  if (success !== false) {
                    lastSavedRef.current = JSON.stringify(taskToSave);
                  }
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showCloseConfirm} onOpenChange={(open) => !open && setShowCloseConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this task. Would you like to save before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => { setShowCloseConfirm(false); onClose(); }}>
              Don&apos;t Save
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveAndClose}>
              Save &amp; Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
