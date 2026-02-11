'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkflowBuilder } from './workflow-builder';
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
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams?.get('openBuilder') === '1') {
      setShowBuilder(true);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('openBuilder');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchWorkflows();
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
          <Button variant="outline" onClick={() => setShowBuilder(false)} className="border-purple-200 text-gray-700 hover:bg-purple-50">
            Back to Overview
          </Button>
        </div>
        <div className="flex-1 bg-white rounded-xl overflow-hidden">
          <WorkflowBuilder />
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
      
      {/* Pipeline Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buyer Pipeline */}
        <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-md hover:shadow-lg" onClick={() => setShowBuilder(true)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-300">
                  <Home className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-gray-900">Buyer Pipeline</CardTitle>
                  <CardDescription className="text-gray-600">Lead to close automation</CardDescription>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                12 Tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>4 HITL approval gates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users className="w-4 h-4 text-purple-600" />
                <span>8 AI agents assigned</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-green-600" />
                <span>Est. 30-45 days cycle</span>
              </div>
              <div className="pt-3 border-t border-purple-200">
                <p className="text-xs text-gray-600">
                  Qualification → Showings → Offer → Negotiation → Inspection → Closing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Seller Pipeline */}
        <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-md hover:shadow-lg" onClick={() => setShowBuilder(true)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-300">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-gray-900">Seller Pipeline</CardTitle>
                  <CardDescription className="text-gray-600">Listing to close automation</CardDescription>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                10 Tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>3 HITL approval gates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users className="w-4 h-4 text-purple-600" />
                <span>7 AI agents assigned</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-green-600" />
                <span>Est. 60-90 days cycle</span>
              </div>
              <div className="pt-3 border-t border-purple-200">
                <p className="text-xs text-gray-600">
                  Valuation → Listing → Marketing → Showings → Offers → Closing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Features Overview */}
      <Card className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-900">Circular Workflow Builder Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border-2 border-purple-200 rounded-lg shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2">Visual Drag & Drop</h4>
              <p className="text-sm text-gray-600">
                Arrange tasks in a circular layout. Drag to reposition, drop on another task to swap positions.
              </p>
            </div>
            <div className="p-4 bg-white border-2 border-purple-200 rounded-lg shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2">AI Agent Assignment</h4>
              <p className="text-sm text-gray-600">
                Assign any of the 12 specialized RE AI employees to handle specific tasks automatically.
              </p>
            </div>
            <div className="p-4 bg-white border-2 border-purple-200 rounded-lg shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2">HITL Gates</h4>
              <p className="text-sm text-gray-600">
                Add human approval checkpoints. Get notified via dashboard, SMS, or email when action is needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border-2 border-purple-200">
        <Button
          variant="outline"
          className="border-purple-200 text-gray-700 hover:bg-purple-50"
          onClick={() => setShowBuilder(true)}
        >
          Create Custom Workflow
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <span className="text-sm text-gray-600">
          or start with a template above
        </span>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
