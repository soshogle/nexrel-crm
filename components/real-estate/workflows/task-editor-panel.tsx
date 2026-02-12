'use client';

import React, { useState, useEffect } from 'react';
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
import { X, Trash2, Save, Shield, Clock, User, GitBranch, Settings, Globe } from 'lucide-react';
import { VOICE_LANGUAGES } from '@/lib/voice-languages';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface TaskEditorPanelProps {
  task: WorkflowTask | null;
  workflowTasks: WorkflowTask[];
  onClose: () => void;
  onSave: (task: WorkflowTask) => void;
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

const AVAILABLE_ACTIONS = [
  { value: 'voice_call', label: 'Voice Call', icon: '📞', description: 'Make AI voice call via ElevenLabs' },
  { value: 'sms', label: 'SMS', icon: '💬', description: 'Send SMS message via Twilio' },
  { value: 'email', label: 'Email', icon: '📧', description: 'Send email via SendGrid' },
  { value: 'task', label: 'Create Task', icon: '✅', description: 'Create a task in CRM' },
  { value: 'calendar', label: 'Calendar Event', icon: '📅', description: 'Create calendar appointment' },
  { value: 'cma_generation', label: 'Generate CMA', icon: '📊', description: 'Create Comparative Market Analysis report' },
  { value: 'presentation_generation', label: 'Generate Presentation', icon: '📽️', description: 'Create property presentation' },
  { value: 'market_research', label: 'Market Research', icon: '🔍', description: 'Generate buyer/seller market report' },
  { value: 'document', label: 'Generate Document', icon: '📄', description: 'Generate document (generic)' },
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

  useEffect(() => {
    fetch('/api/ai-employees/user')
      .then((res) => res.ok ? res.json() : { employees: [] })
      .then((data) => setAiEmployees(data.employees || []))
      .catch(() => setAiEmployees([]));
  }, []);
  
  useEffect(() => {
    setEditedTask(task);
    setShowBranching(task?.parentTaskId !== null && task?.parentTaskId !== undefined);
    
    // Load actions from task's actionConfig
    if (task) {
      const actionConfig = (task as any).actionConfig || {};
      setSelectedActions(actionConfig.actions || []);
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
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-semibold text-gray-900">Voice Call Language</Label>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Override language for this task. Leave as Default to use the AI employee&apos;s setting.
            </p>
            <Select
              value={(editedTask as any).actionConfig?.voiceLanguage || ''}
              onValueChange={(value) => {
                const currentActionConfig = (editedTask as any).actionConfig || {};
                setEditedTask({
                  ...editedTask,
                  ...(editedTask as any),
                  actionConfig: {
                    ...currentActionConfig,
                    voiceLanguage: value || undefined,
                  },
                } as WorkflowTask);
              }}
            >
              <SelectTrigger className="bg-white border-purple-200 text-gray-900">
                <SelectValue placeholder="Default (use employee setting)" />
              </SelectTrigger>
              <SelectContent className="bg-white border-purple-200">
                <SelectItem value="">Default</SelectItem>
                {VOICE_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="text-gray-900">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  value={editedTask.parentTaskId || ''}
                  onValueChange={(value) => handleParentTaskChange(value || null)}
                >
                  <SelectTrigger className="bg-white border-green-200 text-gray-900 text-sm">
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-green-200">
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
                  
                  {parentTask && (
                    <div className="mt-3 p-2 bg-green-100 rounded text-xs text-gray-700">
                      <strong>Branching from:</strong> {parentTask.name}
                      <br />
                      <strong>Condition:</strong> {editedTask.branchCondition?.field} {editedTask.branchCondition?.operator} "{editedTask.branchCondition?.value}"
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
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
            onClick={() => {
              // Ensure actionConfig is included when saving
              const taskToSave = {
                ...editedTask,
                actionConfig: {
                  ...((editedTask as any).actionConfig || {}),
                  actions: selectedActions,
                },
              };
              onSave(taskToSave as WorkflowTask);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
