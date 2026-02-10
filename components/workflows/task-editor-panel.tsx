/**
 * Generic Task Editor Panel
 * Industry-aware task configuration panel
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { X, Trash2, Save, Shield, Clock, GitBranch, BarChart3, ChevronDown, ChevronUp, Beaker } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  { value: 'voice_call', label: 'Voice Call', icon: '📞', description: 'Make AI voice call via ElevenLabs' },
  { value: 'sms', label: 'SMS', icon: '💬', description: 'Send SMS message via Twilio' },
  { value: 'email', label: 'Email', icon: '📧', description: 'Send email via SendGrid' },
  { value: 'task', label: 'Create Task', icon: '✅', description: 'Create a task in CRM' },
  { value: 'calendar', label: 'Calendar Event', icon: '📅', description: 'Create calendar appointment' },
  { value: 'lead_research', label: 'Lead Research', icon: '🔍', description: 'Research lead/customer information' },
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
  
  const industryConfig = getIndustryConfig(industry);
  
  useEffect(() => {
    setEditedTask(task);
    setShowBranching(task?.parentTaskId !== null && task?.parentTaskId !== undefined);
    
    // Load actions from task's actionConfig
    if (task) {
      const actionConfig = (task as any).actionConfig || {};
      setSelectedActions(actionConfig.actions || []);
      
      // Load skip conditions
      const taskAny = task as any;
      if (taskAny.skipConditions && Array.isArray(taskAny.skipConditions)) {
        setSkipConditions(taskAny.skipConditions);
      } else {
        setSkipConditions([]);
      }
      
      // Show enhanced timing if in DRIP mode or if enhanced fields are set
      if (executionMode === 'DRIP' || taskAny.delayDays || taskAny.delayHours || taskAny.preferredSendTime) {
        setShowEnhancedTiming(true);
      }
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
  
  const handleAgentChange = (agentId: string) => {
    const agent = industryConfig.aiAgents.find(a => a.id === agentId);
    setEditedTask({
      ...editedTask,
      assignedAgentId: agentId === 'unassigned' ? null : agentId,
      assignedAgentName: agent?.name || null,
      agentColor: agent?.color || '#8b5cf6',
    });
  };
  
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
          <Select
            value={editedTask.assignedAgentId || 'unassigned'}
            onValueChange={handleAgentChange}
          >
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
            </SelectContent>
          </Select>
        </div>
        
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
                  value={editedTask.parentTaskId || ''}
                  onValueChange={(value) => handleParentTaskChange(value || null)}
                >
                  <SelectTrigger className="mt-1 border-purple-200">
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
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
          <Button
            size="sm"
            onClick={() => {
              // Ensure skip conditions are included in saved task
              const taskToSave = {
                ...editedTask,
                ...(editedTask as any),
                skipConditions: skipConditions.length > 0 ? skipConditions : null,
              };
              onSave(taskToSave);
              onClose();
            }}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
