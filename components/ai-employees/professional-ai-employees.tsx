/**
 * Professional AI Employees - 12 expert roles
 * RE-style cards, provisionable, workflow/campaign integration
 * Accountant, Developer, Legal Assistant, Researcher, etc.
 * Available to ALL users
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mic,
  Settings,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PROFESSIONAL_EMPLOYEE_CONFIGS,
  PROFESSIONAL_EMPLOYEE_TYPES,
  type ProfessionalAIEmployeeType,
} from '@/lib/professional-ai-employees/config';
import { TaskDashboardDialog } from '@/components/ai-employees/task-dashboard-dialog';
import { ConnectPhoneDialog } from '@/components/shared/connect-phone-dialog';
import PurchasePhoneNumberDialog from '@/components/voice-agents/purchase-phone-number-dialog';

interface ProvisionedAgent {
  id: string;
  employeeType: string;
  name: string;
  elevenLabsAgentId: string;
  twilioPhoneNumber?: string;
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

const ADMIN_ROLES = ['SUPER_ADMIN', 'AGENCY_ADMIN', 'BUSINESS_OWNER', 'ADMIN'];

export function ProfessionalAIEmployees() {
  const { data: session } = useSession();
  const isAdmin = ADMIN_ROLES.includes((session?.user as any)?.role || '');
  const [provisionedAgents, setProvisionedAgents] = useState<ProvisionedAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<(typeof PROFESSIONAL_EMPLOYEES)[0] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [runningEmployee, setRunningEmployee] = useState<string | null>(null);
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);
  const [showTaskDashboard, setShowTaskDashboard] = useState(false);
  const [showConnectPhone, setShowConnectPhone] = useState(false);
  const [connectPhoneEmployee, setConnectPhoneEmployee] = useState<(typeof PROFESSIONAL_EMPLOYEES)[0] | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [phoneRefreshTrigger, setPhoneRefreshTrigger] = useState(0);

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
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.agents?.length) {
          toast.success('Voice agent ready!', { id: 'test-agent' });
          setProvisionedAgents(data.agents);
          agent = data.agents.find((a: ProvisionedAgent) => a.employeeType === employeeId);
        } else {
          const errMsg = data.error || data.message || (res.status === 401 ? 'Please sign in' : 'Failed to set up agent');
          toast.error(errMsg, { id: 'test-agent', duration: 6000 });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Network or server error';
        toast.error(`Failed to set up agent: ${msg}`, { id: 'test-agent', duration: 6000 });
      } finally {
        setTestingAgentId(null);
      }
    }
    if (agent?.id) {
      const params = new URLSearchParams({
        agentId: agent.id,
        returnTo: 'ai-employees',
        agentName: agent.name || '',
      });
      window.location.href = `/dashboard/voice-agents/preview?${params.toString()}`;
    }
  };

  const handleRunEmployee = async (employeeId: string) => {
    setRunningEmployee(employeeId);
    try {
      const agent = getProvisionedAgent(employeeId);
      if (agent?.id) {
        const params = new URLSearchParams({
          agentId: agent.id,
          returnTo: 'ai-employees',
          agentName: agent.name || '',
        });
        window.location.href = `/dashboard/voice-agents/preview?${params.toString()}`;
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
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-purple-600" />
            Professional AI Experts
          </h2>
          <p className="text-gray-600 mt-1">
            12 expert roles with deep domain expertise. Voice + text. Use in workflows and campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            <Mic className="w-3 h-3 mr-1" />
            {provisionedAgents.length} / 12 Voice Agents
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProvisionedAgents}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className={selectedCategory === cat.id ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-200 hover:bg-purple-50'}
          >
            {cat.label}
            <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">{cat.count}</Badge>
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
                  className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
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
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />Ready
                          </Badge>
                        ) : employee.voiceEnabled ? (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                            <AlertCircle className="w-3 h-3 mr-1" />Not Provisioned
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">{employee.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{employee.title}</p>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{employee.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${getPriorityColor(employee.priority)}`}>{employee.priority}</Badge>
                      <div className="flex items-center gap-1">
                        {isAgentProvisioned(employee.id) && employee.voiceEnabled && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConnectPhoneEmployee(employee); setShowConnectPhone(true); }}
                            className={`p-2 rounded-lg ${getProvisionedAgent(employee.id)?.twilioPhoneNumber ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-purple-50'}`}
                            title={getProvisionedAgent(employee.id)?.twilioPhoneNumber ? 'Change phone' : 'Connect phone'}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-600 hover:bg-purple-50 p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunEmployee(employee.id);
                          }}
                          disabled={isRunning}
                        >
                          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-white border-2 border-purple-200/50 max-w-2xl">
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
                    <DialogTitle className="text-xl text-gray-900">{selectedEmployee.name} - {selectedEmployee.title}</DialogTitle>
                    <DialogDescription className="text-gray-600">{selectedEmployee.fullDescription}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.capabilities.map((c) => (
                      <Badge key={c} variant="outline" className="bg-purple-50 text-gray-700 border-purple-200">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleTestAgent(selectedEmployee.id)}
                    disabled={testingAgentId === selectedEmployee.id}
                  >
                    {testingAgentId === selectedEmployee.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                    Talk to {selectedEmployee.name}
                  </Button>
                  {isAgentProvisioned(selectedEmployee.id) && (
                    <Button
                      variant="outline"
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      onClick={() => setShowTaskDashboard(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Tasks
                    </Button>
                  )}
                  <p className="text-xs text-gray-500 w-full">Talk opens voice conversation. Manage Tasks: toggles, history.</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PurchasePhoneNumberDialog
        open={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onSuccess={() => {
          setShowPurchaseDialog(false);
          setPhoneRefreshTrigger((n) => n + 1);
          fetchProvisionedAgents();
        }}
      />
      {connectPhoneEmployee && (
        <ConnectPhoneDialog
          open={showConnectPhone}
          onOpenChange={(open) => { if (!open) setConnectPhoneEmployee(null); setShowConnectPhone(open); }}
          agent={{
            source: 'professional',
            agentName: connectPhoneEmployee.name,
            employeeType: connectPhoneEmployee.id,
            currentPhone: getProvisionedAgent(connectPhoneEmployee.id)?.twilioPhoneNumber,
          }}
          onSuccess={() => {
            fetchProvisionedAgents();
            setShowConnectPhone(false);
            setConnectPhoneEmployee(null);
          }}
          onPurchaseClick={() => { setShowConnectPhone(false); setConnectPhoneEmployee(null); setShowPurchaseDialog(true); }}
        />
      )}
      {selectedEmployee && getProvisionedAgent(selectedEmployee.id)?.id && (
        <TaskDashboardDialog
          open={showTaskDashboard}
          onOpenChange={setShowTaskDashboard}
          agentId={getProvisionedAgent(selectedEmployee.id)!.id}
          agentName={selectedEmployee.name}
          employeeType={selectedEmployee.id}
          source="professional"
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
