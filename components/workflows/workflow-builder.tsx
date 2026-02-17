/**
 * Generic Multi-Industry Workflow Builder
 * Works with any industry using industry configurations
 */

'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { WorkflowTask, WorkflowTemplate } from './types';
import { WorkflowCanvas } from './workflow-canvas';
import { TaskEditorPanel } from './task-editor-panel';
import { WorkflowTemplatesGallery } from './workflow-templates-gallery';
import { ExecutionModeSelector } from './execution-mode-selector';
import { AudiencePanel, AudienceConfig } from './audience-panel';
import { CampaignSettingsPanel, CampaignSettings } from './campaign-settings-panel';
import { EnrollmentPanel } from './enrollment-panel';
import { ABTestPanel } from './ab-test-panel';
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
  Undo2,
  Play,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WorkflowBuilderProps {
  industry: Industry;
  initialWorkflowId?: string;
}

export interface WorkflowBuilderHandle {
  requestBack: () => Promise<boolean>;
}

export const WorkflowBuilder = forwardRef<WorkflowBuilderHandle, WorkflowBuilderProps>(
  function WorkflowBuilder({ industry, initialWorkflowId }, ref) {
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskType, setNewTaskType] = useState<string>('CREATE_TASK');
  const [showTemplateGallery, setShowTemplateGallery] = useState(!initialWorkflowId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Execution mode state (Workflow, Campaign, or Drip)
  const [executionMode, setExecutionMode] = useState<'WORKFLOW' | 'CAMPAIGN' | 'DRIP'>('WORKFLOW');
  const [audience, setAudience] = useState<AudienceConfig | null>(null);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings | null>(null);
  // Drip mode state
  const [enrollmentMode, setEnrollmentMode] = useState<boolean>(false);
  const [enrollmentTriggers, setEnrollmentTriggers] = useState<any[]>([]);
  // A/B Testing state (Phase 3)
  const [enableAbTesting, setEnableAbTesting] = useState<boolean>(false);
  const [abTestConfig, setAbTestConfig] = useState<any>(null);
  
  const industryConfig = getIndustryConfig(industry);
  const [revertPoint, setRevertPoint] = useState<WorkflowTemplate | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const closeResolverRef = useRef<((value: boolean) => void) | null>(null);

  // Load workflow and clear unsaved state (used when loading from template/fetch/select)
  const loadWorkflow = (w: WorkflowTemplate | null) => {
    setWorkflow(w);
    setHasUnsavedChanges(false);
    setRevertPoint(w ? JSON.parse(JSON.stringify(w)) : null);
  };

  // Check if workflow id is a saved DB id (cuid) vs template id or 'new'
  const isSavedWorkflowId = (id: string) =>
    id !== 'new' && !id.includes('-') && id.length >= 20;

  // Transform API response to WorkflowTemplate shape
  const transformWorkflow = (t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    workflowType: t.workflowType || t.type || 'CUSTOM',
    industry: t.industry || industry,
    tasks: (t.tasks || []).map((task: any) => {
      const ac = task.actionConfig || {};
      return {
        id: task.id,
        name: task.name,
        description: task.description || '',
        taskType: task.taskType,
        assignedAgentId: task.assignedAgentId ?? ac.assignedAgentId ?? null,
        assignedAgentName: task.assignedAgentName ?? ac.assignedAgentName ?? null,
        agentColor: task.agentColor ?? ac.agentColor ?? '#6B7280',
        assignedAIEmployeeId: task.assignedAIEmployeeId ?? ac.assignedAIEmployeeId ?? null,
        displayOrder: task.displayOrder || 0,
        isHITL: task.isHITL || false,
        delayMinutes: (task.delayValue ?? task.delayMinutes) ?? 0,
        delayUnit: task.delayUnit || 'MINUTES',
        delayDays: task.delayDays || 0,
        delayHours: task.delayHours || 0,
        preferredSendTime: task.preferredSendTime ?? null,
        skipConditions: task.skipConditions ?? null,
        isAbTestVariant: task.isAbTestVariant || false,
        abTestGroup: task.abTestGroup ?? null,
        variantOf: task.variantOf ?? null,
        parentTaskId: task.parentTaskId ?? null,
        branchCondition: task.branchCondition ?? null,
        actionConfig: task.actionConfig || { actions: [] },
      };
    }),
    isDefault: t.isDefault || false,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  });

  const fetchSingleWorkflow = async (id: string) => {
    const res = await fetch(`/api/workflows/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.workflow ? transformWorkflow(data.workflow) : null;
  };

  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, [industry]);

  // Phase 2: Load draft by ID when initialWorkflowId is set
  useEffect(() => {
    if (!initialWorkflowId || workflow || showTemplateGallery) return;
    const load = async () => {
      let found = workflows.find((w) => w.id === initialWorkflowId);
      if (!found) {
        found = (await fetchSingleWorkflow(initialWorkflowId)) || undefined;
      }
      if (found) {
        loadWorkflow(found);
        setShowTemplateGallery(false);
      }
    };
    load();
  }, [workflows, initialWorkflowId, workflow, showTemplateGallery]);

  // Phase 2: Set active draft in sessionStorage and server for voice/chat context
  // Don't clear on unmount - only clear when user explicitly clicks "Back to Overview" (preserves draft for "take me back")
  useEffect(() => {
    if (typeof window === 'undefined' || !initialWorkflowId) return;
    sessionStorage.setItem('activeWorkflowDraftId', initialWorkflowId);
    fetch('/api/workflows/active-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: initialWorkflowId }),
    }).catch(() => {});
  }, [initialWorkflowId]);

  // Phase 2: Poll for draft updates when AI adds tasks via API (every 2s for live feel)
  useEffect(() => {
    if (!initialWorkflowId || !workflow || workflow.id !== initialWorkflowId) return;
    const interval = setInterval(async () => {
      const updated = await fetchSingleWorkflow(initialWorkflowId);
      if (updated) {
        setWorkflow((prev) => {
          if (!prev || prev.id !== initialWorkflowId) return prev;
          const prevTaskIds = (prev.tasks || []).map((t) => t.id).sort().join(',');
          const newTaskIds = (updated.tasks || []).map((t) => t.id).sort().join(',');
          return prevTaskIds !== newTaskIds ? updated : prev;
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [initialWorkflowId, workflow?.id]);
  
  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workflows?industry=${industry}`);
      if (res.ok) {
        const data = await res.json();
        const dbTemplates = data.workflows || [];
        
        // Load execution mode from first workflow if present
        const first = dbTemplates[0];
        if (first) {
          if (first.executionMode === 'CAMPAIGN') {
            setExecutionMode('CAMPAIGN');
            if (first.audience) setAudience(first.audience);
            if (first.campaignSettings) setCampaignSettings(first.campaignSettings);
          } else if (first.executionMode === 'DRIP' || first.enrollmentMode) {
            setExecutionMode('DRIP');
            setEnrollmentMode(true);
            if (first.enrollmentTriggers) setEnrollmentTriggers(first.enrollmentTriggers);
            if (first.enableAbTesting) setEnableAbTesting(true);
            if (first.abTestConfig) setAbTestConfig(first.abTestConfig);
          }
        }
        const transformedTemplates = dbTemplates.map((t: any) => transformWorkflow(t));
        
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
          loadWorkflow(data.template);
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
    loadWorkflow({
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
  
  const handleSaveWorkflow = async (): Promise<boolean> => {
    if (!workflow) return false;
    
    setIsSaving(true);
    try {
      // Use POST for new workflows or template-based (template ids contain hyphens); PUT for saved DB workflows
      const usePut = isSavedWorkflowId(workflow.id);
      const method = usePut ? 'PUT' : 'POST';
      const url = usePut ? `/api/workflows/${workflow.id}` : '/api/workflows';
      
      const payload = {
        ...workflow,
        type: workflow.workflowType,
        industry,
        executionMode,
        audience,
        campaignSettings,
        enrollmentMode: executionMode === 'DRIP' ? true : false,
        enrollmentTriggers: executionMode === 'DRIP' ? enrollmentTriggers : null,
        enableAbTesting: executionMode === 'DRIP' && enrollmentMode ? enableAbTesting : false,
        abTestConfig: executionMode === 'DRIP' && enrollmentMode && enableAbTesting ? abTestConfig : null,
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (res.ok) {
        loadWorkflow(data.workflow ? transformWorkflow(data.workflow) : data.workflow);
        const successMessage = 
          executionMode === 'CAMPAIGN' ? 'Campaign saved successfully' :
          executionMode === 'DRIP' ? 'Drip campaign saved successfully' :
          'Workflow saved successfully';
        toast.success(successMessage);
        fetchWorkflows(); // Refresh list
        return true;
      } else {
        const errorMsg = data?.error || `Failed to save (${res.status})`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow');
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateTask = (updatedTask: WorkflowTask) => {
    if (!workflow) return;
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    setWorkflow({ ...workflow, tasks: updatedTasks });
  };
  
  const handleDeleteTask = (taskId: string) => {
    if (!workflow) return;
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
  
  // Revert - show confirmation, then clear to empty canvas (stay on screen)
  const handleRevertClick = () => {
    if (!workflow) return;
    setShowResetConfirmDialog(true);
  };

  const handleResetConfirm = (confirmed: boolean) => {
    setShowResetConfirmDialog(false);
    if (!confirmed || !workflow) return;
    // Clear to empty canvas, stay on screen
    const emptyWorkflow: WorkflowTemplate = {
      ...workflow,
      tasks: [],
      name: workflow.id === 'new' ? 'New Custom Workflow' : workflow.name,
    };
    loadWorkflow(emptyWorkflow);
    setSelectedTaskId(null);
    setShowTemplateGallery(false);
    toast.success('Workflow reset');
  };

  // Expose requestBack for parent to call when Back is clicked
  useImperativeHandle(ref, () => ({
    requestBack: () =>
      new Promise<boolean>((resolve) => {
        if (!hasUnsavedChanges) {
          resolve(true);
          return;
        }
        closeResolverRef.current = resolve;
        setShowCloseDialog(true);
      }),
  }), [hasUnsavedChanges]);

  const handleCloseDialogChoice = async (choice: 'save' | 'discard' | 'cancel') => {
    setShowCloseDialog(false);
    const resolve = closeResolverRef.current;
    closeResolverRef.current = null;
    if (choice === 'cancel') {
      resolve?.(false);
      return;
    }
    if (choice === 'save') {
      const saved = await handleSaveWorkflow();
      resolve?.(saved);
    } else {
      resolve?.(true);
    }
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
            value={workflow?.id || '__none__'}
            onValueChange={(value) => {
              if (value === '__new__') {
                handleCreateCustom();
                return;
              }
              if (value === '__none__') return;
              const found = workflows.find(w => w.id === value);
              if (found) {
                loadWorkflow(found);
                setShowTemplateGallery(false);
              }
            }}
          >
            <SelectTrigger className="w-64 border-purple-200">
              <SelectValue placeholder="Select workflow or campaign" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="__none__">
                <span className="text-muted-foreground">Select workflow or campaign</span>
              </SelectItem>
              <SelectItem value="__new__">
                <span className="text-purple-600 font-medium">+ Create new workflow</span>
              </SelectItem>
              {workflow && !workflows.find(w => w.id === workflow.id) && (
                <SelectItem value={workflow.id}>
                  <span className={workflow.id === 'new' ? 'text-amber-600' : ''}>
                    {workflow.id === 'new' ? 'New workflow (unsaved)' : workflow.name}
                  </span>
                </SelectItem>
              )}
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="flex items-center gap-2">
                    {w.name}
                    {(w as any).status === 'DRAFT' && (
                      <span className="text-xs text-gray-500">(draft)</span>
                    )}
                  </span>
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
                  setHasUnsavedChanges(true);
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
                onClick={handleRevertClick}
                className="border-purple-200 text-gray-700 hover:bg-purple-50"
                title="Reset workflow to empty"
              >
                <Undo2 className="w-4 h-4 mr-2" />
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
                          <SelectItem value="SEND_REFERRAL_LINK">🔗 Send Referral Link</SelectItem>
                          <SelectItem value="CREATE_REFERRAL">➕ Create Referral</SelectItem>
                          <SelectItem value="NOTIFY_REFERRAL_CONVERTED">🔔 Notify on Referral Converted</SelectItem>
                          <SelectItem value="REQUEST_FEEDBACK_VOICE">📞 Request Feedback (Voice AI)</SelectItem>
                          <SelectItem value="SEND_REVIEW_LINK">⭐ Send Review Link (Google/Yelp)</SelectItem>
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
              
              {hasUnsavedChanges && (
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
              )}
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
                    onAudienceChange={(a) => { setHasUnsavedChanges(true); setAudience(a); }}
                    executionMode={executionMode}
                  />
                  <CampaignSettingsPanel
                    settings={campaignSettings}
                    onSettingsChange={(s) => { setHasUnsavedChanges(true); setCampaignSettings(s); }}
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
                    onEnrollmentModeChange={(m) => { setHasUnsavedChanges(true); setEnrollmentMode(m); }}
                    onEnrollmentTriggersChange={(t) => { setHasUnsavedChanges(true); setEnrollmentTriggers(t); }}
                  />
                  {/* A/B Testing Panel - Only show when enrollment mode is enabled */}
                  {enrollmentMode && (
                    <ABTestPanel
                      enableAbTesting={enableAbTesting}
                      abTestConfig={abTestConfig}
                      onEnableAbTestingChange={(v) => { setHasUnsavedChanges(true); setEnableAbTesting(v); }}
                      onABTestConfigChange={(c) => { setHasUnsavedChanges(true); setAbTestConfig(c); }}
                    />
                  )}
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
            executionMode={executionMode as 'WORKFLOW' | 'CAMPAIGN' | 'DRIP'}
            onClose={() => setSelectedTaskId(null)}
            onSave={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        )}
      </div>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetConfirmDialog} onOpenChange={(open) => !open && handleResetConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the workflow? All tasks will be removed and you will start with an empty canvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleResetConfirm(false)}>No</AlertDialogCancel>
            <Button onClick={() => handleResetConfirm(true)} className="bg-purple-600 hover:bg-purple-700">
              Yes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save before close dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={(open) => !open && handleCloseDialogChoice('cancel')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save the workflow before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleCloseDialogChoice('discard')}>
              Don&apos;t save
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => handleCloseDialogChoice('save')}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save workflow'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
