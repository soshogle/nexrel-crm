'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowTask, WorkflowTemplate, RE_AGENTS, TASK_TYPE_ICONS } from './types';
import { CircularWorkflowCanvas } from './circular-workflow-canvas';
import { TaskEditorPanel } from './task-editor-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Plus,
  Save,
  RotateCcw,
  Play,
  FileText,
  Home,
  Users,
  Loader2,
} from 'lucide-react';

interface WorkflowBuilderProps {
  initialWorkflowId?: string;
}

export function WorkflowBuilder({ initialWorkflowId }: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  
  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, []);
  
  // Load initial workflow or default template
  useEffect(() => {
    if (workflows.length > 0 && !workflow) {
      if (initialWorkflowId) {
        const found = workflows.find(w => w.id === initialWorkflowId);
        if (found) setWorkflow(found);
      } else {
        // Load buyer template by default
        loadTemplate('BUYER_PIPELINE');
      }
    }
  }, [workflows, initialWorkflowId, workflow]);
  
  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/real-estate/workflows');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadTemplate = async (type: 'BUYER_PIPELINE' | 'SELLER_PIPELINE') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/real-estate/workflows/templates?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data.template);
        setSelectedTaskId(null);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveWorkflow = async () => {
    if (!workflow) return;
    
    setIsSaving(true);
    try {
      const method = workflow.id && !workflow.id.startsWith('template-') ? 'PUT' : 'POST';
      const url = method === 'PUT'
        ? `/api/real-estate/workflows/${workflow.id}`
        : '/api/real-estate/workflows';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      });
      
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data.workflow);
        toast.success('Workflow saved successfully');
        fetchWorkflows(); // Refresh list
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateTask = (updatedTask: WorkflowTask) => {
    if (!workflow) return;
    
    setWorkflow({
      ...workflow,
      tasks: workflow.tasks.map(t =>
        t.id === updatedTask.id ? updatedTask : t
      ),
    });
  };
  
  const handleReorderTasks = (updatedTasks: WorkflowTask[]) => {
    if (!workflow) return;
    setWorkflow({ ...workflow, tasks: updatedTasks });
  };
  
  const handleDeleteTask = (taskId: string) => {
    if (!workflow) return;
    
    setWorkflow({
      ...workflow,
      tasks: workflow.tasks
        .filter(t => t.id !== taskId)
        .map((t, i) => ({ ...t, displayOrder: i + 1 })),
    });
    setSelectedTaskId(null);
    toast.success('Task deleted');
  };
  
  const handleAddTask = () => {
    if (!workflow || !newTaskName.trim()) return;
    
    const newOrder = workflow.tasks.length + 1;
    const angle = (360 / (workflow.tasks.length + 1)) * newOrder;
    
    const newTask: WorkflowTask = {
      id: `task-${Date.now()}`,
      name: newTaskName.trim(),
      description: '',
      taskType: 'CUSTOM',
      assignedAgentId: null,
      assignedAgentName: null,
      agentColor: '#6B7280',
      displayOrder: newOrder,
      isHITL: false,
      delayMinutes: 0,
      angle,
      radius: 0.7,
    };
    
    // Recalculate all angles for even distribution
    const allTasks = [...workflow.tasks, newTask];
    const updatedTasks = allTasks.map((t, i) => ({
      ...t,
      angle: (360 / allTasks.length) * i,
    }));
    
    setWorkflow({ ...workflow, tasks: updatedTasks });
    setNewTaskName('');
    setShowNewTaskDialog(false);
    setSelectedTaskId(newTask.id);
    toast.success('Task added');
  };
  
  const selectedTask = workflow?.tasks.find(t => t.id === selectedTaskId) || null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          {/* Workflow Selector */}
          <Select
            value={workflow?.id || ''}
            onValueChange={(id) => {
              const found = workflows.find(w => w.id === id);
              if (found) setWorkflow(found);
            }}
          >
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-white">
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Template Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('BUYER_PIPELINE')}
              className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
            >
              <Home className="w-4 h-4 mr-2" />
              Buyer Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('SELLER_PIPELINE')}
              className="border-green-600 text-green-400 hover:bg-green-600/20"
            >
              <FileText className="w-4 h-4 mr-2" />
              Seller Template
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add Task */}
          <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Task name..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button onClick={handleAddTask} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => workflow && loadTemplate(workflow.workflowType as 'BUYER_PIPELINE' | 'SELLER_PIPELINE')}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          
          {/* Save */}
          <Button
            size="sm"
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Workflow
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 p-6">
          {workflow ? (
            <CircularWorkflowCanvas
              workflow={workflow}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onUpdateTask={handleUpdateTask}
              onReorderTasks={handleReorderTasks}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a workflow or load a template to get started</p>
            </div>
          )}
        </div>
        
        {/* Editor Panel */}
        {selectedTask && (
          <TaskEditorPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
      
      {/* Footer Stats */}
      {workflow && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-gray-900/50 text-sm">
          <div className="flex items-center gap-4 text-gray-400">
            <span>
              <strong className="text-white">{workflow.tasks.length}</strong> tasks
            </span>
            <span>
              <strong className="text-amber-400">
                {workflow.tasks.filter(t => t.isHITL).length}
              </strong> HITL gates
            </span>
            <span>
              <strong className="text-purple-400">
                {new Set(workflow.tasks.map(t => t.assignedAgentId).filter(Boolean)).size}
              </strong> agents assigned
            </span>
          </div>
          <div className="text-gray-500">
            {workflow.workflowType === 'BUYER_PIPELINE' ? 'Buyer' : 'Seller'} Pipeline
          </div>
        </div>
      )}
    </div>
  );
}
