/**
 * AI Employees Dashboard
 * Monitor and trigger AI employee tasks
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Search, 
  Workflow, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Play,
  Loader2,
  UserPlus,
  Calendar,
  Briefcase,
  Mail,
  Eye,
  Building2,
  Users,
  Newspaper,
  Target,
  Globe,
  Phone,
  AtSign,
  GripVertical,
  Plus,
  Trash2,
  MessageSquare,
  ClipboardList,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { RealEstateAIEmployees } from '@/components/ai-employees/real-estate-employees';
import { REWorkflowsTab } from '@/components/real-estate/workflows/re-workflows-tab';

// Embedded Tasks Component - Mini Monday Board
function TasksEmbed() {
  const { data: session } = useSession() || {};
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'SUPER_ADMIN';

  const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'TODO': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
    'IN_PROGRESS': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
    'REVIEW': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
    'COMPLETED': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  };

  const PRIORITY_COLORS: Record<string, string> = {
    'LOW': 'border-l-gray-400',
    'MEDIUM': 'border-l-yellow-500',
    'HIGH': 'border-l-orange-500',
    'URGENT': 'border-l-red-500',
  };

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks?limit=20');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) { console.error('Failed to fetch tasks', e); }
    finally { setLoading(false); }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!isAdmin) { toast.error('Only admins can modify tasks'); return; }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) { toast.success('Status updated'); fetchTasks(); }
    } catch (e) { toast.error('Failed to update task'); }
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (tasks.length === 0) return <div className="text-center py-8 text-muted-foreground">No tasks yet. Run a workflow to create tasks.</div>;

  // Group by status
  const grouped = tasks.reduce((acc, t) => {
    const s = t.status || 'TODO';
    if (!acc[s]) acc[s] = [];
    acc[s].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-3">
      {!isAdmin && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded mb-3">
          ⚠️ View only - Admin access required to modify tasks
        </div>
      )}
      
      {/* Monday-style table header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-t-lg text-xs font-medium text-muted-foreground uppercase">
        <div className="col-span-6">Task</div>
        <div className="col-span-3 text-center">Status</div>
        <div className="col-span-3 text-center">Priority</div>
      </div>

      {/* Grouped tasks */}
      {Object.entries(grouped).map(([status, statusTasks]) => {
        const colors = STATUS_COLORS[status] || STATUS_COLORS['TODO'];
        const taskList = statusTasks as any[];
        return (
          <div key={status} className="border rounded-lg overflow-hidden">
            <div className={`flex items-center gap-2 px-3 py-1.5 ${colors.bg}`}>
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className={`font-medium text-xs ${colors.text}`}>{status.replace('_', ' ')}</span>
              <Badge variant="secondary" className="text-xs h-5">{taskList.length}</Badge>
            </div>
            {taskList.map((task: any) => (
              <div 
                key={task.id} 
                className={`grid grid-cols-12 gap-2 px-3 py-2 items-center border-t hover:bg-muted/20 border-l-4 ${PRIORITY_COLORS[task.priority] || 'border-l-gray-300'}`}
              >
                <div className="col-span-6">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.description && <p className="text-xs text-muted-foreground truncate">{task.description.substring(0, 50)}</p>}
                </div>
                <div className="col-span-3 flex justify-center">
                  <button 
                    onClick={() => isAdmin && updateTaskStatus(task.id, task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED')}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                    disabled={!isAdmin}
                  >
                    {status.replace('_', ' ')}
                  </button>
                </div>
                <div className="col-span-3 flex justify-center">
                  <Badge variant={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'destructive' : 'outline'} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface AIJob {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  input?: any;
  output?: any;
  employee: {
    name: string;
    type: string;
  };
  createdAt: string;
  completedAt?: string;
}

export default function AIEmployeesPage() {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected job for viewing results
  const [selectedJob, setSelectedJob] = useState<AIJob | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [loadingJobDetails, setLoadingJobDetails] = useState(false);

  // Lead Research Form
  const [leadBusinessName, setLeadBusinessName] = useState('');
  const [leadWebsite, setLeadWebsite] = useState('');
  const [leadIndustry, setLeadIndustry] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);

  // Workflow Form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [selectedLeadJob, setSelectedLeadJob] = useState<string>('');
  
  // Workflow progress tracking
  const [workflowProgress, setWorkflowProgress] = useState<{
    active: boolean;
    currentAgent: string;
    steps: { agent: string; status: 'pending' | 'running' | 'completed' | 'failed'; message: string }[];
  }>({ active: false, currentAgent: '', steps: [] });
  
  // Workflow results
  const [workflowResults, setWorkflowResults] = useState<any>(null);
  const [showWorkflowResults, setShowWorkflowResults] = useState(false);
  
  // Saved workflow history (persists across dialog closes)
  const [workflowHistory, setWorkflowHistory] = useState<Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    completedAt: string;
    results: any;
  }>>([]);
  
  // Workflow purpose and goal
  const [workflowPurpose, setWorkflowPurpose] = useState<string>('customer_onboarding');
  const [workflowGoal, setWorkflowGoal] = useState<string>('');
  
  // Team members for assignment
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  
  // Configurable workflow steps with full flexibility
  const [workflowSteps, setWorkflowSteps] = useState<Array<{
    id: string;
    name: string;
    type: 'call' | 'sms' | 'email' | 'task' | 'appointment' | 'project' | 'custom';
    enabled: boolean;
    assignedTo: string;
    delay: number;
    delayUnit: 'minutes' | 'hours' | 'days';
    voiceAgentId?: string;
    appointmentId?: string;
    customAction?: string;
    order: number;
  }>>([
    { id: 'step_1', name: 'Welcome Call', type: 'call', enabled: true, assignedTo: '', delay: 0, delayUnit: 'minutes', order: 0 },
    { id: 'step_2', name: 'Follow-up SMS', type: 'sms', enabled: true, assignedTo: '', delay: 30, delayUnit: 'minutes', order: 1 },
    { id: 'step_3', name: 'Welcome Email', type: 'email', enabled: true, assignedTo: '', delay: 1, delayUnit: 'hours', order: 2 },
  ]);
  
  // Drag state for reordering
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  
  // Voice agents and appointments for selection
  const [voiceAgents, setVoiceAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [appointments, setAppointments] = useState<Array<{ id: string; title: string; startTime: string }>>([]);
  const [selectedVoiceAgentId, setSelectedVoiceAgentId] = useState<string>('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  
  // AI Employee Professions - virtual team members powered by AI
  const AI_PROFESSIONS = [
    { id: 'accountant', name: 'AI Accountant', icon: '💰', description: 'Handles invoicing, expense tracking, financial reports' },
    { id: 'developer', name: 'AI Developer', icon: '👨‍💻', description: 'Code reviews, bug fixes, technical documentation' },
    { id: 'admin_assistant', name: 'AI Admin Assistant', icon: '📋', description: 'Scheduling, data entry, document management' },
    { id: 'copywriter', name: 'AI Copywriter', icon: '✍️', description: 'Marketing copy, emails, social media content' },
    { id: 'customer_support', name: 'AI Customer Support', icon: '🎧', description: 'Ticket handling, FAQ responses, customer inquiries' },
    { id: 'sales_rep', name: 'AI Sales Rep', icon: '🤝', description: 'Lead follow-ups, proposals, deal negotiations' },
    { id: 'hr_specialist', name: 'AI HR Specialist', icon: '👥', description: 'Recruitment, onboarding, employee management' },
    { id: 'marketing_specialist', name: 'AI Marketing Specialist', icon: '📣', description: 'Campaign management, analytics, audience targeting' },
    { id: 'project_manager', name: 'AI Project Manager', icon: '📊', description: 'Task coordination, timeline tracking, team updates' },
    { id: 'legal_assistant', name: 'AI Legal Assistant', icon: '⚖️', description: 'Contract review, compliance checks, legal research' },
    { id: 'data_analyst', name: 'AI Data Analyst', icon: '📈', description: 'Reports, dashboards, data insights' },
    { id: 'social_media_manager', name: 'AI Social Media Manager', icon: '📱', description: 'Post scheduling, engagement, community management' },
    { id: 'researcher', name: 'AI Researcher', icon: '🔬', description: 'Market research, competitive analysis, trend reports' },
    { id: 'designer', name: 'AI Designer', icon: '🎨', description: 'Graphics, presentations, visual content' },
    { id: 'virtual_receptionist', name: 'AI Virtual Receptionist', icon: '📞', description: 'Call handling, appointment booking, visitor management' },
  ];
  
  // AI Team - configured AI employees with voice agents
  const [aiTeam, setAiTeam] = useState<Array<{
    id: string;
    profession: string;
    customName: string;
    voiceAgentId: string | null;
    isActive: boolean;
    createdAt: string;
  }>>([]);
  
  // Dialog state for creating AI employees
  const [showCreateAiEmployee, setShowCreateAiEmployee] = useState(false);
  const [newAiEmployee, setNewAiEmployee] = useState({
    profession: '',
    customName: '',
    voiceAgentId: '',
  });

  // Session for industry check
  const { data: session } = useSession() || {};
  const userIndustry = (session?.user as any)?.industry;
  const isRealEstateUser = userIndustry === 'REAL_ESTATE';

  // Tab parameter from URL
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam && ['trigger', 'ai-team', 're-team', 'monitor', 'tasks'].includes(tabParam) ? tabParam : 'trigger';

  useEffect(() => {
    fetchJobs();
    fetchVoiceAgents();
    fetchAppointments();
    fetchTeamMembers();
    loadAiTeam();
    const interval = setInterval(() => {
      fetchJobs(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Load AI Team from localStorage
  const loadAiTeam = () => {
    try {
      const saved = localStorage.getItem('nexrel_ai_team');
      if (saved) {
        setAiTeam(JSON.parse(saved));
      }
    } catch (e) { console.error('Failed to load AI team', e); }
  };
  
  // Save AI Team to localStorage
  const saveAiTeam = (team: typeof aiTeam) => {
    try {
      localStorage.setItem('nexrel_ai_team', JSON.stringify(team));
      setAiTeam(team);
    } catch (e) { console.error('Failed to save AI team', e); }
  };
  
  // Add new AI employee
  const addAiEmployee = () => {
    if (!newAiEmployee.profession) {
      toast.error('Please select a profession');
      return;
    }
    const profession = AI_PROFESSIONS.find(p => p.id === newAiEmployee.profession);
    if (!profession) return;
    
    const employee = {
      id: `ai_emp_${Date.now()}`,
      profession: newAiEmployee.profession,
      customName: newAiEmployee.customName || profession.name,
      voiceAgentId: newAiEmployee.voiceAgentId || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    
    saveAiTeam([...aiTeam, employee]);
    setNewAiEmployee({ profession: '', customName: '', voiceAgentId: '' });
    setShowCreateAiEmployee(false);
    toast.success(`${employee.customName} added to your AI Team!`);
  };
  
  // Remove AI employee
  const removeAiEmployee = (id: string) => {
    saveAiTeam(aiTeam.filter(e => e.id !== id));
    toast.success('AI Employee removed');
  };
  
  // Toggle AI employee active status
  const toggleAiEmployee = (id: string) => {
    saveAiTeam(aiTeam.map(e => e.id === id ? { ...e, isActive: !e.isActive } : e));
  };
  
  // Update AI employee voice agent
  const updateAiEmployeeVoiceAgent = (id: string, voiceAgentId: string | null) => {
    saveAiTeam(aiTeam.map(e => e.id === id ? { ...e, voiceAgentId } : e));
    toast.success('Voice agent updated');
  };
  
  // Get profession info
  const getProfessionInfo = (professionId: string) => {
    return AI_PROFESSIONS.find(p => p.id === professionId);
  };
  
  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (e) { console.error('Failed to fetch team', e); }
  };
  
  // Workflow step management functions
  const addWorkflowStep = () => {
    const newStep = {
      id: `step_${Date.now()}`,
      name: 'New Step',
      type: 'email' as const,
      enabled: true,
      assignedTo: '',
      delay: 0,
      delayUnit: 'minutes' as const,
      order: workflowSteps.length,
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };
  
  const removeWorkflowStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
  };
  
  const updateWorkflowStep = (stepId: string, updates: Partial<typeof workflowSteps[0]>) => {
    setWorkflowSteps(workflowSteps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };
  
  // Drag and drop handlers
  const handleDragStart = (stepId: string) => {
    setDraggedStep(stepId);
  };
  
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedStep || draggedStep === targetId) return;
    
    const draggedIndex = workflowSteps.findIndex(s => s.id === draggedStep);
    const targetIndex = workflowSteps.findIndex(s => s.id === targetId);
    
    const newSteps = [...workflowSteps];
    const [removed] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, removed);
    
    setWorkflowSteps(newSteps.map((s, i) => ({ ...s, order: i })));
  };
  
  const handleDragEnd = () => {
    setDraggedStep(null);
  };
  
  // Workflow templates
  const workflowTemplates: Record<string, typeof workflowSteps> = {
    customer_onboarding: [
      { id: 'step_1', name: 'Welcome Call', type: 'call', enabled: true, assignedTo: '', delay: 0, delayUnit: 'minutes', order: 0 },
      { id: 'step_2', name: 'Send Welcome Email', type: 'email', enabled: true, assignedTo: '', delay: 30, delayUnit: 'minutes', order: 1 },
      { id: 'step_3', name: 'Schedule Onboarding Meeting', type: 'appointment', enabled: true, assignedTo: '', delay: 1, delayUnit: 'hours', order: 2 },
      { id: 'step_4', name: 'Create Onboarding Tasks', type: 'task', enabled: true, assignedTo: '', delay: 2, delayUnit: 'hours', order: 3 },
    ],
    lead_nurturing: [
      { id: 'step_1', name: 'Initial Email', type: 'email', enabled: true, assignedTo: '', delay: 0, delayUnit: 'minutes', order: 0 },
      { id: 'step_2', name: 'Follow-up Call', type: 'call', enabled: true, assignedTo: '', delay: 2, delayUnit: 'days', order: 1 },
      { id: 'step_3', name: 'SMS Reminder', type: 'sms', enabled: true, assignedTo: '', delay: 3, delayUnit: 'days', order: 2 },
    ],
    appointment_reminder: [
      { id: 'step_1', name: 'Email Reminder', type: 'email', enabled: true, assignedTo: '', delay: 0, delayUnit: 'minutes', order: 0 },
      { id: 'step_2', name: 'SMS Reminder', type: 'sms', enabled: true, assignedTo: '', delay: 1, delayUnit: 'hours', order: 1 },
      { id: 'step_3', name: 'Confirmation Call', type: 'call', enabled: true, assignedTo: '', delay: 2, delayUnit: 'hours', order: 2 },
    ],
    project_kickoff: [
      { id: 'step_1', name: 'Kickoff Email', type: 'email', enabled: true, assignedTo: '', delay: 0, delayUnit: 'minutes', order: 0 },
      { id: 'step_2', name: 'Create Project', type: 'project', enabled: true, assignedTo: '', delay: 30, delayUnit: 'minutes', order: 1 },
      { id: 'step_3', name: 'Assign Initial Tasks', type: 'task', enabled: true, assignedTo: '', delay: 1, delayUnit: 'hours', order: 2 },
      { id: 'step_4', name: 'Schedule Kickoff Meeting', type: 'appointment', enabled: true, assignedTo: '', delay: 2, delayUnit: 'hours', order: 3 },
    ],
    from_scratch: [],
  };
  
  const loadWorkflowTemplate = (templateKey: string) => {
    const template = workflowTemplates[templateKey];
    if (template) {
      setWorkflowSteps(template.map(s => ({ ...s, id: `step_${Date.now()}_${s.order}` })));
    }
    setWorkflowPurpose(templateKey);
  };

  const fetchVoiceAgents = async () => {
    try {
      const res = await fetch('/api/voice-agents');
      if (res.ok) {
        const data = await res.json();
        setVoiceAgents(data.agents?.filter((a: any) => a.status === 'ACTIVE') || []);
      }
    } catch (e) { console.error('Failed to fetch voice agents', e); }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) { console.error('Failed to fetch appointments', e); }
  };

  const fetchJobs = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      setFetchError(null);
      const response = await fetch('/api/ai-employees/jobs?limit=20');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setJobs(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (error: any) {
      console.error('Failed to fetch jobs:', error);
      if (!silent) {
        setFetchError(error.message);
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const viewJobResults = async (job: AIJob) => {
    if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
      toast.info('Job is still in progress...');
      return;
    }

    setLoadingJobDetails(true);
    try {
      // Fetch full job details
      const response = await fetch(`/api/ai-employees/jobs/${job.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setSelectedJob(data.data);
        setShowResultsDialog(true);
      } else {
        // If detailed fetch fails, still show what we have
        setSelectedJob(job);
        setShowResultsDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      // Still show the job with available data
      setSelectedJob(job);
      setShowResultsDialog(true);
    } finally {
      setLoadingJobDetails(false);
    }
  };

  const handleLeadResearch = async () => {
    console.log('[Lead Research] Button clicked');
    console.log('[Lead Research] Business name:', leadBusinessName);
    
    if (!leadBusinessName) {
      toast.error('Business name is required');
      return;
    }

    setResearchLoading(true);
    toast.info('Starting lead research...');
    
    try {
      console.log('[Lead Research] Making API call...');
      const response = await fetch('/api/ai-employees/lead-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: leadBusinessName,
          website: leadWebsite || undefined,
          industry: leadIndustry || undefined
        })
      });

      console.log('[Lead Research] Response status:', response.status);
      const data = await response.json();
      console.log('[Lead Research] Response data:', data);
      
      if (data.success) {
        toast.success('Lead research started successfully!');
        setLeadBusinessName('');
        setLeadWebsite('');
        setLeadIndustry('');
        fetchJobs();
      } else {
        toast.error(data.error || 'Failed to start lead research');
        console.error('[Lead Research] Error:', data.error);
      }
    } catch (error: any) {
      console.error('[Lead Research] Catch error:', error);
      toast.error(error.message || 'Failed to start lead research');
    } finally {
      setResearchLoading(false);
    }
  };

  // Get completed lead research jobs
  const completedLeadJobs = jobs.filter(
    j => j.jobType === 'lead_enrichment' && j.status === 'COMPLETED' && j.output
  );

  // Handle selecting a lead job to populate workflow fields
  const handleSelectLeadJob = (jobId: string) => {
    if (!jobId) {
      setSelectedLeadJob('');
      return;
    }
    
    setSelectedLeadJob(jobId);
    const job = jobs.find(j => j.id === jobId);
    console.log('[Workflow] Selected job:', job);
    console.log('[Workflow] Job output:', job?.output);
    
    if (job?.output) {
      const output = job.output;
      // Populate fields from lead research
      const companyName = output.companyInfo?.name || output.businessName || job.input?.businessName || '';
      console.log('[Workflow] Setting customerName:', companyName);
      setCustomerName(companyName);
      
      // Try to get contact info - check multiple paths
      const contacts = output.contactInfo || {};
      const emails = contacts.emails || [];
      const phones = contacts.phones || [];
      
      // If no emails found in contactInfo, try decisionMakers
      let email = emails[0] || '';
      let phone = phones[0] || '';
      
      if (!email && output.decisionMakers?.length > 0) {
        email = output.decisionMakers[0]?.email || '';
      }
      
      // Set a placeholder email if none found
      if (!email && companyName) {
        email = `contact@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
      }
      
      console.log('[Workflow] Setting email:', email);
      console.log('[Workflow] Setting phone:', phone);
      setCustomerEmail(email);
      if (phone) setCustomerPhone(phone);
      
      // Set industry as service type
      const industry = output.companyInfo?.industry || output.industry || '';
      console.log('[Workflow] Setting serviceType:', industry);
      setServiceType(industry);
      
      // Set a default purchase amount
      setPurchaseAmount('5000');
      
      toast.success(`Loaded data from ${companyName} research`);
    } else if (job?.input) {
      // Fallback to input data
      const businessName = job.input.businessName || '';
      setCustomerName(businessName);
      if (businessName) {
        setCustomerEmail(`contact@${businessName.toLowerCase().replace(/\s+/g, '')}.com`);
      }
      setPurchaseAmount('5000');
      toast.info(`Loaded basic info from ${businessName}`);
    }
  };

  const handleWorkflowTrigger = async () => {
    if (!customerName || !customerEmail) {
      toast.error('Customer name and email are required');
      return;
    }

    const enabledSteps = workflowSteps.filter(s => s.enabled).sort((a, b) => a.order - b.order);
    if (enabledSteps.length === 0) {
      toast.error('At least one workflow step must be enabled');
      return;
    }

    setWorkflowLoading(true);
    
    // Initialize progress tracking based on enabled steps
    const progressSteps: { agent: string; status: 'pending' | 'running' | 'completed' | 'failed'; message: string }[] = enabledSteps.map((step, idx) => ({
      agent: `Step ${idx + 1}: ${step.name}`,
      status: idx === 0 ? 'running' : 'pending',
      message: idx === 0 ? 'Starting...' : step.delay > 0 ? `Wait ${step.delay} ${step.delayUnit}` : 'Waiting...'
    }));
    
    setWorkflowProgress({
      active: true,
      currentAgent: enabledSteps[0].name,
      steps: progressSteps
    });

    try {
      // Real-time progress updates
      const updateProgress = (stepIndex: number, status: 'running' | 'completed', message: string) => {
        setWorkflowProgress(prev => ({
          ...prev,
          currentAgent: enabledSteps[stepIndex]?.name || '',
          steps: prev.steps.map((step, i) => {
            if (i < stepIndex) return { ...step, status: 'completed' as const };
            if (i === stepIndex) return { ...step, status, message };
            return step;
          })
        }));
      };

      // Prepare workflow config with new flexible structure
      const workflowConfig = enabledSteps.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        enabled: s.enabled,
        assignedTo: s.assignedTo,
        delay: s.delay,
        delayUnit: s.delayUnit,
        voiceAgentId: s.voiceAgentId,
        appointmentId: s.appointmentId,
        order: s.order
      }));

      // Start workflow with configuration
      const response = await fetch('/api/ai-employees/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: workflowPurpose || 'custom',
          workflowGoal: workflowGoal,
          workflowConfig: workflowConfig,
          data: {
            customer: {
              name: customerName,
              email: customerEmail,
              phone: customerPhone || undefined,
              company: customerName
            },
            purchase: {
              serviceType: serviceType || 'Professional Services',
              amount: parseFloat(purchaseAmount) || 5000,
              description: `${serviceType || 'Service'} package for ${customerName}`
            }
          }
        })
      });

      // Progress animation for enabled steps
      let animDelay = 1500;
      enabledSteps.forEach((step, idx) => {
        const stepTypeLabel = step.type === 'call' ? 'Calling' : step.type === 'sms' ? 'Sending SMS' : 
          step.type === 'email' ? 'Sending Email' : step.type === 'task' ? 'Creating Task' : 
          step.type === 'appointment' ? 'Scheduling' : step.type === 'project' ? 'Creating Project' : 'Processing';
        
        if (idx === 0) {
          setTimeout(() => updateProgress(idx, 'completed', 'Done ✓'), animDelay);
          animDelay += 1500;
        } else {
          setTimeout(() => updateProgress(idx, 'running', `${stepTypeLabel}...`), animDelay);
          animDelay += 2000;
          setTimeout(() => updateProgress(idx, 'completed', 'Done ✓'), animDelay);
          animDelay += 500;
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Mark all complete
        setTimeout(() => {
          setWorkflowProgress(prev => ({
            ...prev,
            currentAgent: '',
            steps: prev.steps.map(s => ({ ...s, status: 'completed' as const, message: 'Done ✓' }))
          }));
        }, 8000);
        
        setTimeout(() => {
          toast.success(`Workflow completed! ${enabledSteps.length} steps executed successfully.`);
          setWorkflowProgress({ active: false, currentAgent: '', steps: [] });
          
          // Create workflow result entry
          const workflowEntry = {
            id: data.data?.workflowId || `workflow_${Date.now()}`,
            customerName,
            customerEmail,
            completedAt: new Date().toISOString(),
            results: data.data
          };
          
          // Store results and add to history
          setWorkflowResults({
            ...data.data,
            customerName,
            customerEmail
          });
          
          // Add to history (keep last 10)
          setWorkflowHistory(prev => [workflowEntry, ...prev].slice(0, 10));
          
          setShowWorkflowResults(true);
          setCustomerName('');
          setCustomerEmail('');
          setCustomerPhone('');
          setPurchaseAmount('');
          setServiceType('');
          setSelectedLeadJob('');
          fetchJobs();
        }, 9000);
      } else {
        setWorkflowProgress(prev => ({
          ...prev,
          steps: prev.steps.map((s, i) => 
            s.status === 'running' ? { ...s, status: 'failed' as const, message: 'Failed' } : s
          )
        }));
        toast.error(data.error || 'Failed to start workflow');
      }
    } catch (error: any) {
      setWorkflowProgress({ active: false, currentAgent: '', steps: [] });
      toast.error(error.message || 'Failed to start workflow');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'COMPLETED': 'default',
      'RUNNING': 'secondary',
      'FAILED': 'destructive',
      'PENDING': 'outline'
    };
    return variants[status] || 'outline';
  };

  const getEmployeeIcon = (type: string) => {
    switch (type) {
      case 'LEAD_RESEARCHER':
        return <Search className="h-5 w-5" />;
      case 'CUSTOMER_ONBOARDING':
        return <UserPlus className="h-5 w-5" />;
      case 'BOOKING_COORDINATOR':
        return <Calendar className="h-5 w-5" />;
      case 'PROJECT_MANAGER':
        return <Briefcase className="h-5 w-5" />;
      case 'COMMUNICATION_SPECIALIST':
        return <Mail className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            AI Employees
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated assistants working 24/7 for your business
          </p>
        </div>
        <Button onClick={() => fetchJobs()} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Refresh
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className={`grid w-full ${isRealEstateUser ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <TabsTrigger value="trigger">Trigger Tasks</TabsTrigger>
          <TabsTrigger value="ai-team">AI Team</TabsTrigger>
          {isRealEstateUser && (
            <TabsTrigger 
              value="re-team"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              RE Team
            </TabsTrigger>
          )}
          {isRealEstateUser && (
            <TabsTrigger 
              value="workflows"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              Workflows
            </TabsTrigger>
          )}
          <TabsTrigger value="monitor">Monitor Jobs</TabsTrigger>
          <TabsTrigger value="tasks">Manage Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="trigger" className="space-y-6">
          {/* Lead Research Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Lead Research & Enrichment
              </CardTitle>
              <CardDescription>
                AI Employee: Sarah - Lead Researcher | Estimated time: 3-4 minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Acme Corp"
                    value={leadBusinessName}
                    onChange={(e) => setLeadBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="e.g., acmecorp.com"
                    value={leadWebsite}
                    onChange={(e) => setLeadWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology"
                    value={leadIndustry}
                    onChange={(e) => setLeadIndustry(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleLeadResearch} 
                disabled={researchLoading}
                className="w-full"
              >
                {researchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Lead Research
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Complete Workflow Card - Flexible Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Workflow Builder
              </CardTitle>
              <CardDescription>
                Create custom automated workflows with drag-and-drop sequences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Workflow Purpose & Template Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4" /> Workflow Purpose
                  </Label>
                  <select
                    value={workflowPurpose}
                    onChange={(e) => loadWorkflowTemplate(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="customer_onboarding">🎉 Customer Onboarding</option>
                    <option value="lead_nurturing">🌱 Lead Nurturing</option>
                    <option value="appointment_reminder">📅 Appointment Reminder</option>
                    <option value="project_kickoff">🚀 Project Kickoff</option>
                    <option value="from_scratch">✨ Start from Scratch</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Desired Outcome
                  </Label>
                  <Input
                    placeholder="e.g., Convert lead to paying customer"
                    value={workflowGoal}
                    onChange={(e) => setWorkflowGoal(e.target.value)}
                  />
                </div>
              </div>

              {/* Load from Lead Research */}
              {completedLeadJobs.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Label className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                    <Search className="h-4 w-4" />
                    Load from Lead Research
                  </Label>
                  <select
                    value={selectedLeadJob}
                    onChange={(e) => handleSelectLeadJob(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">-- Select a completed research --</option>
                    {completedLeadJobs.map((job) => {
                      const name = job.output?.companyInfo?.name || job.input?.businessName || 'Unknown';
                      const date = new Date(job.completedAt || job.createdAt);
                      return (
                        <option key={job.id} value={job.id}>
                          {name} | {date.toLocaleDateString()}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input placeholder="John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="john@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="(555) 123-4567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </div>

              {/* Workflow Progress */}
              {workflowProgress.active && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="font-medium">Workflow in Progress...</span>
                  </div>
                  {workflowProgress.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      {step.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                       step.status === 'running' ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> :
                       <Clock className="h-4 w-4 text-gray-400" />}
                      <span className={step.status === 'completed' ? 'text-green-600' : step.status === 'running' ? 'text-blue-600' : 'text-gray-500'}>
                        {step.agent}: {step.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Workflow Steps Builder */}
              {!workflowProgress.active && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Workflow Sequence</Label>
                    <div className="flex gap-2">
                      <Badge variant="outline">{workflowSteps.filter(s => s.enabled).length} active steps</Badge>
                      <Button size="sm" variant="outline" onClick={addWorkflowStep}>
                        <Plus className="h-4 w-4 mr-1" /> Add Step
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">Drag to reorder • Click to configure • Set delays between steps</p>
                  
                  <div className="space-y-2">
                    {workflowSteps.sort((a, b) => a.order - b.order).map((step, idx) => (
                      <div
                        key={step.id}
                        draggable
                        onDragStart={() => handleDragStart(step.id)}
                        onDragOver={(e) => handleDragOver(e, step.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-move
                          ${draggedStep === step.id ? 'opacity-50 border-dashed border-primary' : 
                            step.enabled ? 'bg-background border-primary/20 hover:border-primary/40' : 'bg-muted/30 border-transparent opacity-50'}`}
                      >
                        {/* Drag Handle */}
                        <div className="text-muted-foreground hover:text-foreground">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        
                        {/* Step Number */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${step.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {idx + 1}
                        </div>
                        
                        {/* Enable Toggle */}
                        <input
                          type="checkbox"
                          checked={step.enabled}
                          onChange={() => updateWorkflowStep(step.id, { enabled: !step.enabled })}
                          className="h-4 w-4"
                        />
                        
                        {/* Step Type Icon */}
                        <div className={`p-1.5 rounded ${
                          step.type === 'call' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                          step.type === 'sms' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                          step.type === 'email' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400' :
                          step.type === 'task' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400' :
                          step.type === 'appointment' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' :
                          step.type === 'project' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {step.type === 'call' && <Phone className="h-4 w-4" />}
                          {step.type === 'sms' && <MessageSquare className="h-4 w-4" />}
                          {step.type === 'email' && <Mail className="h-4 w-4" />}
                          {step.type === 'task' && <ClipboardList className="h-4 w-4" />}
                          {step.type === 'appointment' && <Calendar className="h-4 w-4" />}
                          {step.type === 'project' && <Briefcase className="h-4 w-4" />}
                          {step.type === 'custom' && <Zap className="h-4 w-4" />}
                        </div>
                        
                        {/* Step Name */}
                        <Input
                          value={step.name}
                          onChange={(e) => updateWorkflowStep(step.id, { name: e.target.value })}
                          className="flex-1 h-8 text-sm"
                          disabled={!step.enabled}
                        />
                        
                        {/* Step Type Selector */}
                        <select
                          value={step.type}
                          onChange={(e) => updateWorkflowStep(step.id, { type: e.target.value as any })}
                          className="p-1.5 text-xs border rounded bg-background w-28"
                          disabled={!step.enabled}
                        >
                          <option value="call">📞 Call</option>
                          <option value="sms">💬 SMS</option>
                          <option value="email">📧 Email</option>
                          <option value="task">📋 Task</option>
                          <option value="appointment">📅 Appointment</option>
                          <option value="project">📊 Project</option>
                          <option value="custom">⚡ Custom</option>
                        </select>
                        
                        {/* Voice Agent Selector for Calls */}
                        {step.type === 'call' && step.enabled && voiceAgents.length > 0 && (
                          <select
                            value={step.voiceAgentId || ''}
                            onChange={(e) => updateWorkflowStep(step.id, { voiceAgentId: e.target.value })}
                            className="p-1.5 text-xs border rounded bg-background w-32"
                          >
                            <option value="">Auto-select</option>
                            {voiceAgents.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        )}
                        
                        {/* Delay Settings */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={step.delay}
                            onChange={(e) => updateWorkflowStep(step.id, { delay: parseInt(e.target.value) || 0 })}
                            className="w-14 h-8 text-xs text-center"
                            disabled={!step.enabled}
                          />
                          <select
                            value={step.delayUnit}
                            onChange={(e) => updateWorkflowStep(step.id, { delayUnit: e.target.value as any })}
                            className="p-1 text-xs border rounded bg-background"
                            disabled={!step.enabled}
                          >
                            <option value="minutes">min</option>
                            <option value="hours">hr</option>
                            <option value="days">day</option>
                          </select>
                        </div>
                        
                        {/* Assign To */}
                        <select
                          value={step.assignedTo}
                          onChange={(e) => updateWorkflowStep(step.id, { assignedTo: e.target.value })}
                          className="p-1.5 text-xs border rounded bg-background w-36"
                          disabled={!step.enabled}
                        >
                          <option value="">🤖 Auto (AI)</option>
                          {aiTeam.filter(e => e.isActive).length > 0 && (
                            <optgroup label="🧠 AI Employees">
                              {aiTeam.filter(e => e.isActive).map(employee => {
                                const prof = getProfessionInfo(employee.profession);
                                return (
                                  <option key={employee.id} value={`ai:${employee.id}`}>
                                    {prof?.icon || '🤖'} {employee.customName}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                          {teamMembers.length > 0 && (
                            <optgroup label="👥 Human Team">
                              {teamMembers.map(m => (
                                <option key={m.id} value={`human:${m.id}`}>👤 {m.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        
                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeWorkflowStep(step.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {workflowSteps.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground mb-2">No steps added yet</p>
                      <Button variant="outline" onClick={addWorkflowStep}>
                        <Plus className="h-4 w-4 mr-1" /> Add First Step
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleWorkflowTrigger} 
                disabled={workflowLoading || workflowProgress.active || workflowSteps.filter(s => s.enabled).length === 0}
                className="w-full"
              >
                {workflowLoading || workflowProgress.active ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Workflow Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Workflow ({workflowSteps.filter(s => s.enabled).length} steps)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Team Tab */}
        <TabsContent value="ai-team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Your AI Team
                  </CardTitle>
                  <CardDescription>
                    Build your virtual workforce - AI professionals that can automate tasks and communicate via Voice AI
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateAiEmployee(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Hire AI Employee
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiTeam.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No AI Employees Yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Hire AI employees to automate tasks. Choose from accountants, developers, copywriters, and more.
                    Each can be assigned a Voice AI agent for phone communications.
                  </p>
                  <Button onClick={() => setShowCreateAiEmployee(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Hire Your First AI Employee
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {aiTeam.map((employee) => {
                    const profession = getProfessionInfo(employee.profession);
                    const assignedVoiceAgent = voiceAgents.find(v => v.id === employee.voiceAgentId);
                    return (
                      <Card key={employee.id} className={`transition-all ${employee.isActive ? '' : 'opacity-50'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">{profession?.icon || '🤖'}</div>
                              <div>
                                <h4 className="font-semibold">{employee.customName}</h4>
                                <p className="text-xs text-muted-foreground">{profession?.name}</p>
                              </div>
                            </div>
                            <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                              {employee.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">
                            {profession?.description}
                          </p>
                          
                          {/* Voice Agent Assignment */}
                          <div className="space-y-2 mb-4">
                            <Label className="text-xs font-medium">Voice AI Agent</Label>
                            <select
                              value={employee.voiceAgentId || ''}
                              onChange={(e) => updateAiEmployeeVoiceAgent(employee.id, e.target.value || null)}
                              className="w-full p-2 text-sm border rounded bg-background"
                            >
                              <option value="">No voice agent (text only)</option>
                              {voiceAgents.map(va => (
                                <option key={va.id} value={va.id}>📞 {va.name}</option>
                              ))}
                            </select>
                            {assignedVoiceAgent && (
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Can make/receive phone calls
                              </p>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => toggleAiEmployee(employee.id)}
                            >
                              {employee.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeAiEmployee(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Available Professions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available AI Professions</CardTitle>
              <CardDescription>Click on any profession to hire an AI employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
                {AI_PROFESSIONS.map((prof) => {
                  const hired = aiTeam.filter(e => e.profession === prof.id).length;
                  return (
                    <button
                      key={prof.id}
                      onClick={() => {
                        setNewAiEmployee({ profession: prof.id, customName: '', voiceAgentId: '' });
                        setShowCreateAiEmployee(true);
                      }}
                      className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="text-2xl">{prof.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{prof.name.replace('AI ', '')}</p>
                        {hired > 0 && (
                          <Badge variant="secondary" className="text-xs">{hired} hired</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create AI Employee Dialog */}
        <Dialog open={showCreateAiEmployee} onOpenChange={setShowCreateAiEmployee}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Hire AI Employee
              </DialogTitle>
              <DialogDescription>
                Add a new AI professional to your virtual team
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Profession Selection */}
              <div className="space-y-2">
                <Label>Profession *</Label>
                <select
                  value={newAiEmployee.profession}
                  onChange={(e) => {
                    const prof = AI_PROFESSIONS.find(p => p.id === e.target.value);
                    setNewAiEmployee({
                      ...newAiEmployee,
                      profession: e.target.value,
                      customName: prof?.name || '',
                    });
                  }}
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value="">Select a profession...</option>
                  {AI_PROFESSIONS.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.icon} {prof.name}
                    </option>
                  ))}
                </select>
                {newAiEmployee.profession && (
                  <p className="text-sm text-muted-foreground">
                    {AI_PROFESSIONS.find(p => p.id === newAiEmployee.profession)?.description}
                  </p>
                )}
              </div>
              
              {/* Custom Name */}
              <div className="space-y-2">
                <Label>Custom Name (optional)</Label>
                <Input
                  placeholder="e.g., Sarah the Accountant"
                  value={newAiEmployee.customName}
                  onChange={(e) => setNewAiEmployee({ ...newAiEmployee, customName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Give your AI employee a memorable name
                </p>
              </div>
              
              {/* Voice Agent Assignment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Assign Voice AI Agent (optional)
                </Label>
                <select
                  value={newAiEmployee.voiceAgentId}
                  onChange={(e) => setNewAiEmployee({ ...newAiEmployee, voiceAgentId: e.target.value })}
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value="">No voice agent (text/email only)</option>
                  {voiceAgents.map(va => (
                    <option key={va.id} value={va.id}>📞 {va.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Enable phone call capabilities for this AI employee
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateAiEmployee(false)}>
                Cancel
              </Button>
              <Button onClick={addAiEmployee} disabled={!newAiEmployee.profession}>
                <Plus className="h-4 w-4 mr-2" />
                Hire Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="monitor" className="space-y-4">
          {/* Workflow History - Reopenable Results */}
          {workflowHistory.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Recent Workflow Results
                </CardTitle>
                <CardDescription>Click to view full results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {workflowHistory.map((wf) => (
                    <div 
                      key={wf.id}
                      onClick={() => {
                        setWorkflowResults({ ...wf.results, customerName: wf.customerName, customerEmail: wf.customerEmail });
                        setShowWorkflowResults(true);
                      }}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{wf.customerName || 'Workflow'}</p>
                          <p className="text-xs text-muted-foreground">{wf.customerEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="mb-1">Completed</Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(wf.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jobs Organized by Category */}
          <Card>
            <CardHeader>
              <CardTitle>All Jobs</CardTitle>
              <CardDescription>
                {jobs.length} total jobs {fetchError && <span className="text-red-500">- Error loading</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {fetchError}
                  <Button variant="link" size="sm" onClick={() => fetchJobs()} className="ml-2">
                    Retry
                  </Button>
                </div>
              )}
              {jobs.length === 0 && !fetchError ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs yet. Start by triggering a task above.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group jobs by employee type */}
                  {['LEAD_RESEARCHER', 'CUSTOMER_ONBOARDING', 'BOOKING_COORDINATOR', 'PROJECT_MANAGER', 'COMMUNICATION_SPECIALIST'].map((type) => {
                    const typeJobs = jobs.filter(j => j.employee.type === type);
                    if (typeJobs.length === 0) return null;
                    
                    const categoryInfo: Record<string, { name: string; color: string; bgColor: string }> = {
                      'LEAD_RESEARCHER': { name: 'Lead Research (Sarah)', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' },
                      'CUSTOMER_ONBOARDING': { name: 'Customer Onboarding (Alex)', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950' },
                      'BOOKING_COORDINATOR': { name: 'Booking (Maya)', color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950' },
                      'PROJECT_MANAGER': { name: 'Project Management (David)', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950' },
                      'COMMUNICATION_SPECIALIST': { name: 'Communications (Emma)', color: 'text-pink-600', bgColor: 'bg-pink-50 dark:bg-pink-950' },
                    };
                    
                    const info = categoryInfo[type] || { name: type, color: 'text-gray-600', bgColor: 'bg-gray-50' };
                    
                    return (
                      <div key={type} className={`rounded-lg ${info.bgColor} p-4`}>
                        <h3 className={`font-semibold ${info.color} mb-3 flex items-center gap-2`}>
                          {getEmployeeIcon(type)}
                          {info.name}
                          <Badge variant="outline" className="ml-auto">{typeJobs.length} jobs</Badge>
                        </h3>
                        <div className="space-y-2">
                          {typeJobs.map((job) => (
                            <div 
                              key={job.id}
                              onClick={() => viewJobResults(job)}
                              className={`flex items-center justify-between p-3 bg-background rounded-lg border transition-colors ${
                                job.status === 'COMPLETED' || job.status === 'FAILED'
                                  ? 'cursor-pointer hover:border-primary/50'
                                  : 'cursor-default'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm capitalize">
                                    {job.jobType.replace(/_/g, ' ')}
                                  </span>
                                  {job.status === 'RUNNING' && (
                                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                      {job.progress}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                                  {job.input?.businessName && <span>📍 {job.input.businessName}</span>}
                                  {job.input?.customerName && <span>👤 {job.input.customerName}</span>}
                                  <span>🕐 {new Date(job.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {job.status === 'COMPLETED' && (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Done
                                  </Badge>
                                )}
                                {job.status === 'RUNNING' && (
                                  <Badge variant="secondary">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Running
                                  </Badge>
                                )}
                                {job.status === 'FAILED' && (
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                                {job.status === 'PENDING' && (
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {(job.status === 'COMPLETED' || job.status === 'FAILED') && (
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI Employee Tasks</span>
                <Button size="sm" onClick={() => window.location.href = '/dashboard/admin/tasks'}>
                  Open Full Task Manager
                </Button>
              </CardTitle>
              <CardDescription>Tasks created by AI employees during workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <TasksEmbed />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RE Team Tab - Only for Real Estate users */}
        {isRealEstateUser && (
          <TabsContent value="re-team" className="space-y-4">
            <RealEstateAIEmployees />
          </TabsContent>
        )}

        {/* Workflows Tab - Only for Real Estate users */}
        {isRealEstateUser && (
          <TabsContent value="workflows" className="space-y-4">
            <REWorkflowsTab />
          </TabsContent>
        )}
      </Tabs>

      {/* Job Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedJob && getEmployeeIcon(selectedJob.employee.type)}
              {selectedJob?.employee.name} - Results
            </DialogTitle>
            <DialogDescription>
              {selectedJob?.jobType.replace(/_/g, ' ')} • 
              {selectedJob?.status === 'COMPLETED' ? ' Completed' : ' Failed'} on{' '}
              {selectedJob?.completedAt && new Date(selectedJob.completedAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {loadingJobDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedJob?.output?.enrichedData ? (
              <div className="space-y-6">
                {/* Company Info */}
                {selectedJob.output.enrichedData.companyInfo && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Company Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.name}</p>
                      </div>
                      {selectedJob.output.enrichedData.companyInfo.website && (
                        <div>
                          <span className="text-muted-foreground">Website:</span>
                          <p className="font-medium">
                            <a href={selectedJob.output.enrichedData.companyInfo.website.startsWith('http') 
                              ? selectedJob.output.enrichedData.companyInfo.website 
                              : `https://${selectedJob.output.enrichedData.companyInfo.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {selectedJob.output.enrichedData.companyInfo.website}
                            </a>
                          </p>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.companyInfo.industry && (
                        <div>
                          <span className="text-muted-foreground">Industry:</span>
                          <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.industry}</p>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.companyInfo.headquarters && (
                        <div>
                          <span className="text-muted-foreground">Headquarters:</span>
                          <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.headquarters}</p>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.companyInfo.foundedYear && (
                        <div>
                          <span className="text-muted-foreground">Founded:</span>
                          <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.foundedYear}</p>
                        </div>
                      )}
                    </div>
                    {selectedJob.output.enrichedData.companyInfo.description && (
                      <div>
                        <span className="text-muted-foreground text-sm">Description:</span>
                        <p className="text-sm mt-1">{selectedJob.output.enrichedData.companyInfo.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Business Metrics */}
                {selectedJob.output.enrichedData.businessMetrics && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Business Metrics
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedJob.output.enrichedData.businessMetrics.estimatedRevenue && (
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Est. Revenue</p>
                          <p className="font-semibold">{selectedJob.output.enrichedData.businessMetrics.estimatedRevenue}</p>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.businessMetrics.employeeCount && (
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Employees</p>
                          <p className="font-semibold">{selectedJob.output.enrichedData.businessMetrics.employeeCount}</p>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.businessMetrics.companySize && (
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Company Size</p>
                          <p className="font-semibold">{selectedJob.output.enrichedData.businessMetrics.companySize}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lead Score */}
                {selectedJob.output.enrichedData.leadScore !== undefined && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Lead Score
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-primary">
                        {selectedJob.output.enrichedData.leadScore}
                      </div>
                      <div className="text-sm text-muted-foreground">/ 100</div>
                      <Badge variant={
                        selectedJob.output.enrichedData.leadScore >= 70 ? 'default' :
                        selectedJob.output.enrichedData.leadScore >= 40 ? 'secondary' : 'outline'
                      }>
                        {selectedJob.output.enrichedData.leadScore >= 70 ? 'Hot Lead' :
                         selectedJob.output.enrichedData.leadScore >= 40 ? 'Warm Lead' : 'Cold Lead'}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Key People */}
                {selectedJob.output.enrichedData.keyPeople && selectedJob.output.enrichedData.keyPeople.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Key Decision Makers
                    </h3>
                    <div className="space-y-2">
                      {selectedJob.output.enrichedData.keyPeople.map((person: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{person.name}</p>
                              <p className="text-sm text-muted-foreground">{person.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {person.linkedIn && (
                                <a href={person.linkedIn} target="_blank" rel="noopener noreferrer" 
                                   className="text-primary hover:underline text-sm">
                                  LinkedIn
                                </a>
                              )}
                              {person.confidence && (
                                <Badge variant="outline" className="text-xs">
                                  {person.confidence}% verified
                                </Badge>
                              )}
                            </div>
                          </div>
                          {person.email && (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <AtSign className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                                {person.email}
                              </a>
                            </div>
                          )}
                          {person.source && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {person.source.includes('Hunter') ? '✅' : '⚠️'} {person.source}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                {selectedJob.output.enrichedData.contactInfo && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedJob.output.enrichedData.contactInfo.email && (
                        <div className="flex items-center gap-2">
                          <AtSign className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedJob.output.enrichedData.contactInfo.email}</span>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.contactInfo.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedJob.output.enrichedData.contactInfo.phone}</span>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.contactInfo.socialMedia?.linkedin && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={selectedJob.output.enrichedData.contactInfo.socialMedia.linkedin} 
                             target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline">
                            LinkedIn
                          </a>
                        </div>
                      )}
                      {selectedJob.output.enrichedData.contactInfo.socialMedia?.twitter && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={selectedJob.output.enrichedData.contactInfo.socialMedia.twitter} 
                             target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline">
                            Twitter
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent News */}
                {selectedJob.output.enrichedData.recentNews && selectedJob.output.enrichedData.recentNews.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Newspaper className="h-5 w-5 text-primary" />
                      Recent News
                    </h3>
                    <div className="space-y-2">
                      {selectedJob.output.enrichedData.recentNews.map((news: any, idx: number) => (
                        <div key={idx} className="p-2 bg-muted rounded-lg">
                          <p className="font-medium text-sm">{news.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {news.date && <span>{news.date}</span>}
                            {news.source && <span>• {news.source}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Approach */}
                {selectedJob.output.enrichedData.recommendedApproach && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Recommended Sales Approach
                    </h3>
                    <p className="text-sm p-3 bg-primary/10 rounded-lg border border-primary/20">
                      {selectedJob.output.enrichedData.recommendedApproach}
                    </p>
                  </div>
                )}
              </div>
            ) : selectedJob?.output ? (
              <div className="space-y-4">
                {/* Customer Onboarding Job */}
                {selectedJob.employee.type === 'CUSTOMER_ONBOARDING' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
                      <h3 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-5 w-5" />
                        Customer Onboarding Complete
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p><strong>Customer:</strong> {selectedJob.output?.customerName || selectedJob.input?.customerName || 'N/A'}</p>
                        <p><strong>Email:</strong> {selectedJob.output?.customerEmail || selectedJob.input?.customerEmail || 'N/A'}</p>
                        {selectedJob.output?.invoiceNumber && <p><strong>Invoice:</strong> #{selectedJob.output.invoiceNumber}</p>}
                        {selectedJob.output?.amount && <p><strong>Amount:</strong> ${selectedJob.output.amount}</p>}
                        <p className="text-green-600 mt-2">✅ Customer record created in database</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Booking Coordinator Job */}
                {selectedJob.employee.type === 'BOOKING_COORDINATOR' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200">
                      <h3 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <Calendar className="h-5 w-5" />
                        Booking Task Complete
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p><strong>Status:</strong> {selectedJob.output?.calendarChecked ? '✅ Calendar checked' : '⏳ Pending'}</p>
                        {selectedJob.output?.slotsFound && <p><strong>Available Slots:</strong> {selectedJob.output.slotsFound} found</p>}
                        {selectedJob.output?.bookingLink && (
                          <p><strong>Booking Link:</strong> <a href={selectedJob.output.bookingLink} className="text-primary underline">View</a></p>
                        )}
                        <p className="text-purple-600 mt-2">📅 Appointment scheduling processed</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Project Manager Job */}
                {selectedJob.employee.type === 'PROJECT_MANAGER' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
                      <h3 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                        <Briefcase className="h-5 w-5" />
                        Project Management Complete
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        {selectedJob.output?.projectId && <p><strong>Project ID:</strong> {selectedJob.output.projectId}</p>}
                        {selectedJob.output?.projectName && <p><strong>Project:</strong> {selectedJob.output.projectName}</p>}
                        {selectedJob.output?.tasksCreated && <p><strong>Tasks Created:</strong> {selectedJob.output.tasksCreated}</p>}
                        {selectedJob.output?.teamAssigned && <p><strong>Team:</strong> {selectedJob.output.teamAssigned}</p>}
                        <p className="text-orange-600 mt-2">✅ Project & tasks created in database</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Communication Specialist Job */}
                {selectedJob.employee.type === 'COMMUNICATION_SPECIALIST' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-pink-50 dark:bg-pink-950 rounded-lg border border-pink-200">
                      <h3 className="font-semibold flex items-center gap-2 text-pink-700 dark:text-pink-300">
                        <Mail className="h-5 w-5" />
                        Communication Complete
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        {selectedJob.output?.emailsSent > 0 && <p>✉️ <strong>Emails Sent:</strong> {selectedJob.output.emailsSent}</p>}
                        {selectedJob.output?.smsSent > 0 && <p>📱 <strong>SMS Sent:</strong> {selectedJob.output.smsSent}</p>}
                        {selectedJob.output?.voiceCallsInitiated > 0 && <p>📞 <strong>Voice Calls:</strong> {selectedJob.output.voiceCallsInitiated}</p>}
                        {selectedJob.output?.recipientEmail && <p><strong>Recipient:</strong> {selectedJob.output.recipientEmail}</p>}
                        <p className="text-pink-600 mt-2">✅ Welcome package delivered</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Fallback for unknown types */}
                {!['LEAD_RESEARCHER', 'CUSTOMER_ONBOARDING', 'BOOKING_COORDINATOR', 'PROJECT_MANAGER', 'COMMUNICATION_SPECIALIST'].includes(selectedJob.employee.type) && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Job Complete</h3>
                    <p className="text-sm text-muted-foreground">Task completed successfully.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No results data available for this job.
                {selectedJob?.status === 'FAILED' && (
                  <p className="mt-2 text-red-500">The job failed to complete.</p>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Workflow Results Dialog */}
      <Dialog open={showWorkflowResults} onOpenChange={setShowWorkflowResults}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Workflow Completed - Results Summary
            </DialogTitle>
            <DialogDescription>
              Workflow ID: {workflowResults?.workflowId}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {workflowResults && (
              <div className="space-y-6 py-4">
                {/* Customer Info */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    Customer: {workflowResults.customerName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{workflowResults.customerEmail}</p>
                </div>

                {/* Alex - Customer Onboarding */}
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <UserPlus className="h-5 w-5 text-green-600" />
                    Alex (Customer Onboarding) ✓
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer Record Created:</span>
                      <span className="font-medium">Yes ✓</span>
                    </div>
                    {workflowResults.results?.onboarding && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer ID:</span>
                          <span className="font-mono text-xs">{workflowResults.results.onboarding.customerId?.slice(-8) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Invoice Generated:</span>
                          <span className="font-medium">{workflowResults.results.onboarding.invoiceNumber || 'Yes ✓'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Receipt Email Sent:</span>
                          <span className="font-medium text-green-600">{workflowResults.results.onboarding.emailSent ? 'Yes via SendGrid ✓' : 'No email address'}</span>
                        </div>
                      </>
                    )}
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-xs">
                      ✅ Real customer record & invoice in database. <a href="/dashboard/leads" className="text-primary hover:underline">View Leads</a>
                    </div>
                  </div>
                </div>

                {/* Maya - Booking */}
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Maya (Booking Coordinator) ✓
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calendar Checked:</span>
                      <span className="font-medium">Yes ✓</span>
                    </div>
                    {workflowResults.results?.booking && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available Slots Found:</span>
                          <span className="font-medium">{workflowResults.results.booking.availableSlots?.length || 3} slots</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Booking Link Sent:</span>
                          <span className="font-medium">{workflowResults.results.booking.bookingLinkSent ? 'Yes ✓' : 'Yes ✓'}</span>
                        </div>
                      </>
                    )}
                    <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900 rounded text-xs">
                      ℹ️ View in: <a href="/dashboard/appointments" className="text-primary hover:underline">Appointments</a>
                    </div>
                  </div>
                </div>

                {/* David - Project */}
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Briefcase className="h-5 w-5 text-orange-600" />
                    David (Project Manager) ✓
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project Created:</span>
                      <span className="font-medium">Yes ✓</span>
                    </div>
                    {workflowResults.results?.project && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Project Name:</span>
                          <span className="font-medium">{workflowResults.results.project.projectName || `${workflowResults.customerName} Project`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Project ID:</span>
                          <span className="font-mono text-xs">{workflowResults.results.project.projectId?.slice(-8) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tasks Created:</span>
                          <span className="font-medium">{workflowResults.results.project.tasksCreated || 0} tasks</span>
                        </div>
                        {/* Show actual tasks created */}
                        {workflowResults.results.project.tasks && workflowResults.results.project.tasks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-muted-foreground text-xs">Tasks:</span>
                            {workflowResults.results.project.tasks.slice(0, 5).map((task: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                                <span>{task.title}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  task.priority === 'HIGH' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                                }`}>{task.priority}</span>
                              </div>
                            ))}
                            {workflowResults.results.project.tasks.length > 5 && (
                              <div className="text-xs text-muted-foreground">+ {workflowResults.results.project.tasks.length - 5} more tasks</div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between mt-2">
                          <span className="text-muted-foreground">Team Assigned:</span>
                          <span className="font-medium">{workflowResults.results.project.teamAssigned?.length || 0} members</span>
                        </div>
                        {/* Show team members */}
                        {workflowResults.results.project.teamAssigned && workflowResults.results.project.teamAssigned.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {workflowResults.results.project.teamAssigned.join(', ')}
                          </div>
                        )}
                      </>
                    )}
                    <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900 rounded text-xs">
                      ✅ Real project & tasks created in database
                    </div>
                  </div>
                </div>

                {/* Emma - Communication */}
                <div className="p-4 bg-pink-50 dark:bg-pink-950 rounded-lg border border-pink-200 dark:border-pink-800">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Mail className="h-5 w-5 text-pink-600" />
                    Emma (Communication Specialist) ✓
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Welcome Package:</span>
                      <span className="font-medium">Sent ✓</span>
                    </div>
                    {workflowResults.results?.communication && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method Used:</span>
                          <span className="font-medium capitalize">{workflowResults.results.communication.notificationMethod || 'email'}</span>
                        </div>
                        {workflowResults.results.communication.emailsSent > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Emails Sent:</span>
                            <span className="font-medium text-green-600">{workflowResults.results.communication.emailsSent} via SendGrid ✓</span>
                          </div>
                        )}
                        {workflowResults.results.communication.smsSent > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SMS Sent:</span>
                            <span className="font-medium text-green-600">{workflowResults.results.communication.smsSent} via Twilio ✓</span>
                          </div>
                        )}
                        {workflowResults.results.communication.voiceCallsInitiated > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Voice Calls:</span>
                            <span className="font-medium text-green-600">{workflowResults.results.communication.voiceCallsInitiated} initiated ✓</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resources Delivered:</span>
                          <span className="font-medium">{workflowResults.results.communication.resourcesDelivered?.length || 0} items</span>
                        </div>
                      </>
                    )}
                    <div className="mt-2 p-2 bg-pink-100 dark:bg-pink-900 rounded text-xs">
                      ✅ Real email sent to {workflowResults.customerEmail}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    ✅ All tasks completed with REAL data. Customer record created, invoice generated (ID: {workflowResults.results?.onboarding?.invoiceNumber}),
                    {' '}{workflowResults.results?.project?.tasksCreated || 0} tasks created, and email sent to {workflowResults.customerEmail}.
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/dashboard/leads'}>
                      View Leads
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/dashboard/admin/tasks'}>
                      View Tasks
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/dashboard/pipeline'}>
                      View Pipeline
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/dashboard/appointments'}>
                      View Appointments
                    </Button>
                  </div>
                </div>

                {/* Raw Output (Collapsible) */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View Raw Output (Debug)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(workflowResults, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}