/**
 * Professional AI Employees - 12 expert roles
 * RE-style cards, provisionable, workflow/campaign integration
 * Accountant, Developer, Legal Assistant, Researcher, etc.
 * Available to ALL users
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mic,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PROFESSIONAL_EMPLOYEE_CONFIGS,
  PROFESSIONAL_EMPLOYEE_TYPES,
  type ProfessionalAIEmployeeType,
} from '@/lib/professional-ai-employees/config';

interface ProvisionedAgent {
  id: string;
  employeeType: string;
  name: string;
  elevenLabsAgentId: string;
  status: string;
  callCount: number;
  createdAt: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', count: 12 },
  { id: 'finance', label: 'Finance', count: 2 },
  { id: 'technology', label: 'Technology', count: 2 },
  { id: 'legal', label: 'Legal', count: 1 },
  { id: 'research', label: 'Research', count: 1 },
  { id: 'marketing', label: 'Marketing', count: 2 },
  { id: 'sales', label: 'Sales', count: 1 },
  { id: 'support', label: 'Support', count: 1 },
  { id: 'hr', label: 'HR', count: 1 },
  { id: 'analytics', label: 'Analytics', count: 1 },
  { id: 'content', label: 'Content', count: 1 },
  { id: 'operations', label: 'Operations', count: 1 },
];

const PROFESSIONAL_EMPLOYEES = PROFESSIONAL_EMPLOYEE_TYPES.map((type) => {
  const config = PROFESSIONAL_EMPLOYEE_CONFIGS[type];
  return {
    id: type,
    name: config.name,
    title: config.title,
    description: config.description,
    fullDescription: config.fullDescription,
    capabilities: config.capabilities,
    icon: config.icon,
    color: config.color,
    bgColor: config.bgColor,
    borderColor: config.borderColor,
    voiceEnabled: config.voiceEnabled,
    priority: config.defaultPriority,
    category: config.category,
  };
});

export function ProfessionalAIEmployees() {
  const [provisionedAgents, setProvisionedAgents] = useState<ProvisionedAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<(typeof PROFESSIONAL_EMPLOYEES)[0] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [runningEmployee, setRunningEmployee] = useState<string | null>(null);
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);

  useEffect(() => {
    fetchProvisionedAgents();
  }, []);

  const fetchProvisionedAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch('/api/professional-ai-employees/provision');
      if (response.ok) {
        const data = await response.json();
        setProvisionedAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch provisioned agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleProvisionAll = async () => {
    setIsProvisioning(true);
    setProvisioningProgress(0);
    try {
      toast.loading('Creating Professional AI agents...', { id: 'provision' });
      const response = await fetch('/api/professional-ai-employees/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: false }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Provisioned ${data.results?.filter((r: { success: boolean }) => r.success).length || 0} Professional AI employees!`, { id: 'provision' });
        setProvisionedAgents(data.agents || []);
      } else {
        toast.error(data.error || 'Failed to provision some agents', { id: 'provision' });
      }
    } catch (error) {
      toast.error('Failed to provision agents', { id: 'provision' });
    } finally {
      setIsProvisioning(false);
      setProvisioningProgress(100);
    }
  };

  const isAgentProvisioned = (employeeId: string) =>
    provisionedAgents.some((a) => a.employeeType === employeeId);

  const getProvisionedAgent = (employeeId: string) =>
    provisionedAgents.find((a) => a.employeeType === employeeId);

  const handleTestAgent = async (employeeId: string) => {
    let agent = getProvisionedAgent(employeeId);
    if (!agent) {
      setTestingAgentId(employeeId);
      try {
        toast.loading('Setting up voice agent...', { id: 'test-agent' });
        const res = await fetch('/api/professional-ai-employees/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeTypes: [employeeId] }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.agents?.length) {
          toast.success('Voice agent ready!', { id: 'test-agent' });
          setProvisionedAgents(data.agents);
          agent = data.agents.find((a: ProvisionedAgent) => a.employeeType === employeeId);
        } else {
          toast.error(data.error || 'Failed to set up agent', { id: 'test-agent' });
        }
      } catch {
        toast.error('Failed to set up agent', { id: 'test-agent' });
      } finally {
        setTestingAgentId(null);
      }
    }
    if (agent?.id) {
      window.location.href = `/dashboard/voice-agents/preview?agentId=${agent.id}`;
    }
  };

  const handleRunEmployee = async (employeeId: string) => {
    setRunningEmployee(employeeId);
    try {
      const agent = getProvisionedAgent(employeeId);
      if (agent?.id) {
        window.location.href = `/dashboard/voice-agents/preview?agentId=${agent.id}`;
      } else {
        toast.info('Provision this agent first to run it');
      }
    } catch {
      toast.error('Failed to run');
    } finally {
      setRunningEmployee(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredEmployees =
    selectedCategory === 'all'
      ? PROFESSIONAL_EMPLOYEES
      : PROFESSIONAL_EMPLOYEES.filter((e) => e.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-purple-400" />
            Professional AI Experts
          </h2>
          <p className="text-slate-400 mt-1">
            12 expert roles with deep domain expertise. Voice + text. Use in workflows and campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
            <Mic className="w-3 h-3 mr-1" />
            {provisionedAgents.length} / 12 Voice Agents
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleProvisionAll}
            disabled={isProvisioning}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isProvisioning ? 'animate-spin' : ''}`} />
            {provisionedAgents.length < 12 ? 'Provision All' : 'Refresh'}
          </Button>
        </div>
      </div>

      {isProvisioning && (
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-purple-300 font-medium">Creating Professional AI Agents...</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Each agent has deep domain expertise. Region configurable (e.g. Quebec for Accountant).
            </p>
            <Progress value={provisioningProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className={selectedCategory === cat.id ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-700 hover:bg-slate-800'}
          >
            {cat.label}
            <Badge variant="secondary" className="ml-2 bg-slate-700">{cat.count}</Badge>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredEmployees.map((employee, index) => {
            const Icon = employee.icon;
            const isRunning = runningEmployee === employee.id;

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`bg-black border-slate-700 hover:border-slate-500 transition-all cursor-pointer group ${employee.borderColor}`}
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowDetailDialog(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${employee.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isAgentProvisioned(employee.id) ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />Ready
                          </Badge>
                        ) : employee.voiceEnabled ? (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                            <AlertCircle className="w-3 h-3 mr-1" />Not Provisioned
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-lg">{employee.name}</h3>
                    <p className="text-sm text-slate-300 mb-2">{employee.title}</p>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{employee.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${getPriorityColor(employee.priority)}`}>{employee.priority}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 p-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunEmployee(employee.id);
                        }}
                        disabled={isRunning}
                      >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-black border-slate-700 max-w-2xl">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedEmployee.color}`}>
                    {(() => {
                      const IconComponent = selectedEmployee.icon;
                      return <IconComponent className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-white">{selectedEmployee.name} - {selectedEmployee.title}</DialogTitle>
                    <DialogDescription className="text-slate-400">{selectedEmployee.fullDescription}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.capabilities.map((c) => (
                      <Badge key={c} variant="outline" className="bg-slate-800 border-slate-600 text-slate-300">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleTestAgent(selectedEmployee.id)}
                    disabled={testingAgentId === selectedEmployee.id}
                  >
                    {testingAgentId === selectedEmployee.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                    Test Voice Agent
                  </Button>
                  <Button variant="outline" onClick={() => handleRunEmployee(selectedEmployee.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Run Now
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
