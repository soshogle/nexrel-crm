/**
 * Generic Industry Workflows Tab
 * Reusable wrapper for all industries
 */

'use client';

import React, { useState } from 'react';
import { WorkflowBuilder } from './workflow-builder';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';
import { Industry } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch,
  Zap,
  Shield,
  Clock,
  Users,
  ArrowRight,
  Activity,
  Wrench,
} from 'lucide-react';

interface IndustryWorkflowsTabProps {
  industry: Industry;
}

export function IndustryWorkflowsTab({ industry }: IndustryWorkflowsTabProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  
  const industryConfig = getIndustryConfig(industry);
  
  if (!industryConfig) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p>Workflow system not available for this industry</p>
      </div>
    );
  }
  
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
          <WorkflowBuilder industry={industry} />
        </div>
      </div>
    );
  }
  
  const templates = industryConfig.templates || [];
  
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
            Design and automate your {industryConfig.fieldLabels.contact.toLowerCase()} pipelines with AI-powered workflows
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
          {/* TODO: Create generic HITL approval panel */}
          <Card className="bg-white border-2 border-purple-200">
            <CardHeader>
              <CardTitle>HITL Approvals</CardTitle>
              <CardDescription>Human-in-the-loop approval requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">HITL approval panel coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          {/* TODO: Create generic workflow instance monitor */}
          <Card className="bg-white border-2 border-purple-200">
            <CardHeader>
              <CardTitle>Workflow Monitor</CardTitle>
              <CardDescription>Monitor running workflow instances</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Workflow monitor coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          {/* Pipeline Templates */}
          {templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((template) => {
                const taskCount = template.tasks.length;
                const hitlGates = template.tasks.filter(t => t.isHITL).length;
                const agentsAssigned = new Set(
                  template.tasks
                    .map(t => t.agentName)
                    .filter(Boolean)
                ).size;
                
                return (
                  <Card 
                    key={template.id}
                    className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-md hover:shadow-lg" 
                    onClick={() => setShowBuilder(true)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-300">
                            <GitBranch className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-gray-900">{template.name}</CardTitle>
                            <CardDescription className="text-gray-600">{template.description}</CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                          {taskCount} Tasks
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Shield className="w-4 h-4 text-amber-600" />
                          <span>{hitlGates} HITL approval gates</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>{agentsAssigned} AI agents assigned</span>
                        </div>
                        <div className="pt-3 border-t border-purple-200">
                          <p className="text-xs text-gray-600">
                            {template.tasks.slice(0, 5).map(t => t.name).join(' → ')}
                            {template.tasks.length > 5 && ' → ...'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {/* Features Overview */}
          <Card className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 shadow-md mt-6">
            <CardHeader>
              <CardTitle className="text-gray-900">Workflow Builder Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border-2 border-purple-200 rounded-lg shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-2">Visual Drag & Drop</h4>
                  <p className="text-sm text-gray-600">
                    Arrange tasks in a serpentine layout. Drag to reposition, drop on another task to swap positions.
                  </p>
                </div>
                <div className="p-4 bg-white border-2 border-purple-200 rounded-lg shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-2">AI Agent Assignment</h4>
                  <p className="text-sm text-gray-600">
                    Assign specialized AI agents to handle specific tasks automatically.
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
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border-2 border-purple-200 mt-6">
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
