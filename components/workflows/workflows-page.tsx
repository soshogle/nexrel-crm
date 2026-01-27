
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Eye, 
  Sparkles,
  Wand2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { CreateWorkflowDialog } from './create-workflow-dialog';
import { WorkflowsList } from './workflows-list';
import { WorkflowTemplatesBrowser } from './workflow-templates-browser';
import { ScheduledWorkflowsList } from './scheduled-workflows-list';
import { toast } from 'sonner';

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    fetchWorkflows();
    fetchTemplates();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/workflows/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const toggleWorkflowStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Workflow ${newStatus.toLowerCase()}`);
        fetchWorkflows();
      }
    } catch (error) {
      toast.error('Failed to update workflow');
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Workflow deleted');
        fetchWorkflows();
      }
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const useTemplate = (template: any) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const activeCount = workflows.filter(w => w.status === 'ACTIVE').length;
  const draftCount = workflows.filter(w => w.status === 'DRAFT').length;
  const totalExecutions = workflows.reduce((sum, w) => sum + (w.completionCount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground mt-1">
            Automate your CRM processes with AI-powered workflows
          </p>
        </div>
        <Button 
          onClick={() => {
            setSelectedTemplate(null);
            setCreateDialogOpen(true);
          }}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active, {draftCount} draft
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.length > 0 ? Math.round((activeCount / workflows.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Workflows enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="templates" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="h-4 w-4" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="my-workflows" className="gap-2">
            <Zap className="h-4 w-4" />
            Active
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <WorkflowTemplatesBrowser />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <ScheduledWorkflowsList />
        </TabsContent>

        <TabsContent value="my-workflows" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : workflows.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first workflow to automate your CRM processes
                </p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <WorkflowsList
              workflows={workflows}
              onToggleStatus={toggleWorkflowStatus}
              onDelete={deleteWorkflow}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <CreateWorkflowDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchWorkflows}
        template={selectedTemplate}
      />
    </div>
  );
}
