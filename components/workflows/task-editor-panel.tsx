/**
 * Generic Task Editor Panel
 * Industry-aware task configuration panel
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkflowTask } from './types';
import { getIndustryConfig, IndustryAIAgent } from '@/lib/workflows/industry-configs';
import { Industry } from '@prisma/client';
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
import { X, Trash2, Save, Shield, Clock, GitBranch, BarChart3, ChevronDown, ChevronUp, Beaker, Globe, MessageSquare } from 'lucide-react';
import { VOICE_LANGUAGES } from '@/lib/voice-languages';
import { Badge } from '@/components/ui/badge';
import { PROFESSIONAL_EMPLOYEE_CONFIGS, PROFESSIONAL_EMPLOYEE_TYPES } from '@/lib/professional-ai-employees/config';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarConfigSection } from './calendar-config-section';

interface TaskEditorPanelProps {
  task: WorkflowTask | null;
  industry: Industry;
  workflowTasks: WorkflowTask[];
  executionMode?: 'WORKFLOW' | 'CAMPAIGN' | 'DRIP';
  onClose: () => void;
  onSave: (task: WorkflowTask) => void;
  onDelete: (taskId: string) => void;
}

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

const AVAILABLE_ACTIONS = [
  { value: 'voice_call', label: 'Voice Call', icon: '📞', description: 'Make AI voice call via Soshogle AI' },
  { value: 'sms', label: 'SMS', icon: '💬', description: 'Send SMS message via Soshogle AI' },
  { value: 'email', label: 'Email', icon: '📧', description: 'Send email via Soshogle AI' },
  { value: 'task', label: 'Create Task', icon: '✅', description: 'Create a task in CRM' },
  { value: 'calendar', label: 'Calendar Event', icon: '📅', description: 'Create calendar appointment' },
  { value: 'document', label: 'Generate Document', icon: '📄', description: 'Generate document with style options' },
  { value: 'lead_research', label: 'Lead Research', icon: '🔍', description: 'Research lead/customer information' },
  // Website actions (for workflows triggered by or targeting website)
  { value: 'create_lead_from_website', label: 'Create Lead from Form', icon: '🌐', description: 'Create lead from website form submission' },
  { value: 'add_website_form', label: 'Add Lead Form to Website', icon: '📝', description: 'Add lead capture form to website' },
  { value: 'add_website_cta', label: 'Add CTA to Website', icon: '🔘', description: 'Add call-to-action button to website' },
  { value: 'add_website_booking', label: 'Add Booking Widget', icon: '📅', description: 'Add booking widget to website' },
  { value: 'add_website_payment', label: 'Add Payment Section', icon: '💳', description: 'Add payment section to website via Soshogle AI' },
  { value: 'update_website_content', label: 'Update Website Content', icon: '✏️', description: 'Update website structure or content' },
  { value: 'publish_website', label: 'Publish Website', icon: '🚀', description: 'Publish website changes' },
  { value: 'notify_website_event', label: 'Notify on Website Event', icon: '🔔', description: 'Notify when visitor submits form or books' },
];

export function TaskEditorPanel({
  task,
  industry,
  workflowTasks,
  executionMode = 'WORKFLOW',
  onClose,
  onSave,
  onDelete,
}: TaskEditorPanelProps) {
  const [editedTask, setEditedTask] = useState<WorkflowTask | null>(task);
  const [showBranching, setShowBranching] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [showCampaignOptions, setShowCampaignOptions] = useState(false);
  const [showEnhancedTiming, setShowEnhancedTiming] = useState(false);
  const [skipConditions, setSkipConditions] = useState<any[]>([]);
  const [aiEmployees, setAiEmployees] = useState<AIEmployee[]>([]);
  const lastSavedRef = useRef<string>('');

  const industryConfig = getIndustryConfig(industry);

  // Build effective task for comparison (includes selectedActions, skipConditions)
  const buildEffectiveTask = useCallback(() => {
    if (!editedTask) return null;
    const ac = (editedTask as any).actionConfig || {};
    return {
      ...editedTask,
      actionConfig: { ...ac, actions: selectedActions },
      skipConditions: skipConditions.length > 0 ? skipConditions : null,
    };
  }, [editedTask, selectedActions, skipConditions]);

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

  // Fetch user's AI Team
  useEffect(() => {
    fetch('/api/ai-employees/user')
      .then((res) => res.ok ? res.json() : { employees: [] })
      .then((data) => setAiEmployees(data.employees || []))
      .catch(() => setAiEmployees([]));
  }, []);
  
  useEffect(() => {
    setEditedTask(task);
    setShowBranching(task?.parentTaskId !== null && task?.parentTaskId !== undefined);

    if (task) {
      const actionConfig = (task as any).actionConfig || {};
      setSelectedActions(actionConfig.actions || []);

      const taskAny = task as any;
      if (taskAny.skipConditions && Array.isArray(taskAny.skipConditions)) {
        setSkipConditions(taskAny.skipConditions);
      } else {
        setSkipConditions([]);
      }

      if (executionMode === 'DRIP' || taskAny.delayDays || taskAny.delayHours || taskAny.preferredSendTime) {
        setShowEnhancedTiming(true);
      }

      // Initialize lastSaved for change detection
      const effective = {
        ...task,
        actionConfig: { ...actionConfig, actions: actionConfig.actions || [] },
        skipConditions: taskAny.skipConditions && Array.isArray(taskAny.skipConditions) ? taskAny.skipConditions : null,
      };
      lastSavedRef.current = JSON.stringify(effective);
    }
  }, [task, executionMode]);
  
  if (!editedTask || !industryConfig) return null;
  
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
    const currentActionConfig = (editedTask as any).actionConfig || {};
    if (value === 'unassigned') {
      setEditedTask({
        ...editedTask,
        assignedAgentId: null,
        assignedAgentName: null,
        agentColor: '#6B7280',
        assignedAIEmployeeId: null,
        actionConfig: { ...currentActionConfig, assignedProfessionalType: undefined, jurisdiction: undefined },
      } as WorkflowTask);
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
        actionConfig: { ...currentActionConfig, assignedProfessionalType: undefined, jurisdiction: undefined },
      } as WorkflowTask);
      return;
    }
    if (value.startsWith('professional:')) {
      const profType = value.slice(13);
      const config = PROFESSIONAL_EMPLOYEE_CONFIGS[profType as keyof typeof PROFESSIONAL_EMPLOYEE_CONFIGS];
      setEditedTask({
        ...editedTask,
        assignedAgentId: null,
        assignedAgentName: config?.name || profType,
        agentColor: '#0ea5e9',
        assignedAIEmployeeId: null,
        actionConfig: { ...currentActionConfig, assignedProfessionalType: profType },
      } as WorkflowTask);
      return;
    }
    const agent = industryConfig.aiAgents.find((a) => a.id === value);
    setEditedTask({
      ...editedTask,
      assignedAgentId: value,
      assignedAgentName: agent?.name || null,
      agentColor: agent?.color || '#8b5cf6',
      assignedAIEmployeeId: null,
      actionConfig: { ...currentActionConfig, assignedProfessionalType: undefined, jurisdiction: undefined },
    } as WorkflowTask);
  };

  const actionConfig = (editedTask as any).actionConfig || {};
  const assignedProfessionalType = actionConfig.assignedProfessionalType;
  const agentSelectValue =
    editedTask.assignedAIEmployeeId
      ? `ai_team:${editedTask.assignedAIEmployeeId}`
      : assignedProfessionalType
        ? `professional:${assignedProfessionalType}`
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
      branchCondition: parentTaskId ? (editedTask.branchCondition || { field: 'status', operator: 'equals', value: '' }) : undefined,
    });
    setShowBranching(!!parentTaskId);
  };
  
  const parentTask = editedTask.parentTaskId 
    ? workflowTasks.find(t => t.id === editedTask.parentTaskId)
    : null;
  
  return (
    <div className="w-96 bg-white border-l-2 border-purple-200 h-full overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-white border-b-2 border-purple-200 p-4 flex items-center justify-between z-10">
        <h3 className="text-lg font-bold text-gray-900">Edit Task</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-purple-100">
          <X className="w-4 h-4 text-gray-600" />
        </Button>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-name">Task Name</Label>
            <Input
              id="task-name"
              value={editedTask.name}
              onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
              className="mt-1 border-purple-200"
            />
          </div>
          
          <div>
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={editedTask.description}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              className="mt-1 border-purple-200"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="task-type">Task Type</Label>
            <Select
              value={editedTask.taskType}
              onValueChange={(value) => setEditedTask({ ...editedTask, taskType: value })}
            >
              <SelectTrigger id="task-type" className="mt-1 border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                {industryConfig.taskTypes.map((taskType) => (
                  <SelectItem key={taskType.value} value={taskType.value}>
                    <div className="flex items-center gap-2">
                      <span>{taskType.icon}</span>
                      <span>{taskType.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* AI Agent Assignment */}
        <div className="space-y-2">
          <Label>Assign AI Agent</Label>
          <Select value={agentSelectValue} onValueChange={handleAgentChange}>
            <SelectTrigger className="border-purple-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {industryConfig.aiAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span>{agent.name}</span>
                    <span className="text-xs text-gray-500">- {agent.role}</span>
                  </div>
                </SelectItem>
              ))}
              {aiEmployees.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                    My AI Team
                  </div>
                  {aiEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={`ai_team:${emp.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span>{emp.customName || emp.profession}</span>
                        <span className="text-xs text-gray-500">- {emp.profession}</span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t mt-1 pt-2">
                Professional AI Experts
              </div>
              {PROFESSIONAL_EMPLOYEE_TYPES.map((type) => {
                const config = PROFESSIONAL_EMPLOYEE_CONFIGS[type];
                return (
                  <SelectItem key={type} value={`professional:${type}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-500" />
                      <span>{config.name}</span>
                      <span className="text-xs text-gray-500">- {config.title}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Call Language - when voice call is selected and agent assigned */}
        {selectedActions.includes('voice_call') && (editedTask.assignedAIEmployeeId || editedTask.assignedAgentId || assignedProfessionalType) && (
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
        )}

        {/* SMS Message - when SMS action is selected */}
        {selectedActions.includes('sms') && (
          <Card className="p-4 border-cyan-200 bg-cyan-50/50">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-cyan-600" />
              <Label className="text-sm font-semibold">SMS Message</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              What message to send. Use {'{{firstName}}'}, {'{{lastName}}'} for personalization.
            </p>
            <Textarea
              value={(editedTask as any).actionConfig?.smsMessage ?? ''}
              onChange={(e) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, smsMessage: e.target.value || undefined } } as WorkflowTask);
              }}
              placeholder="e.g. Hi {{firstName}}, just following up on your inquiry..."
              rows={4}
              className="bg-white border-cyan-200"
            />
          </Card>
        )}

        {/* Email Content - when Email action is selected */}
        {selectedActions.includes('email') && (
          <Card className="p-4 border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📧</span>
              <Label className="text-sm font-semibold">Email Content</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Subject and body for the email. Use {'{{firstName}}'} for personalization.
            </p>
            <div className="space-y-2">
              <Input
                value={(editedTask as any).actionConfig?.emailSubject ?? ''}
                onChange={(e) => {
                  const ac = (editedTask as any).actionConfig || {};
                  setEditedTask({ ...editedTask, actionConfig: { ...ac, emailSubject: e.target.value || undefined } } as WorkflowTask);
                }}
                placeholder="Email subject"
                className="bg-white border-blue-200"
              />
              <Textarea
                value={(editedTask as any).actionConfig?.emailBody ?? ''}
                onChange={(e) => {
                  const ac = (editedTask as any).actionConfig || {};
                  setEditedTask({ ...editedTask, actionConfig: { ...ac, emailBody: e.target.value || undefined } } as WorkflowTask);
                }}
                placeholder="Email body (plain text or HTML)"
                rows={6}
                className="bg-white border-blue-200"
              />
            </div>
          </Card>
        )}

        {/* CRM Task - when Create Task action is selected */}
        {selectedActions.includes('task') && (
          <Card className="p-4 border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <Label className="text-sm font-semibold">CRM Task Details</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              What task to create and who it&apos;s assigned to.
            </p>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Task Type</Label>
                <Select
                  value={(editedTask as any).actionConfig?.crmTaskType ?? 'follow_up'}
                  onValueChange={(v) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, crmTaskType: v } } as WorkflowTask);
                  }}
                >
                  <SelectTrigger className="bg-white border-green-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Assigned To</Label>
                <Select
                  value={(editedTask as any).actionConfig?.crmTaskAssignee ?? 'unassigned'}
                  onValueChange={(v) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, crmTaskAssignee: v === 'unassigned' ? undefined : v } } as WorkflowTask);
                  }}
                >
                  <SelectTrigger className="bg-white border-green-200">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {aiEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.customName || emp.profession}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* HITL - Who (assignee) when human-in-the-loop */}
        {editedTask.isHITL && (
          <Card className="p-4 border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👤</span>
              <Label className="text-sm font-semibold">Assign to Human</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Who should this task be assigned to for human review?
            </p>
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
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {aiEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.customName || emp.profession}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        )}

        {/* Calendar - when Calendar action is selected */}
        {selectedActions.includes('calendar') && (
          <Card className="p-4 border-violet-200 bg-violet-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📅</span>
              <Label className="text-sm font-semibold">Calendar</Label>
            </div>
            <CalendarConfigSection
              actionConfig={(editedTask as any).actionConfig || {}}
              onConfigChange={(updates) => {
                const ac = (editedTask as any).actionConfig || {};
                setEditedTask({ ...editedTask, actionConfig: { ...ac, ...updates } } as WorkflowTask);
              }}
            />
          </Card>
        )}

        {/* Generate Document - when document action exists */}
        {selectedActions.includes('document') && (
          <Card className="p-4 border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📄</span>
              <Label className="text-sm font-semibold">Generate Document</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Document type and content to generate.
            </p>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Document Type</Label>
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
              </div>
              <div>
                <Label className="text-xs">Instructions / Style</Label>
                <Textarea
                  value={(editedTask as any).actionConfig?.documentInstructions ?? ''}
                  onChange={(e) => {
                    const ac = (editedTask as any).actionConfig || {};
                    setEditedTask({ ...editedTask, actionConfig: { ...ac, documentInstructions: e.target.value || undefined } } as WorkflowTask);
                  }}
                  placeholder="What to include, tone, style..."
                  rows={3}
                  className="bg-white border-slate-200"
                />
              </div>
            </div>
          </Card>
        )}
        
        {/* Delay Settings */}
        <Card className="p-4 border-purple-200 bg-purple-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-semibold">Delay Before Task</Label>
            </div>
            {executionMode === 'DRIP' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEnhancedTiming(!showEnhancedTiming)}
                className="text-xs text-purple-600 hover:text-purple-700"
              >
                {showEnhancedTiming ? 'Simple' : 'Advanced'}
              </Button>
            )}
          </div>
          
          {!showEnhancedTiming ? (
            // Simple delay (backward compatible)
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={editedTask.delayMinutes || 0}
                onChange={(e) => setEditedTask({ ...editedTask, delayMinutes: parseInt(e.target.value) || 0 })}
                className="flex-1 border-purple-200"
                placeholder="Delay amount"
              />
              <Select
                value={editedTask.delayUnit || 'MINUTES'}
                onValueChange={(value: 'MINUTES' | 'HOURS' | 'DAYS') => setEditedTask({ ...editedTask, delayUnit: value })}
              >
                <SelectTrigger className="w-32 border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELAY_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            // Enhanced timing (Phase 2 - DRIP mode)
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(editedTask as any).delayDays || 0}
                    onChange={(e) => setEditedTask({ 
                      ...editedTask, 
                      ...(editedTask as any),
                      delayDays: parseInt(e.target.value) || 0 
                    })}
                    className="border-purple-200"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={(editedTask as any).delayHours || 0}
                    onChange={(e) => setEditedTask({ 
                      ...editedTask, 
                      ...(editedTask as any),
                      delayHours: parseInt(e.target.value) || 0 
                    })}
                    className="border-purple-200"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Preferred Send Time (24h format)</Label>
                <Input
                  type="time"
                  value={(editedTask as any).preferredSendTime || ''}
                  onChange={(e) => setEditedTask({ 
                    ...editedTask, 
                    ...(editedTask as any),
                    preferredSendTime: e.target.value || null
                  })}
                  className="border-purple-200"
                  placeholder="09:00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Task will be scheduled for this time (e.g., 09:00 for 9 AM)
                </p>
              </div>
            </div>
          )}
        </Card>
        
        {/* A/B Test Variant Options - Only show in DRIP mode with A/B testing enabled */}
        {executionMode === 'DRIP' && (editedTask as any).isAbTestVariant !== undefined && (
          <Card className="p-4 border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Beaker className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-semibold">A/B Test Variant</Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-ab-variant"
                  checked={(editedTask as any).isAbTestVariant || false}
                  onChange={(e) => {
                    setEditedTask({
                      ...editedTask,
                      ...(editedTask as any),
                      isAbTestVariant: e.target.checked,
                      abTestGroup: e.target.checked ? ((editedTask as any).abTestGroup || 'A') : null,
                      variantOf: e.target.checked ? ((editedTask as any).variantOf || null) : null,
                    });
                  }}
                  className="rounded"
                />
                <Label htmlFor="is-ab-variant" className="text-sm cursor-pointer">
                  This is an A/B test variant
                </Label>
              </div>
              {(editedTask as any).isAbTestVariant && (
                <div className="space-y-2 pl-6">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Test Group</Label>
                    <Select
                      value={(editedTask as any).abTestGroup || 'A'}
                      onValueChange={(value) => {
                        setEditedTask({
                          ...editedTask,
                          ...(editedTask as any),
                          abTestGroup: value,
                        });
                      }}
                    >
                      <SelectTrigger className="w-32 border-purple-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Group A</SelectItem>
                        <SelectItem value="B">Group B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which test group this variant belongs to
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Skip Conditions - Only show in DRIP mode */}
        {executionMode === 'DRIP' && (
          <Card className="p-4 border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-semibold">Skip Conditions</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Skip this task if any of these conditions are met
            </p>
            {skipConditions.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed border-purple-200 rounded-lg">
                No skip conditions configured
              </div>
            ) : (
              <div className="space-y-2">
                {skipConditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-purple-200">
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{condition.field}</span>
                      {' '}
                      <span className="text-muted-foreground">{condition.operator}</span>
                      {' '}
                      <span className="font-medium">{condition.value}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newConditions = skipConditions.filter((_, i) => i !== index);
                        setSkipConditions(newConditions);
                        setEditedTask({
                          ...editedTask,
                          ...(editedTask as any),
                          skipConditions: newConditions.length > 0 ? newConditions : null,
                        });
                      }}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
                setEditedTask({
                  ...editedTask,
                  ...(editedTask as any),
                  skipConditions: newConditions,
                });
              }}
              className="w-full mt-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              + Add Skip Condition
            </Button>
          </Card>
        )}
        
        {/* Campaign Options - Only show in Campaign Mode */}
        {executionMode === 'CAMPAIGN' && (
          <Collapsible open={showCampaignOptions} onOpenChange={setShowCampaignOptions}>
            <Card className="p-4 border-purple-200 bg-blue-50/50">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <Label className="text-sm font-semibold">Campaign Tracking Options</Label>
                </div>
                {showCampaignOptions ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {(editedTask.taskType === 'SEND_EMAIL' || editedTask.actionType === 'SEND_EMAIL') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="track-opens"
                        checked={(editedTask as any).trackOpens !== false}
                        onChange={(e) => {
                          setEditedTask({
                            ...editedTask,
                            ...(editedTask as any),
                            trackOpens: e.target.checked,
                          });
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="track-opens" className="text-sm cursor-pointer">
                        Track Email Opens
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="track-clicks"
                        checked={(editedTask as any).trackClicks !== false}
                        onChange={(e) => {
                          setEditedTask({
                            ...editedTask,
                            ...(editedTask as any),
                            trackClicks: e.target.checked,
                          });
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="track-clicks" className="text-sm cursor-pointer">
                        Track Email Clicks
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="track-replies"
                        checked={(editedTask as any).trackReplies !== false}
                        onChange={(e) => {
                          setEditedTask({
                            ...editedTask,
                            ...(editedTask as any),
                            trackReplies: e.target.checked,
                          });
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="track-replies" className="text-sm cursor-pointer">
                        Track Email Replies
                      </Label>
                    </div>
                  </div>
                )}
                {(editedTask.taskType === 'SEND_SMS' || editedTask.actionType === 'SEND_SMS') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="track-delivery"
                        checked={(editedTask as any).trackDelivery !== false}
                        onChange={(e) => {
                          setEditedTask({
                            ...editedTask,
                            ...(editedTask as any),
                            trackDelivery: e.target.checked,
                          });
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="track-delivery" className="text-sm cursor-pointer">
                        Track SMS Delivery
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="track-sms-replies"
                        checked={(editedTask as any).trackReplies !== false}
                        onChange={(e) => {
                          setEditedTask({
                            ...editedTask,
                            ...(editedTask as any),
                            trackReplies: e.target.checked,
                          });
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="track-sms-replies" className="text-sm cursor-pointer">
                        Track SMS Replies
                      </Label>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">
                    Personalization: Use {'{name}'}, {'{company}'}, {'{businessName}'} in content
                  </Label>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* HITL Gate */}
        <Card className="p-4 border-purple-200 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <Label className="text-sm font-semibold">Human-in-the-Loop Gate</Label>
            </div>
            <Switch
              checked={editedTask.isHITL}
              onCheckedChange={(checked) => setEditedTask({ ...editedTask, isHITL: checked })}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Require human approval before proceeding to next task
          </p>
        </Card>
        
        {/* Conditional Branching */}
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
                if (!checked) {
                  handleParentTaskChange(null);
                }
              }}
            />
          </div>
          
          {showBranching && (
            <div className="space-y-3 mt-3">
              <div>
                <Label className="text-xs">Branch From Task</Label>
                <Select
                  value={editedTask.parentTaskId || '__none__'}
                  onValueChange={(value) => handleParentTaskChange(value === '__none__' ? null : value)}
                >
                  <SelectTrigger className="mt-1 border-purple-200">
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="__none__">None</SelectItem>
                    {workflowTasks
                      .filter(t => t.id !== editedTask.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {editedTask.branchCondition && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Condition Field</Label>
                    <Input
                      value={editedTask.branchCondition.field}
                      onChange={(e) => handleBranchConditionChange('field', e.target.value)}
                      className="mt-1 border-purple-200"
                      placeholder="e.g., status"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={editedTask.branchCondition.operator}
                      onValueChange={(value) => handleBranchConditionChange('operator', value)}
                    >
                      <SelectTrigger className="mt-1 border-purple-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCH_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={editedTask.branchCondition.value}
                      onChange={(e) => handleBranchConditionChange('value', e.target.value)}
                      className="mt-1 border-purple-200"
                      placeholder="e.g., completed"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
        
        {/* Task Actions */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Task Actions</Label>
          <div className="space-y-2">
            {AVAILABLE_ACTIONS.map((action) => (
              <div
                key={action.value}
                className="flex items-center gap-3 p-2 rounded-lg border border-purple-200 hover:bg-purple-50 cursor-pointer"
                onClick={() => handleActionToggle(action.value)}
              >
                <input
                  type="checkbox"
                  checked={selectedActions.includes(action.value)}
                  onChange={() => handleActionToggle(action.value)}
                  className="w-4 h-4 text-purple-600 border-purple-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{action.icon}</span>
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-purple-200">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(editedTask.id);
              onClose();
            }}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          {hasUnsavedChanges && (
            <Button
              size="sm"
              onClick={() => {
                const ac = (editedTask as any).actionConfig || {};
                const taskToSave = {
                  ...editedTask,
                  ...(editedTask as any),
                  actionConfig: { ...ac, actions: selectedActions },
                  skipConditions: skipConditions.length > 0 ? skipConditions : null,
                };
                onSave(taskToSave);
                lastSavedRef.current = JSON.stringify(taskToSave);
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
