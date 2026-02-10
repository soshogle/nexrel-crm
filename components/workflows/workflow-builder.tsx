/**
 * Generic Multi-Industry Workflow Builder
 * Works with any industry using industry configurations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { WorkflowTask, WorkflowTemplate } from './types';
import { WorkflowCanvas } from './workflow-canvas';
import { TaskEditorPanel } from './task-editor-panel';
import { WorkflowTemplatesGallery } from './workflow-templates-gallery';
import { ExecutionModeSelector } from './execution-mode-selector';
import { AudiencePanel, AudienceConfig } from './audience-panel';
import { CampaignSettingsPanel, CampaignSettings } from './campaign-settings-panel';
import { EnrollmentPanel } from './enrollment-panel';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';
import { Industry } from '@prisma/client';
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
  Loader2,
} from 'lucide-react';

interface WorkflowBuilderProps {
  industry: Industry;
  initialWorkflowId?: string;
}

export function WorkflowBuilder({ industry, initialWorkflowId }: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskType, setNewTaskType] = useState<string>('CREATE_TASK');
  const [showTemplateGallery, setShowTemplateGallery] = useState(!initialWorkflowId);
  
  // Execution mode state (Workflow, Campaign, or Drip)
  const [executionMode, setExecutionMode] = useState<'WORKFLOW' | 'CAMPAIGN' | 'DRIP'>('WORKFLOW');
  const [audience, setAudience] = useState<AudienceConfig | null>(null);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings | null>(null);
  // Drip mode state
  const [enrollmentMode, setEnrollmentMode] = useState<boolean>(false);
  const [enrollmentTriggers, setEnrollmentTriggers] = useState<any[]>([]);
  
  const industryConfig = getIndustryConfig(industry);
  
  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, [industry]);
  
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
    }
  }, [workflows, initialWorkflowId, workflow, showTemplateGallery]);
  
  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workflows?industry=${industry}`);
      if (res.ok) {
        const data = await res.json();
        const dbTemplates = data.workflows || [];
        
        // Transform DB templates to match WorkflowTemplate interface
        const transformedTemplates = dbTemplates.map((t: any) => {
          // Load execution mode settings if they exist
          if (t.executionMode === 'CAMPAIGN') {
            setExecutionMode('CAMPAIGN');
            if (t.audience) setAudience(t.audience);
            if (t.campaignSettings) setCampaignSettings(t.campaignSettings);
          } else if (t.executionMode === 'DRIP' || t.enrollmentMode) {
            setExecutionMode('DRIP');
            setEnrollmentMode(true);
            if (t.enrollmentTriggers) setEnrollmentTriggers(t.enrollmentTriggers);
          }
          
          return {
            id: t.id,
            name: t.name,
            description: t.description || '',
            workflowType: t.type || 'CUSTOM',
            industry: t.industry || industry,
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
              parentTaskId: null,
              branchCondition: null,
            })),
            isDefault: t.isDefault || false,
            createdAt: t.createdAt || new Date().toISOString(),
            updatedAt: t.updatedAt || new Date().toISOString(),
          };
        });
        
        setWorkflows(transformedTemplates);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadTemplate = async (templateId: string) => {
    setIsLoading(true);
    setShowTemplateGallery(false);
    try {
      const res = await fetch(`/api/workflows/templates?industry=${industry}&id=${templateId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.template) {
          setWorkflow(data.template);
          setSelectedTaskId(null);
          toast.success(`Loaded template: ${data.template.name}`);
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
  
  const handleSelectTemplate = (templateId: string) => {
    loadTemplate(templateId);
  };
  
  const handleCreateCustom = () => {
    setShowTemplateGallery(false);
    setWorkflow({
      id: 'new',
      name: 'New Custom Workflow',
      description: '',
      workflowType: 'CUSTOM',
      industry,
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
      const method = workflow.id && workflow.id !== 'new' ? 'PUT' : 'POST';
      const url = method === 'PUT'
        ? `/api/workflows/${workflow.id}`
        : '/api/workflows';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workflow,
          industry,
          executionMode,
          audience,
          campaignSettings,
          enrollmentMode: executionMode === 'DRIP' ? true : false,
          enrollmentTriggers: executionMode === 'DRIP' ? enrollmentTriggers : null,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data.workflow);
        const successMessage = 
          executionMode === 'CAMPAIGN' ? 'Campaign saved successfully' :
          executionMode === 'DRIP' ? 'Drip campaign saved successfully' :
          'Workflow saved successfully';
        toast.success(successMessage);
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
    
    const currentTasks = workflow.tasks || [];
    setWorkflow({
      ...workflow,
      tasks: currentTasks.map(t =>
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
    
    const currentTasks = workflow.tasks || [];
    setWorkflow({
      ...workflow,
      tasks: currentTasks
        .filter(t => t.id !== taskId)
        .map((t, i) => ({ ...t, displayOrder: i + 1 })),
    });
    setSelectedTaskId(null);
    toast.success('Task deleted');
  };
  
  const handleAddTask = () => {
    if (!workflow || !newTaskName.trim()) return;
    
    const currentTasks = workflow.tasks || [];
    const newOrder = currentTasks.length + 1;
    
    const newTask: WorkflowTask = {
      id: `task-${Date.now()}`,
      name: newTaskName.trim(),
      description: '',
      taskType: industryConfig?.taskTypes[0]?.value || 'CUSTOM',
      assignedAgentId: null,
      assignedAgentName: null,
      agentColor: industryConfig?.taskTypes[0]?.color || '#6B7280',
      displayOrder: newOrder,
      isHITL: false,
      delayMinutes: 0,
      actionType: newTaskType as any,
    };
    
    setWorkflow({ ...workflow, tasks: [...currentTasks, newTask] });
    setNewTaskName('');
    setNewTaskType('CREATE_TASK');
    setShowNewTaskDialog(false);
    setSelectedTaskId(newTask.id);
    toast.success('Task added');
  };
  
  const handleReset = () => {
    if (!workflow) return;
    const currentTasks = workflow.tasks || [];
    setWorkflow({
      ...workflow,
      tasks: currentTasks.map((t, i) => ({ ...t, displayOrder: i + 1 })),
    });
    setSelectedTaskId(null);
    toast.success('Workflow reset');
  };
  
  const selectedTask = workflow?.tasks?.find(t => t.id === selectedTaskId) || null;
  
  if (isLoading && !workflow) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-xl border-2 border-purple-200">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-white rounded-xl border-2 border-purple-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center gap-4">
          <Select
            value={workflow?.id || undefined}
            onValueChange={(value) => {
              const found = workflows.find(w => w.id === value);
              if (found) {
                setWorkflow(found);
                setShowTemplateGallery(false);
              }
            }}
          >
            <SelectTrigger className="w-64 border-purple-200">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent className="z-50">
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {workflow && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTemplateGallery(true)}
                className="border-purple-200 text-gray-700 hover:bg-purple-50"
              >
                Browse Templates
              </Button>
              
              {/* Execution Mode Selector - Only show when workflow is loaded */}
              <ExecutionModeSelector
                mode={executionMode}
                onModeChange={(mode) => {
                  setExecutionMode(mode);
                  // Reset settings when switching modes
                  if (mode === 'WORKFLOW') {
                    setAudience(null);
                    setCampaignSettings(null);
                    setEnrollmentMode(false);
                    setEnrollmentTriggers([]);
                  } else if (mode === 'CAMPAIGN') {
                    // Initialize campaign settings when switching to campaign mode
                    setEnrollmentMode(false);
                    setEnrollmentTriggers([]);
                    if (!campaignSettings) {
                      setCampaignSettings({
                        frequency: 'ONE_TIME',
                        tone: 'professional',
                      });
                    }
                    if (!audience) {
                      setAudience({
                        type: 'FILTERED',
                        filters: {
                          minLeadScore: 75,
                          statuses: [],
                          tags: [],
                          types: [],
                          hasPhone: false,
                          hasEmail: false,
                        },
                      });
                    }
                  } else if (mode === 'DRIP') {
                    // Initialize drip/enrollment mode settings
                    setEnrollmentMode(true);
                    setAudience(null);
                    setCampaignSettings(null);
                    if (enrollmentTriggers.length === 0) {
                      setEnrollmentTriggers([]);
                    }
                  }
                }}
              />
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {workflow && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="border-purple-200 text-gray-700 hover:bg-purple-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              
              <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Task Type</label>
                      <Select value={newTaskType} onValueChange={setNewTaskType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREATE_TASK">📋 Create Task</SelectItem>
                          <SelectItem value="SEND_EMAIL">📧 Send Email</SelectItem>
                          <SelectItem value="SEND_SMS">💬 Send SMS</SelectItem>
                          <SelectItem value="SEND_MESSAGE">💭 Send Message</SelectItem>
                          <SelectItem value="UPDATE_LEAD">👤 Update Lead</SelectItem>
                          <SelectItem value="UPDATE_DEAL">💼 Update Deal</SelectItem>
                          <SelectItem value="CREATE_APPOINTMENT">📅 Create Appointment</SelectItem>
                          <SelectItem value="ADD_TAG">🏷️ Add Tag</SelectItem>
                          <SelectItem value="REMOVE_TAG">❌ Remove Tag</SelectItem>
                          <SelectItem value="CHANGE_LEAD_STATUS">🔄 Change Lead Status</SelectItem>
                          <SelectItem value="MOVE_DEAL_STAGE">➡️ Move Deal Stage</SelectItem>
                          <SelectItem value="ASSIGN_TO_USER">👥 Assign to User</SelectItem>
                          <SelectItem value="WAIT_DELAY">⏱️ Wait Delay</SelectItem>
                          <SelectItem value="WEBHOOK">🔗 Webhook</SelectItem>
                          <SelectItem value="AI_GENERATE_MESSAGE">🤖 AI Generate Message</SelectItem>
                          <SelectItem value="NOTIFY_USER">🔔 Notify User</SelectItem>
                          <SelectItem value="SCHEDULE_FOLLOW_UP">📆 Schedule Follow-Up</SelectItem>
                          <SelectItem value="MAKE_OUTBOUND_CALL">📞 Make Outbound Call</SelectItem>
                          <SelectItem value="CREATE_LEAD_FROM_MESSAGE">➕ Create Lead from Message</SelectItem>
                          <SelectItem value="CREATE_DEAL_FROM_LEAD">💼 Create Deal from Lead</SelectItem>
                          <SelectItem value="AUTO_REPLY">⚡ Auto Reply</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Task Name</label>
                      <Input
                        placeholder="Enter task name"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTask();
                          }
                        }}
                      />
                    </div>
                    <Button onClick={handleAddTask} className="w-full" disabled={!newTaskName.trim()}>
                      Add Task
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
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
            </>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Template Gallery or Canvas */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {showTemplateGallery ? (
            <WorkflowTemplatesGallery
              industry={industry}
              onSelectTemplate={handleSelectTemplate}
              onCreateCustom={handleCreateCustom}
            />
          ) : workflow ? (
            <>
              {/* Workflow Canvas - Always visible, unchanged */}
              <WorkflowCanvas
                workflow={workflow}
                industry={industry}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onUpdateTask={handleUpdateTask}
                onReorderTasks={handleReorderTasks}
                onAddTask={() => setShowNewTaskDialog(true)}
              />
              
              {/* Campaign Panels - Only show when Campaign Mode is enabled */}
              {executionMode === 'CAMPAIGN' && (
                <div className="space-y-4 mt-6">
                  <AudiencePanel
                    audience={audience}
                    onAudienceChange={setAudience}
                    executionMode={executionMode}
                  />
                  <CampaignSettingsPanel
                    settings={campaignSettings}
                    onSettingsChange={setCampaignSettings}
                    executionMode={executionMode}
                  />
                </div>
              )}
              
              {/* Enrollment Panel - Only show when Drip Mode is enabled */}
              {executionMode === 'DRIP' && (
                <div className="space-y-4 mt-6">
                  <EnrollmentPanel
                    enrollmentMode={enrollmentMode}
                    enrollmentTriggers={enrollmentTriggers}
                    onEnrollmentModeChange={setEnrollmentMode}
                    onEnrollmentTriggersChange={setEnrollmentTriggers}
                  />
                </div>
              )}
            </>
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
            industry={industry}
            workflowTasks={workflow.tasks}
            executionMode={executionMode}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
    </div>
  );
}
