'use client';

import React, { useState } from 'react';
import { WorkflowBuilder } from './workflow-builder';
import { HITLApprovalPanel } from './hitl-approval-panel';
import { WorkflowInstanceMonitor } from './workflow-instance-monitor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';

export function REWorkflowsTab() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  
  if (showBuilder) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-500" />
            Workflow Builder
          </h2>
          <Button variant="outline" onClick={() => setShowBuilder(false)}>
            Back to Overview
          </Button>
        </div>
        <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden">
          <WorkflowBuilder />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-500" />
            AI Workflow Automation
          </h2>
          <p className="text-gray-400 mt-1">
            Design and automate your real estate pipelines with AI-powered workflows
          </p>
        </div>
        <Button
          onClick={() => setShowBuilder(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Zap className="w-4 h-4 mr-2" />
          Open Workflow Builder
        </Button>
      </div>

      {/* Sub-tabs for different views */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
            <Wrench className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-amber-600">
            <Shield className="w-4 h-4 mr-2" />
            HITL Approvals
          </TabsTrigger>
          <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600">
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

        <TabsContent value="overview">
      
      {/* Pipeline Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buyer Pipeline */}
        <Card className="bg-gray-900 border-gray-800 hover:border-blue-600 transition-colors cursor-pointer" onClick={() => setShowBuilder(true)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                  <Home className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Buyer Pipeline</CardTitle>
                  <CardDescription>Lead to close automation</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                12 Tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>4 HITL approval gates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4 text-purple-500" />
                <span>8 AI agents assigned</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4 text-green-500" />
                <span>Est. 30-45 days cycle</span>
              </div>
              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Qualification → Showings → Offer → Negotiation → Inspection → Closing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Seller Pipeline */}
        <Card className="bg-gray-900 border-gray-800 hover:border-green-600 transition-colors cursor-pointer" onClick={() => setShowBuilder(true)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-white">Seller Pipeline</CardTitle>
                  <CardDescription>Listing to close automation</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-green-400 border-green-400">
                10 Tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>3 HITL approval gates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4 text-purple-500" />
                <span>7 AI agents assigned</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4 text-green-500" />
                <span>Est. 60-90 days cycle</span>
              </div>
              <div className="pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Valuation → Listing → Marketing → Showings → Offers → Closing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Features Overview */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-800/50">
        <CardHeader>
          <CardTitle className="text-white">Circular Workflow Builder Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <h4 className="font-medium text-white mb-2">Visual Drag & Drop</h4>
              <p className="text-sm text-gray-400">
                Arrange tasks in a circular layout. Drag to reposition, drop on another task to swap positions.
              </p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <h4 className="font-medium text-white mb-2">AI Agent Assignment</h4>
              <p className="text-sm text-gray-400">
                Assign any of the 12 specialized RE AI employees to handle specific tasks automatically.
              </p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <h4 className="font-medium text-white mb-2">HITL Gates</h4>
              <p className="text-sm text-gray-400">
                Add human approval checkpoints. Get notified via dashboard, SMS, or email when action is needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          className="border-gray-700 text-gray-300"
          onClick={() => setShowBuilder(true)}
        >
          Create Custom Workflow
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <span className="text-sm text-gray-500">
          or start with a template above
        </span>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
