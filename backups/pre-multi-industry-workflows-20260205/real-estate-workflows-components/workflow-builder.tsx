'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowTask, WorkflowTemplate, RE_AGENTS, TASK_TYPE_ICONS } from './types';
import { CircularWorkflowCanvas } from './circular-workflow-canvas';
import { TaskEditorPanel } from './task-editor-panel';
import { WorkflowTemplatesGallery } from './workflow-templates-gallery';
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
  const [showTemplateGallery, setShowTemplateGallery] = useState(!initialWorkflowId);
  
  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, []);
  
  // Load initial workflow or show template gallery
  useEffect(() => {
    if (workflows.length > 0 && !workflow && !showTemplateGallery) {
      if (initialWorkflowId) {
        const found = workflows.find(w => w.id === initialWorkflowId);
        if (found) {
          setWorkflow(found);
          setShowTemplateGallery(false);
        }
      }
      // Don't auto-load template, show gallery instead
    }
  }, [workflows, initialWorkflowId, workflow, showTemplateGallery]);
  
  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/real-estate/workflows');
      if (res.ok) {
        const data = await res.json();
        // API returns 'templates' not 'workflows'
        const dbTemplates = data.templates || [];
        
        // Also fetch default templates and add them to the list
        const templatesRes = await fetch('/api/real-estate/workflows/templates');
        let defaultTemplates: WorkflowTemplate[] = [];
        
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          if (templatesData.templates) {
            // Transform default templates to match WorkflowTemplate interface
            defaultTemplates = templatesData.templates.map((t: any, index: number) => ({
              id: `default-${t.type.toLowerCase()}`,
              name: t.name,
              description: t.description || '',
              workflowType: t.type === 'BUYER' ? 'BUYER_PIPELINE' : t.type === 'SELLER' ? 'SELLER_PIPELINE' : 'CUSTOM',
              tasks: (t.tasks || []).map((task: any, taskIndex: number) => ({
                id: `task-${index}-${taskIndex}`,
                name: task.name,
                description: task.description || '',
                taskType: task.taskType,
                assignedAgentId: null,
                assignedAgentName: task.agentName || null,
                agentColor: task.agentColors?.bg?.replace('/20', '') || '#6B7280',
                displayOrder: task.displayOrder || taskIndex + 1,
                isHITL: task.isHITL || false,
                delayMinutes: task.delayValue || 0,
                delayUnit: task.delayUnit || 'MINUTES',
                angle: task.position?.angle || (360 / (t.tasks?.length || 1)) * taskIndex,
                radius: task.position?.radius || 0.7,
                parentTaskId: null,
                branchCondition: null,
              })),
              isDefault: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
          }
        }
        
        // Transform DB templates to match WorkflowTemplate interface
        const transformedDbTemplates = dbTemplates.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          workflowType: t.type === 'BUYER' ? 'BUYER_PIPELINE' : t.type === 'SELLER' ? 'SELLER_PIPELINE' : 'CUSTOM',
          tasks: (t.tasks || []).map((task: any) => ({
            id: task.id,
            name: task.name,
            description: task.description || '',
            taskType: task.taskType,
            assignedAgentId: null,
            assignedAgentName: null,
            agentColor: '#6B7280',
            displayOrder: task.displayOrder || 0,
            isHITL: task.isHITL || false,
            delayMinutes: task.delayValue || 0,
            delayUnit: task.delayUnit || 'MINUTES',
            angle: task.position?.angle || 0,
            radius: task.position?.radius || 0.7,
            parentTaskId: null,
            branchCondition: null,
          })),
          isDefault: t.isDefault || false,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }));
        
        // Combine default templates with user templates
        setWorkflows([...defaultTemplates, ...transformedDbTemplates]);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadTemplate = async (type: 'BUYER_PIPELINE' | 'SELLER_PIPELINE') => {
    setIsLoading(true);
    setShowTemplateGallery(false);
    try {
      const res = await fetch(`/api/real-estate/workflows/templates?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setWorkflow(data.template);
          setSelectedTaskId(null);
          toast.success(`Loaded ${type === 'BUYER_PIPELINE' ? 'Buyer' : 'Seller'} template`);
        } else {
          toast.error('Template not found');
          setShowTemplateGallery(true);
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to load template');
        setShowTemplateGallery(true);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
      setShowTemplateGallery(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (type: 'BUYER' | 'SELLER') => {
    const pipelineType = type === 'BUYER' ? 'BUYER_PIPELINE' : 'SELLER_PIPELINE';
    loadTemplate(pipelineType);
  };

  const handleCreateCustom = () => {
    setShowTemplateGallery(false);
    setWorkflow({
      id: 'new',
      name: 'New Custom Workflow',
      description: '',
      workflowType: 'CUSTOM',
      tasks: [],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white shadow-sm">
        <div className="flex items-center gap-4">
          {/* Workflow Selector */}
          <Select
            value={workflow?.id || undefined}
            onValueChange={(id) => {
              const found = workflows.find(w => w.id === id);
              if (found) setWorkflow(found);
            }}
          >
            <SelectTrigger className="w-[200px] bg-white border-purple-200 text-gray-900">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent className="bg-white border-purple-200 z-50">
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-gray-900 hover:bg-purple-50">
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
              className="border-purple-300 text-purple-700 hover:bg-purple-100 bg-white"
            >
              <Home className="w-4 h-4 mr-2" />
              Buyer Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTemplate('SELLER_PIPELINE')}
              className="border-purple-300 text-purple-700 hover:bg-purple-100 bg-white"
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
            <DialogContent className="bg-white border-purple-200">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Task name..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="bg-white border-purple-200 text-gray-900"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button onClick={handleAddTask} className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white">
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
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
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
        {/* Template Gallery or Canvas */}
        <div className="flex-1 p-6 overflow-y-auto">
          {showTemplateGallery ? (
            <WorkflowTemplatesGallery
              onSelectTemplate={handleSelectTemplate}
              onCreateCustom={handleCreateCustom}
            />
          ) : workflow ? (
            <CircularWorkflowCanvas
              workflow={workflow}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onUpdateTask={handleUpdateTask}
              onReorderTasks={handleReorderTasks}
              onAddTask={() => setShowNewTaskDialog(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 bg-white rounded-xl border-2 border-purple-200">
              <p className="text-lg">Select a workflow or load a template to get started</p>
            </div>
          )}
        </div>
        
        {/* Editor Panel */}
        {selectedTask && workflow && (
          <TaskEditorPanel
            task={selectedTask}
            workflowTasks={workflow.tasks}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
      
      {/* Footer Stats */}
      {workflow && (
        <div className="flex items-center justify-between px-4 py-3 border-t-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white text-sm shadow-sm">
          <div className="flex items-center gap-6 text-gray-700">
            <span className="flex items-center gap-2">
              <strong className="text-gray-900 font-bold">{workflow.tasks.length}</strong>
              <span className="text-gray-600">tasks</span>
            </span>
            <span className="flex items-center gap-2">
              <strong className="text-amber-600 font-bold">
                {workflow.tasks.filter(t => t.isHITL).length}
              </strong>
              <span className="text-gray-600">HITL gates</span>
            </span>
            <span className="flex items-center gap-2">
              <strong className="text-purple-600 font-bold">
                {new Set(workflow.tasks.map(t => t.assignedAgentId).filter(Boolean)).size}
              </strong>
              <span className="text-gray-600">agents assigned</span>
            </span>
            <span className="flex items-center gap-2">
              <strong className="text-green-600 font-bold">
                {workflow.tasks.filter(t => t.parentTaskId).length}
              </strong>
              <span className="text-gray-600">branches</span>
            </span>
          </div>
          <div className="text-gray-700 font-semibold">
            {workflow.workflowType === 'BUYER_PIPELINE' ? 'Buyer' : workflow.workflowType === 'SELLER_PIPELINE' ? 'Seller' : 'Custom'} Pipeline
          </div>
        </div>
      )}
    </div>
  );
}
