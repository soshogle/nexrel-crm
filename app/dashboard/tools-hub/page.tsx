'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Zap,
  TrendingUp,
  Plus,
  Search,
  Activity,
  AlertCircle,
  CheckCircle2,
  Workflow,
  Sparkles,
  Network,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';

export default function ToolsHubPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [toolInstances, setToolInstances] = useState<any[]>([]);
  const [toolDefinitions, setToolDefinitions] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [instancesRes, definitionsRes, workflowsRes] = await Promise.all([
        fetch('/api/tools/instances'),
        fetch('/api/tools/definitions'),
        fetch('/api/workflows/instances'),
      ]);

      if (instancesRes.ok) {
        const data = await instancesRes.json();
        setToolInstances(data.instances || []);
      }
      if (definitionsRes.ok) {
        const data = await definitionsRes.json();
        setToolDefinitions(data.definitions || []);
      }
      if (workflowsRes.ok) {
        const data = await workflowsRes.json();
        setWorkflows(data.instances || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const monitorHealth = async () => {
    try {
      const res = await fetch('/api/tools/health/monitor', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setHealthMetrics(data.healthMetrics || []);
        toast.success(`Monitored ${data.monitored} tools`);
      }
    } catch (error) {
      toast.error('Failed to monitor tool health');
    }
  };

  const analyzeRelationships = async () => {
    try {
      const res = await fetch('/api/tools/relationships/analyze', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRelationships(data.relationships || []);
        setPatterns(data.patterns || []);
        toast.success(`Found ${data.analysisResults.relationshipsCreated} relationships`);
      }
    } catch (error) {
      toast.error('Failed to analyze relationships');
    }
  };

  const seedMarketplace = async () => {
    try {
      const res = await fetch('/api/tools/marketplace/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        loadData();
      }
    } catch (error) {
      toast.error('Failed to seed marketplace');
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Tools Hub...</p>
        </div>
      </div>
    );
  }

  const activeTools = toolInstances.filter((t) => t.status === 'ACTIVE').length;
  const totalActions = toolInstances.reduce((sum, t) => sum + (t.totalCalls || 0), 0);
  const avgSuccessRate =
    toolInstances.length > 0
      ? toolInstances.reduce(
          (sum, t) => sum + ((t.successfulCalls || 0) / Math.max(t.totalCalls || 1, 1)) * 100,
          0
        ) / toolInstances.length
      : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="h-10 w-10 text-blue-600" />
            Tools & Automation Hub
          </h1>
          <p className="text-gray-600 mt-2">
            Dynamic capability cloning, self-orchestrating workflows, and intelligent tool management
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={seedMarketplace} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Seed
          </Button>
          <Button onClick={analyzeRelationships} variant="outline" size="sm">
            <Network className="h-4 w-4 mr-2" />
            Analyze
          </Button>
          <Button onClick={monitorHealth} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Monitor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Installed Tools</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toolInstances.length}</div>
            <p className="text-xs text-muted-foreground">{activeTools} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all tools</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-xs text-muted-foreground">
              {workflows.filter((w) => w.status === 'ACTIVE').length} running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="installed">My Tools</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest tool executions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {toolInstances.slice(0, 5).map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-gray-500">{tool.totalCalls} calls</p>
                        </div>
                      </div>
                      <Badge variant={tool.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {tool.status}
                      </Badge>
                    </div>
                  ))}
                  {toolInstances.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No tools installed. Check the marketplace!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  AI Patterns
                </CardTitle>
                <CardDescription>Automation suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {patterns.slice(0, 3).map((pattern, index) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="font-medium text-sm">{pattern.patternName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Detected {pattern.detectedCount} times
                      </p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {Math.round(pattern.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  ))}
                  {patterns.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Use tools to detect automation patterns
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tool Marketplace</CardTitle>
                  <CardDescription>Pre-built integrations</CardDescription>
                </div>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {toolDefinitions
                  .filter((def) => def.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((def) => (
                    <Card key={def.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                            <Wrench className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{def.name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">
                              {def.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                          {def.description.substring(0, 80)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{def.installCount} installs</span>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Install
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
              {toolDefinitions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No tools yet</p>
                  <Button onClick={seedMarketplace}>
                    <Plus className="h-4 w-4 mr-2" />
                    Seed Marketplace
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installed Tools */}
        <TabsContent value="installed">
          <Card>
            <CardHeader>
              <CardTitle>My Tools</CardTitle>
              <CardDescription>Manage integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {toolInstances.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Wrench className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{tool.name}</h4>
                        <p className="text-sm text-gray-500">{tool.definition?.category}</p>
                        <div className="flex gap-3 mt-2">
                          <span className="text-xs text-gray-600">{tool.totalCalls} calls</span>
                          <span className="text-xs text-gray-600">
                            {Math.round(
                              ((tool.successfulCalls || 0) / Math.max(tool.totalCalls || 1, 1)) * 100
                            )}
                            % success
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={tool.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {tool.status}
                    </Badge>
                  </div>
                ))}
                {toolInstances.length === 0 && (
                  <p className="text-center text-gray-500 py-12">No tools installed</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows */}
        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Workflows</CardTitle>
                  <CardDescription>Self-orchestrating automation</CardDescription>
                </div>
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Workflow className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{workflow.name}</h4>
                        <div className="flex gap-3 mt-2">
                          <span className="text-xs text-gray-600">{workflow.totalExecutions} runs</span>
                          <span className="text-xs text-gray-600">
                            {Math.round(
                              ((workflow.successfulRuns || 0) / Math.max(workflow.totalExecutions || 1, 1)) * 100
                            )}
                            % success
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge>{workflow.status}</Badge>
                  </div>
                ))}
                {workflows.length === 0 && (
                  <p className="text-center text-gray-500 py-12">No workflows yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Tool Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthMetrics.slice(0, 5).map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {metric.healthScore >= 80 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <p className="text-sm">{metric.instance?.definition?.name || 'Tool'}</p>
                      </div>
                      <p className="text-sm font-bold">{metric.healthScore}/100</p>
                    </div>
                  ))}
                  {healthMetrics.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Click Monitor to analyze</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-blue-600" />
                  Relationships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relationships.slice(0, 5).map((rel, index) => (
                    <div key={index} className="p-2 bg-blue-50 rounded">
                      <p className="text-sm font-medium">{rel.relationshipType}</p>
                      <p className="text-xs text-gray-600">Strength: {rel.strength.toFixed(1)}/10</p>
                    </div>
                  ))}
                  {relationships.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Click Analyze to discover</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
