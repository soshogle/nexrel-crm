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
import { X, Trash2, Save, Shield, Clock, User } from 'lucide-react';

interface TaskEditorPanelProps {
  task: WorkflowTask | null;
  onClose: () => void;
  onSave: (task: WorkflowTask) => void;
  onDelete: (taskId: string) => void;
}

const TASK_TYPES = [
  'QUALIFICATION', 'OUTREACH', 'SHOWING', 'OFFER', 'NEGOTIATION',
  'INSPECTION', 'APPRAISAL', 'FINANCING', 'CLOSING', 'POST_CLOSE',
  'LISTING', 'MARKETING', 'STAGING', 'OPEN_HOUSE', 'CUSTOM'
];

export function TaskEditorPanel({
  task,
  onClose,
  onSave,
  onDelete,
}: TaskEditorPanelProps) {
  const [editedTask, setEditedTask] = useState<WorkflowTask | null>(task);
  
  useEffect(() => {
    setEditedTask(task);
  }, [task]);
  
  if (!editedTask) return null;
  
  const handleAgentChange = (agentId: string) => {
    const agent = RE_AGENTS.find(a => a.id === agentId);
    setEditedTask({
      ...editedTask,
      assignedAgentId: agentId === 'unassigned' ? null : agentId,
      assignedAgentName: agent?.name || null,
      agentColor: agent?.color || '#6B7280',
    });
  };
  
  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Edit Task</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Task Name */}
        <div className="space-y-2">
          <Label className="text-gray-300">Task Name</Label>
          <Input
            value={editedTask.name}
            onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Label className="text-gray-300">Description</Label>
          <Textarea
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
          />
        </div>
        
        {/* Task Type */}
        <div className="space-y-2">
          <Label className="text-gray-300">Task Type</Label>
          <Select
            value={editedTask.taskType}
            onValueChange={(value) => setEditedTask({ ...editedTask, taskType: value as WorkflowTask['taskType'] })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {TASK_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="text-white hover:bg-gray-700">
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
          <Label className="text-gray-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            Assigned AI Agent
          </Label>
          <Select
            value={editedTask.assignedAgentId || 'unassigned'}
            onValueChange={handleAgentChange}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="unassigned" className="text-gray-400 hover:bg-gray-700">
                Unassigned
              </SelectItem>
              {RE_AGENTS.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="text-white hover:bg-gray-700">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span>{agent.name}</span>
                    <span className="text-gray-500 text-xs">({agent.role})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* HITL Gate Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-white">HITL Gate</p>
              <p className="text-xs text-gray-400">Require human approval</p>
            </div>
          </div>
          <Switch
            checked={editedTask.isHITL}
            onCheckedChange={(checked) => setEditedTask({ ...editedTask, isHITL: checked })}
          />
        </div>
        
        {/* Delay */}
        <div className="space-y-2">
          <Label className="text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Delay Before Task (minutes)
          </Label>
          <Input
            type="number"
            min="0"
            value={editedTask.delayMinutes}
            onChange={(e) => setEditedTask({ ...editedTask, delayMinutes: parseInt(e.target.value) || 0 })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        
        {/* Order */}
        <div className="space-y-2">
          <Label className="text-gray-300">Execution Order</Label>
          <Input
            type="number"
            min="1"
            value={editedTask.displayOrder}
            onChange={(e) => setEditedTask({ ...editedTask, displayOrder: parseInt(e.target.value) || 1 })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        
        {/* Preview */}
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: editedTask.agentColor }}
            >
              {TASK_TYPE_ICONS[editedTask.taskType]}
            </div>
            <div>
              <p className="font-medium text-white">{editedTask.name}</p>
              <p className="text-sm text-gray-400">
                {editedTask.assignedAgentName || 'Unassigned'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-800">
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
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onSave(editedTask)}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
