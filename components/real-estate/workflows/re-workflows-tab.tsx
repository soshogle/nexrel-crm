'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { REWorkflowBuilderHandle } from './workflow-builder';

const WorkflowBuilder = dynamic(
  () => import('./workflow-builder').then((mod) => mod.WorkflowBuilder),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" /></div> }
);
import { HITLApprovalPanel } from './hitl-approval-panel';
import { WorkflowInstanceMonitor } from './workflow-instance-monitor';
import { ScheduledWorkflowsList } from '@/components/workflows/scheduled-workflows-list';
import { WorkflowsList } from '@/components/workflows/workflows-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  GitBranch,
  Home,
  FileText,
  Zap,
  Shield,
  Clock,
  Users,
  ArrowRight,
  Activity,
  Wrench,
  Play,
  CheckCircle2,
  List,
  Calendar,
} from 'lucide-react';

export function REWorkflowsTab() {
  const searchParams = useSearchParams();
  const [showBuilder, setShowBuilder] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const workflowBuilderRef = useRef<REWorkflowBuilderHandle>(null);

  useEffect(() => {
    if (searchParams?.get('openBuilder') === '1') {
      setShowBuilder(true);
      const did = searchParams?.get('draftId') || undefined;
      if (did) {
        setDraftId(did);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('activeWorkflowDraftId', did);
        }
      }
      // Don't clear params - keeps user in builder mode
    }
  }, [searchParams]);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/real-estate/workflows');
      if (response.ok) {
        const data = await response.json();
        const templates = data.templates || [];
        setWorkflows(templates.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          status: t.isActive ? 'ACTIVE' : 'PAUSED',
          completionCount: t._count?.instances ?? 0,
        })));
      } else {
        toast.error('Failed to load workflows');
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflowStatus = async (id: string, currentStatus: string) => {
    const isActive = currentStatus !== 'ACTIVE';
    
    try {
      const response = await fetch(`/api/real-estate/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(`Workflow ${isActive ? 'activated' : 'paused'}`);
        fetchWorkflows();
      } else {
        toast.error('Failed to update workflow');
      }
    } catch (error) {
      toast.error('Failed to update workflow');
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const response = await fetch(`/api/real-estate/workflows/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Workflow deleted');
        fetchWorkflows();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to delete workflow');
      }
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const activeCount = workflows.filter(w => w.status === 'ACTIVE').length;
  const draftCount = workflows.filter(w => w.status === 'DRAFT').length;
  const totalExecutions = workflows.reduce((sum, w) => sum + (w.completionCount || 0), 0);
  
  if (showBuilder) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col bg-white rounded-xl border-2 border-purple-200 shadow-lg">
        <div className="flex items-center justify-between mb-4 p-4 border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-white">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-600" />
            Workflow Builder
          </h2>
          <Button
            variant="outline"
            onClick={async () => {
              const shouldClose = await workflowBuilderRef.current?.requestBack();
              if (shouldClose) {
                setShowBuilder(false);
                setDraftId(undefined);
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('activeWorkflowDraftId');
                  fetch('/api/workflows/active-draft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ draftId: null }),
                  }).catch(() => {});
                  const url = new URL(window.location.href);
                  url.searchParams.delete('openBuilder');
                  url.searchParams.delete('draftId');
                  window.history.replaceState({}, '', url.pathname + (url.search || '') || url.pathname);
                }
              }
            }}
            className="border-purple-200 text-gray-700 hover:bg-purple-50"
          >
            Back to Overview
          </Button>
        </div>
        <div className="flex-1 bg-white rounded-xl overflow-hidden">
          <WorkflowBuilder ref={workflowBuilderRef} initialWorkflowId={draftId} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border-2 border-purple-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-600" />
            AI Workflow Automation
          </h2>
          <p className="text-gray-600 mt-1">
            Design and automate your real estate pipelines with AI-powered workflows
          </p>
        </div>
        <Button
          onClick={() => setShowBuilder(true)}
          className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-md"
        >
          <Zap className="w-4 h-4 mr-2" />
          Open Workflow Builder
        </Button>
      </div>

      {/* Sub-tabs for different views */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-white border-2 border-purple-200">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700">
            <Wrench className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700">
            <Calendar className="w-4 h-4 mr-2" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="my-workflows" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-700">
            <List className="w-4 h-4 mr-2" />
            My Workflows
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-gray-700">
            <Shield className="w-4 h-4 mr-2" />
            HITL Approvals
          </TabsTrigger>
          <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700">
            <Activity className="w-4 h-4 mr-2" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <HITLApprovalPanel />
        </TabsContent>

        <TabsContent value="monitor">
          <WorkflowInstanceMonitor />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledWorkflowsList />
        </TabsContent>

        <TabsContent value="my-workflows">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : workflows.length === 0 ? (
            <Card className="bg-white border-2 border-purple-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-16 w-16 text-purple-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">No workflows yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first workflow to automate your CRM processes
                </p>
                <Button 
                  onClick={() => setShowBuilder(true)}
                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <WorkflowsList
              workflows={workflows}
              onToggleStatus={toggleWorkflowStatus}
              onDelete={deleteWorkflow}
              onOpenInBuilder={(id) => {
                setDraftId(id);
                setShowBuilder(true);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('openBuilder', '1');
                  url.searchParams.set('draftId', id);
                  window.history.replaceState({}, '', url.pathname + url.search);
                }
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="overview">
          {/* Stats Dashboard */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="bg-white border-2 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Total Workflows</CardTitle>
                <Zap className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{workflows.length}</div>
                <p className="text-xs text-gray-600">
                  {activeCount} active, {draftCount} draft
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Active Workflows</CardTitle>
                <Play className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{activeCount}</div>
                <p className="text-xs text-gray-600">Currently running</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Total Executions</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{totalExecutions}</div>
                <p className="text-xs text-gray-600">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Automation Rate</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {workflows.length > 0 ? Math.round((activeCount / workflows.length) * 100) : 0}%
                </div>
                <p className="text-xs text-gray-600">Workflows enabled</p>
              </CardContent>
            </Card>
          </div>
      
      {/* Workflow Templates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-purple-600" />
          Workflow Templates
        </h3>
        <p className="text-sm text-gray-600">Start with a pre-built template or create your own custom workflow.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-300">
                    <Home className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">Buyer Pipeline</CardTitle>
                    <CardDescription className="text-gray-600">Complete buyer journey from lead qualification to closing</CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-300">12 Tasks</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">4 HITL Gates</Badge>
                <Badge variant="outline" className="text-xs">8 AI Agents</Badge>
                <Badge variant="outline" className="text-xs">30-45 days</Badge>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Lead Qualification</li>
                <li>• MLS Search Setup</li>
                <li>• Property Shortlist</li>
                <li>• Schedule Showings</li>
                <li>• +5 more steps</li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
                onClick={() => setShowBuilder(true)}
              >
                Use Buyer Pipeline Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-300">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900">Seller Pipeline</CardTitle>
                    <CardDescription className="text-gray-600">Complete seller journey from lead to listing and post-close</CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-300">10 Tasks</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">3 HITL Gates</Badge>
                <Badge variant="outline" className="text-xs">7 AI Agents</Badge>
                <Badge variant="outline" className="text-xs">60-90 days</Badge>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Seller Qualification</li>
                <li>• Book Evaluation</li>
                <li>• Prepare CMA</li>
                <li>• Schedule Photography</li>
                <li>• +4 more steps</li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
                onClick={() => setShowBuilder(true)}
              >
                Use Seller Pipeline Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-white border-2 border-purple-200">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h4 className="font-semibold text-gray-900">Create Custom Workflow</h4>
              <p className="text-sm text-gray-600">Build your own workflow from scratch with full control.</p>
            </div>
            <Button
              variant="outline"
              className="border-purple-200 text-gray-700 hover:bg-purple-50"
              onClick={() => setShowBuilder(true)}
            >
              Create Custom
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
