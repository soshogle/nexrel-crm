/**
 * Real Estate AI Employees Component
 * Shows the 12 specialized RE AI employees
 * Only visible for REAL_ESTATE industry users
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  Home,
  Clock,
  Users,
  FileText,
  Calendar,
  Heart,
  BarChart3,
  TrendingUp,
  Award,
  Search,
  Presentation,
  Phone,
  Mail,
  MessageSquare,
  Play,
  Pause,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Bot,
  Sparkles,
  RefreshCw,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';

// Types for provisioned agents
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

// Real Estate AI Employee definitions - matches REAIEmployeeType enum
const RE_AI_EMPLOYEES = [
  {
    id: 'RE_SPEED_TO_LEAD',
    name: 'Sarah',
    title: 'Speed to Lead Specialist',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    description: 'Instant response to new leads (<60 sec)',
    fullDescription: 'Instantly responds to new real estate inquiries within seconds. Makes immediate calls and sends personalized texts to capture leads before competitors.',
    capabilities: ['Instant lead response', 'DNC verification', 'AI voice calls', 'SMS follow-up', 'Appointment booking'],
    voiceEnabled: true,
    priority: 'URGENT',
    category: 'lead-capture'
  },
  {
    id: 'RE_FSBO_OUTREACH',
    name: 'Michael',
    title: 'FSBO Outreach Specialist',
    icon: Home,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    description: 'DuProprio/FSBO outreach with scripts',
    fullDescription: 'Proactively reaches out to For Sale By Owner listings from DuProprio, FSBO.com, and other sources. Uses consultative approach to convert FSBOs to listings.',
    capabilities: ['FSBO scraping', 'DNC compliance', 'Consultative calls', 'Free CMA offers', 'Objection handling'],
    voiceEnabled: true,
    priority: 'MEDIUM',
    category: 'lead-capture'
  },
  {
    id: 'RE_EXPIRED_OUTREACH',
    name: 'Jessica',
    title: 'Expired Listing Specialist',
    icon: Clock,
    color: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'Contacts expired listing owners',
    fullDescription: 'Contacts owners of expired listings with empathy and a fresh marketing strategy. Identifies why the listing failed and presents solutions.',
    capabilities: ['Expired data import', 'Empathetic scripts', 'Market analysis', 'Pricing strategy', 'Staging recommendations'],
    voiceEnabled: true,
    priority: 'HIGH',
    category: 'lead-capture'
  },
  {
    id: 'RE_COLD_REACTIVATION',
    name: 'Alex',
    title: 'Lead Reactivation Specialist',
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Re-engages cold leads and past clients',
    fullDescription: 'Re-engages cold leads who haven\'t responded in 30+ days. Uses market updates and new listings as conversation starters.',
    capabilities: ['Cold lead detection', 'Market updates', 'New listing alerts', 'Multi-channel outreach', 'Referral requests'],
    voiceEnabled: true,
    priority: 'LOW',
    category: 'lead-capture'
  },
  {
    id: 'RE_DOCUMENT_CHASER',
    name: 'Emma',
    title: 'Document Coordinator',
    icon: FileText,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'Transaction document follow-up',
    fullDescription: 'Follows up on missing documents during transactions. Sends reminders for signatures, inspections, and deadlines.',
    capabilities: ['Document tracking', 'Deadline reminders', 'E-signature requests', 'Notary coordination', 'Closing alerts'],
    voiceEnabled: true,
    priority: 'HIGH',
    category: 'transaction'
  },
  {
    id: 'RE_SHOWING_CONFIRM',
    name: 'David',
    title: 'Showing Coordinator',
    icon: Calendar,
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    description: 'Confirms showings, collects feedback',
    fullDescription: 'Confirms property showings 24 hours and 2 hours before. Handles rescheduling and provides property access instructions.',
    capabilities: ['Showing confirmations', 'Reschedule handling', 'Access instructions', 'Feedback collection', 'Hot buyer alerts'],
    voiceEnabled: true,
    priority: 'HIGH',
    category: 'transaction'
  },
  {
    id: 'RE_SPHERE_NURTURE',
    name: 'Rachel',
    title: 'Relationship Manager',
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    description: 'Past client nurture campaigns',
    fullDescription: 'Maintains relationships with past clients and sphere of influence. Sends market updates, home anniversary cards, and referral requests.',
    capabilities: ['Home anniversaries', 'Market updates', 'Referral requests', 'Holiday outreach', 'Review automation'],
    voiceEnabled: true,
    priority: 'LOW',
    category: 'nurture'
  },
  {
    id: 'RE_BUYER_FOLLOWUP',
    name: 'Chris',
    title: 'Buyer Success Specialist',
    icon: Users,
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
    description: 'Follows up with active buyers',
    fullDescription: 'Keeps buyers engaged, addresses concerns, and moves them toward making confident offers.',
    capabilities: ['Buyer engagement', 'Concern resolution', 'Property matching', 'Offer preparation', 'Financing guidance'],
    voiceEnabled: true,
    priority: 'MEDIUM',
    category: 'transaction'
  },
  {
    id: 'RE_MARKET_UPDATE',
    name: 'Jennifer',
    title: 'Market Intelligence Analyst',
    icon: TrendingUp,
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Personalized market updates',
    fullDescription: 'Provides valuable market insights that position homeowners and buyers for success. Shares price trends and opportunities.',
    capabilities: ['Market analysis', 'Price trends', 'Neighborhood insights', 'Investment tips', 'Timing recommendations'],
    voiceEnabled: true,
    priority: 'MEDIUM',
    category: 'reports'
  },
  {
    id: 'RE_STALE_DIAGNOSTIC',
    name: 'Mark',
    title: 'Listing Health Specialist',
    icon: Search,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: 'Analyzes stuck listings',
    fullDescription: 'Analyzes listings that haven\'t sold after 21+ days. Identifies issues and generates action plans with scripts for seller conversations.',
    capabilities: ['Pricing analysis', 'Photo assessment', 'Description optimization', 'Feedback patterns', 'Price reduction scripts'],
    voiceEnabled: true,
    priority: 'MEDIUM',
    category: 'transaction'
  },
  {
    id: 'RE_LISTING_BOOST',
    name: 'Sophie',
    title: 'Marketing Specialist',
    icon: Presentation,
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    description: 'Promotes listings to buyers',
    fullDescription: 'Generates buyer interest and schedules showings for your listings through targeted outreach.',
    capabilities: ['Buyer targeting', 'Listing promotion', 'Showing scheduling', 'Feature highlighting', 'Urgency creation'],
    voiceEnabled: true,
    priority: 'MEDIUM',
    category: 'reports'
  },
  {
    id: 'RE_CMA_GENERATOR',
    name: 'Daniel',
    title: 'Valuation Specialist',
    icon: BarChart3,
    color: 'from-slate-500 to-gray-500',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    description: 'CMA and property valuation',
    fullDescription: 'Creates and presents comparative market analyses for pricing decisions. Helps sellers understand property value.',
    capabilities: ['CMA generation', 'Comparable analysis', 'Pricing strategy', 'Value explanations', 'Listing recommendations'],
    voiceEnabled: true,
    priority: 'MEDIUM',
    category: 'reports'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Employees', count: 12 },
  { id: 'lead-capture', label: 'Lead Capture', count: 4 },
  { id: 'transaction', label: 'Transaction', count: 4 },
  { id: 'nurture', label: 'Nurture', count: 1 },
  { id: 'reports', label: 'Reports', count: 3 }
];

interface EmployeeStatus {
  id: string;
  isActive: boolean;
  lastRun?: string;
  totalJobs: number;
  successRate: number;
}

export function RealEstateAIEmployees() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<typeof RE_AI_EMPLOYEES[0] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [runningEmployee, setRunningEmployee] = useState<string | null>(null);
  const [employeeStatuses, setEmployeeStatuses] = useState<Record<string, EmployeeStatus>>({});
  
  // Provisioning state
  const [provisionedAgents, setProvisionedAgents] = useState<ProvisionedAgent[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningProgress, setProvisioningProgress] = useState(0);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);

  // Fetch provisioned agents on mount
  useEffect(() => {
    fetchProvisionedAgents();
  }, []);

  const fetchProvisionedAgents = async () => {
    try {
      setIsLoadingAgents(true);
      const response = await fetch('/api/real-estate/ai-employees/provision');
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
      toast.loading('Creating Voice AI agents...', { id: 'provision' });
      
      const response = await fetch('/api/real-estate/ai-employees/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: false })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`Successfully provisioned ${data.results?.filter((r: { success: boolean }) => r.success).length || 0} AI employees!`, { id: 'provision' });
        setProvisionedAgents(data.agents || []);
      } else {
        toast.error(data.error || 'Failed to provision some agents', { id: 'provision' });
      }
    } catch (error) {
      console.error('Provisioning error:', error);
      toast.error('Failed to provision agents', { id: 'provision' });
    } finally {
      setIsProvisioning(false);
      setProvisioningProgress(100);
    }
  };

  const isAgentProvisioned = (employeeId: string): boolean => {
    return provisionedAgents.some(a => a.employeeType === employeeId);
  };

  const getProvisionedAgent = (employeeId: string): ProvisionedAgent | undefined => {
    return provisionedAgents.find(a => a.employeeType === employeeId);
  };

  const handleTestAgent = async (employeeId: string) => {
    let agent = getProvisionedAgent(employeeId);
    if (!agent) {
      setTestingAgentId(employeeId);
      try {
        toast.loading('Setting up voice agent...', { id: 'test-agent' });
        const res = await fetch('/api/real-estate/ai-employees/provision', {
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
      } catch (error) {
        toast.error('Failed to set up agent', { id: 'test-agent' });
      } finally {
        setTestingAgentId(null);
      }
    }
    if (agent?.id) {
      window.location.href = `/dashboard/voice-agents/preview?agentId=${agent.id}`;
    }
  };

  // Filter employees by category
  const filteredEmployees = selectedCategory === 'all' 
    ? RE_AI_EMPLOYEES 
    : RE_AI_EMPLOYEES.filter(e => e.category === selectedCategory);

  const handleRunEmployee = async (employeeId: string) => {
    setRunningEmployee(employeeId);
    try {
      const response = await fetch('/api/ai-employees/real-estate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeType: employeeId })
      });
      
      if (response.ok) {
        toast.success('AI Employee task started!');
      } else {
        throw new Error('Failed to start task');
      }
    } catch (error) {
      toast.error('Failed to run AI Employee');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-purple-400" />
            Real Estate AI Team
          </h2>
          <p className="text-slate-400 mt-1">12 specialized AI employees with OACIQ compliance and multi-language support</p>
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

      {/* Provisioning Progress */}
      {isProvisioning && (
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-purple-300 font-medium">Creating NEXREL Voice AI Agents...</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Each agent is configured with OACIQ compliance, multi-language support, and specialized real estate knowledge.
            </p>
            <Progress value={provisioningProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className={selectedCategory === cat.id 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'border-slate-700 hover:bg-slate-800'
            }
          >
            {cat.label}
            <Badge variant="secondary" className="ml-2 bg-slate-700">{cat.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredEmployees.map((employee, index) => {
            const Icon = employee.icon;
            const status = employeeStatuses[employee.id];
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
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${employee.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isAgentProvisioned(employee.id) ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        ) : employee.voiceEnabled ? (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Provisioned
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {/* Name & Title */}
                    <h3 className="font-bold text-white text-lg">{employee.name}</h3>
                    <p className="text-sm text-slate-300 mb-2">{employee.title}</p>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{employee.description}</p>

                    {/* Priority & Status */}
                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${getPriorityColor(employee.priority)}`}>
                        {employee.priority}
                      </Badge>
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
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-black border-slate-700 max-w-2xl">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedEmployee.color}`}>
                    <selectedEmployee.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-white">
                      {selectedEmployee.name} - {selectedEmployee.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {selectedEmployee.fullDescription}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Capabilities */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.capabilities.map((cap, i) => (
                      <Badge key={i} variant="secondary" className="bg-slate-900 text-slate-200 border border-slate-700">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-400" />
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-white font-medium">Auto-Run</p>
                      <p className="text-xs text-slate-400">Automatically trigger on events</p>
                    </div>
                  </div>
                  <Switch />
                </div>

                {/* Voice Agent Status */}
                {selectedEmployee.voiceEnabled && (
                  <div className={`p-4 rounded-lg border ${
                    isAgentProvisioned(selectedEmployee.id) 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-slate-800/50 border-slate-600'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isAgentProvisioned(selectedEmployee.id) ? (
                          <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-green-400 font-medium">Voice Agent Ready</span></>
                        ) : (
                          <><Mic className="w-4 h-4 text-slate-400" /><span className="text-slate-300 font-medium">Voice Agent</span></>
                        )}
                      </div>
                      {isAgentProvisioned(selectedEmployee.id) && (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          {getProvisionedAgent(selectedEmployee.id)?.callCount || 0} calls
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3">
                      {isAgentProvisioned(selectedEmployee.id)
                        ? 'Voice AI agent configured with OACIQ compliance and multi-language support.'
                        : 'Click Test Agent to set up automatically on first use.'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      onClick={(e) => { e.stopPropagation(); handleTestAgent(selectedEmployee.id); }}
                      disabled={testingAgentId === selectedEmployee.id}
                    >
                      {testingAgentId === selectedEmployee.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Settings className="w-3 h-3 mr-1" />}
                      Test Agent
                    </Button>
                  </div>
                )}
                
                {/* OACIQ Compliance Note */}
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 font-medium">OACIQ Compliant</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    This AI employee follows Quebec real estate regulations (OACIQ). It identifies as an AI assistant, handles personal information according to Law 25, and escalates compliance matters to human agents.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="border-slate-700 text-white hover:bg-slate-800">
                  Close
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    handleRunEmployee(selectedEmployee.id);
                    setShowDetailDialog(false);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Run Now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact version for Real Estate Dashboard
export function RealEstateAITeamWidget() {
  const [runningEmployee, setRunningEmployee] = useState<string | null>(null);

  const handleQuickRun = async (employeeId: string) => {
    setRunningEmployee(employeeId);
    try {
      const response = await fetch('/api/ai-employees/real-estate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeType: employeeId })
      });
      
      if (response.ok) {
        toast.success('Task started!');
      }
    } catch (error) {
      toast.error('Failed to start');
    } finally {
      setRunningEmployee(null);
    }
  };

  // Show top 6 most used employees
  const topEmployees = RE_AI_EMPLOYEES.slice(0, 6);

  return (
    <Card className="bg-black border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            AI Team
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300" asChild>
            <a href="/dashboard/ai-employees?tab=re-team">View All <ChevronRight className="w-4 h-4 ml-1" /></a>
          </Button>
        </div>
        <CardDescription className="text-slate-400">Your automated real estate assistants</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {topEmployees.map((employee) => {
            const Icon = employee.icon;
            const isRunning = runningEmployee === employee.id;

            return (
              <button
                key={employee.id}
                onClick={() => handleQuickRun(employee.id)}
                disabled={isRunning}
                className={`p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 transition-all text-left group`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-slate-300" />
                  {isRunning ? (
                    <Loader2 className="w-3 h-3 animate-spin text-purple-400 ml-auto" />
                  ) : (
                    <Play className="w-3 h-3 text-slate-500 group-hover:text-purple-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <p className="text-sm font-medium text-white">{employee.name}</p>
                <p className="text-xs text-slate-400 truncate">{employee.title}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export { RE_AI_EMPLOYEES };
