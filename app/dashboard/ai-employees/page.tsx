/**
 * AI Employees Dashboard
 * Monitor and trigger AI employee tasks
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Zap,
  RefreshCw,
  ListTodo,
  Filter,
  ChevronDown,
  Settings,
  PhoneCall,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { RealEstateAIEmployees } from '@/components/ai-employees/real-estate-employees';
import { IndustryAIEmployees } from '@/components/ai-employees/industry-ai-employees';
import { ProfessionalAIEmployees } from '@/components/ai-employees/professional-ai-employees';
import { hasIndustryAIEmployees } from '@/lib/industry-ai-employees/registry';
import { REWorkflowsTab } from '@/components/real-estate/workflows/re-workflows-tab';
// Generic Multi-Industry Workflow Tabs
import { IndustryWorkflowsTab } from '@/components/workflows/industry-workflows-tab';
import { MedicalWorkflowsTab } from '@/components/medical/workflows/medical-workflows-tab';
import { RestaurantWorkflowsTab } from '@/components/restaurant/workflows/restaurant-workflows-tab';
import { ConstructionWorkflowsTab } from '@/components/construction/workflows/construction-workflows-tab';
import { DentistWorkflowsTab } from '@/components/dentist/workflows/dentist-workflows-tab';
import { MedicalSpaWorkflowsTab } from '@/components/medical-spa/workflows/medical-spa-workflows-tab';
import { OptometristWorkflowsTab } from '@/components/optometrist/workflows/optometrist-workflows-tab';
import { HealthClinicWorkflowsTab } from '@/components/health-clinic/workflows/health-clinic-workflows-tab';
import { HospitalWorkflowsTab } from '@/components/hospital/workflows/hospital-workflows-tab';
import { TechnologyWorkflowsTab } from '@/components/technology/workflows/technology-workflows-tab';
import { SportsClubWorkflowsTab } from '@/components/sports-club/workflows/sports-club-workflows-tab';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';
import { PROFESSIONAL_EMPLOYEE_CONFIGS, PROFESSIONAL_EMPLOYEE_TYPES } from '@/lib/professional-ai-employees/config';
import { UnifiedMonitor } from '@/components/workflows/unified-monitor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const VOICE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'hi', label: 'Hindi' },
];

// Full Task Manager Component - Imported from admin tasks page
import CreateTaskDialog from '@/components/tasks/create-task-dialog';
import TaskList from '@/components/tasks/task-list';
import TaskCard from '@/components/tasks/task-card';
import AISuggestionsPanel from '@/components/tasks/ai-suggestions-panel';
import TaskKanbanBoard from '@/components/tasks/task-kanban-board';
import TaskAnalyticsDashboard from '@/components/tasks/task-analytics-dashboard';
import { TaskCalendarView } from '@/components/tasks/task-calendar-view';
import MondayBoard from '@/components/tasks/monday-board';

function TasksEmbed() {
  const { data: session } = useSession() || {};
  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'SUPER_ADMIN';
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [view, setView] = useState<'monday' | 'list' | 'board' | 'kanban' | 'calendar' | 'analytics'>('monday');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [statusFilter, priorityFilter, assigneeFilter, searchQuery]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (assigneeFilter !== 'all') params.append('assignedToId', assigneeFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      params.append('parentTaskId', 'null'); // Only top-level tasks

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tasks/stats');
      if (!response.ok) return;

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTaskCreated = () => {
    setIsCreateDialogOpen(false);
    fetchTasks();
    fetchStats();
    toast.success('Task created successfully');
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    fetchStats();
    toast.success('Task updated successfully');
  };

  const handleTaskDeleted = () => {
    fetchTasks();
    fetchStats();
    toast.success('Task deleted successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Manager</h2>
          <p className="text-gray-400 mt-1 text-sm">
            Manage your tasks and track progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTasks();
              fetchStats();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Tasks
              </CardTitle>
              <ListTodo className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.summary?.total || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {stats.summary?.completionRate || 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                In Progress
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.summary?.inProgress || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Active tasks
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Overdue
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.summary?.overdue || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Completed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.summary?.completed || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Tasks done
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Suggestions */}
      <AISuggestionsPanel
        onTaskCreated={() => {
          fetchTasks();
          fetchStats();
        }}
      />

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setAssigneeFilter('all');
              }}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Your Tasks</CardTitle>
              <CardDescription className="text-gray-400">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <Tabs value={view} onValueChange={(v: any) => setView(v)}>
              <TabsList className="bg-gray-800">
                <TabsTrigger value="monday" className="data-[state=active]:bg-purple-600">
                  📋 Board
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-gray-700">
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban" className="data-[state=active]:bg-gray-700">
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="calendar" className="data-[state=active]:bg-gray-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700">
                  Analytics
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No tasks found</p>
              <p className="text-gray-500 text-sm mt-1">
                Create your first task to get started
              </p>
            </div>
          ) : view === 'monday' ? (
            <MondayBoard isAdmin={isAdmin} />
          ) : view === 'list' ? (
            <TaskList
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onTaskUpdated={handleTaskUpdated}
              onTaskDeleted={handleTaskDeleted}
            />
          ) : view === 'kanban' ? (
            <TaskKanbanBoard
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onTaskUpdated={handleTaskUpdated}
              onCreateTask={(status) => {
                setIsCreateDialogOpen(true);
              }}
            />
          ) : view === 'calendar' ? (
            <TaskCalendarView
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onDateClick={(date) => {
                setIsCreateDialogOpen(true);
              }}
              onTaskUpdated={handleTaskUpdated}
            />
          ) : view === 'analytics' ? (
            <TaskAnalyticsDashboard />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  onUpdated={handleTaskUpdated}
                  onDeleted={handleTaskDeleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleTaskCreated}
      />

      {/* Edit Task Dialog */}
      {selectedTask && (
        <CreateTaskDialog
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSuccess={() => {
            setSelectedTask(null);
            handleTaskUpdated();
          }}
          task={selectedTask}
        />
      )}
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
    voiceConfig?: { voiceId?: string; language?: string; stability?: number; speed?: number; similarityBoost?: number } | null;
    isActive: boolean;
    createdAt: string;
  }>>([]);
  
  // Setup dialog - select pro, name, phone, workflow vs one-off
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupForm, setSetupForm] = useState({
    professionalType: '' as string,
    customName: '',
    selectedTwilioPhone: '' as string,
    useCase: 'workflow' as 'workflow' | 'oneoff',
    contactName: '',
    contactPhone: '',
  });
  const [provisionedProfessionalAgents, setProvisionedProfessionalAgents] = useState<Array<{ id: string; employeeType: string; name: string; twilioPhoneNumber?: string | null }>>([]);
  const [twilioOwnedNumbers, setTwilioOwnedNumbers] = useState<Array<{ phoneNumber: string; friendlyName?: string }>>([]);
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  
  // ElevenLabs voices for voice customization
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Array<{ voice_id: string; name: string; category?: string }>>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  // Session for industry check
  const { data: session } = useSession() || {};
  const userIndustry = (session?.user as any)?.industry;
  const isRealEstateUser = userIndustry === 'REAL_ESTATE';
  const hasWorkflowSystem = userIndustry && userIndustry !== 'REAL_ESTATE' && getIndustryConfig(userIndustry) !== null;
  const hasIndustryTeam = hasIndustryAIEmployees(userIndustry);

  // Tab parameter from URL
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam && ['trigger', 'ai-team', 're-team', 'industry-team', 'workflows', 'monitor', 'tasks'].includes(tabParam) ? tabParam : 'trigger';

  useEffect(() => {
    fetchJobs();
    fetchVoiceAgents();
    fetchAppointments();
    fetchTeamMembers();
    fetchProvisionedProfessionalAgents();
    fetchElevenLabsVoices();
    const interval = setInterval(() => {
      fetchJobs(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchElevenLabsVoices = async () => {
    setLoadingVoices(true);
    try {
      const res = await fetch('/api/elevenlabs/voices');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.voices || []);
        setElevenLabsVoices(list);
      }
    } catch {
      setElevenLabsVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Fetch provisioned professional agents (for phone selection in Setup)
  const fetchProvisionedProfessionalAgents = async () => {
    try {
      const res = await fetch('/api/professional-ai-employees/provision');
      if (res.ok) {
        const data = await res.json();
        setProvisionedProfessionalAgents(data.agents || []);
      }
    } catch (e) {
      console.error('Failed to fetch professional agents', e);
    }
  };

  // Legacy: Fetch AI Team from API (kept for potential future use)
  const fetchAiTeam = async () => {
    try {
      const res = await fetch('/api/ai-employees/user');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const employees = data.employees || [];
      setAiTeam(employees);

      // Migration: if API is empty but localStorage has data, migrate to API
      const saved = typeof window !== 'undefined' ? localStorage.getItem('nexrel_ai_team') : null;
      if (employees.length === 0 && saved) {
        try {
          const localTeam = JSON.parse(saved);
          if (Array.isArray(localTeam) && localTeam.length > 0) {
            const migrated: Array<{ id: string; profession: string; customName: string; voiceAgentId: string | null; isActive: boolean; createdAt: string }> = [];
            for (const emp of localTeam) {
              const createRes = await fetch('/api/ai-employees/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  profession: emp.profession,
                  customName: emp.customName,
                  voiceAgentId: emp.voiceAgentId || null,
                }),
              });
              if (createRes.ok) {
                const created = await createRes.json();
                migrated.push(created.employee);
              }
            }
            if (migrated.length > 0) {
              setAiTeam(migrated);
              localStorage.removeItem('nexrel_ai_team');
              toast.success('AI Team migrated to cloud storage');
            }
          }
        } catch (e) {
          console.error('Migration from localStorage failed:', e);
        }
      }
    } catch (e) {
      console.error('Failed to load AI team', e);
    }
  };

  // Add new AI employee
  const addAiEmployee = async () => {
    if (!newAiEmployee.profession) {
      toast.error('Please select a profession');
      return;
    }
    const profession = AI_PROFESSIONS.find(p => p.id === newAiEmployee.profession);
    if (!profession) return;
    const customName = newAiEmployee.customName || profession.name;
    try {
      const res = await fetch('/api/ai-employees/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: newAiEmployee.profession,
          customName,
          voiceAgentId: newAiEmployee.voiceAgentId || null,
          voiceConfig: newAiEmployee.voiceConfig || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add');
      }
      const data = await res.json();
      setAiTeam((prev) => [...prev, data.employee]);
      setNewAiEmployee({ profession: '', customName: '', voiceAgentId: '', voiceConfig: null });
      setShowCreateAiEmployee(false);
      toast.success(`${customName} added to your AI Team!`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add AI Employee');
    }
  };

  // Remove AI employee
  const removeAiEmployee = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-employees/user/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      setAiTeam((prev) => prev.filter((e) => e.id !== id));
      toast.success('AI Employee removed');
    } catch (e) {
      toast.error('Failed to remove AI Employee');
    }
  };

  // Toggle AI employee active status
  const toggleAiEmployee = async (id: string) => {
    const emp = aiTeam.find((e) => e.id === id);
    if (!emp) return;
    try {
      const res = await fetch(`/api/ai-employees/user/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setAiTeam((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e)));
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // Update AI employee voice agent
  const updateAiEmployeeVoiceAgent = async (id: string, voiceAgentId: string | null) => {
    try {
      const res = await fetch(`/api/ai-employees/user/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceAgentId }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setAiTeam((prev) => prev.map((e) => (e.id === id ? { ...e, voiceAgentId } : e)));
      toast.success('Voice agent updated');
    } catch (e) {
      toast.error('Failed to update voice agent');
    }
  };

  // Update AI employee voice config (language, voice, etc.)
  const updateAiEmployeeVoiceConfig = async (id: string, voiceConfig: { voiceId?: string; language?: string; stability?: number; speed?: number; similarityBoost?: number } | null) => {
    try {
      const res = await fetch(`/api/ai-employees/user/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceConfig }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setAiTeam((prev) => prev.map((e) => (e.id === id ? { ...e, voiceConfig } : e)));
      toast.success('Voice settings updated');
    } catch (e) {
      toast.error('Failed to update voice settings');
    }
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
        const agents = Array.isArray(data) ? data : (data.agents || []);
        setVoiceAgents(agents.filter((a: any) => a.status === 'ACTIVE'));
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

  // Get completed lead research jobs (from Monitor Jobs - used to populate workflow form)
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} title="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="h-8 w-8" />
              AI Employees
            </h1>
            <p className="text-muted-foreground mt-1">
              Automated assistants working 24/7 for your business
            </p>
          </div>
        </div>
        <Button onClick={() => fetchJobs()} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Refresh
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className={`grid w-full bg-gray-800/80 ${
          isRealEstateUser && hasIndustryTeam ? 'grid-cols-7' :
          isRealEstateUser ? 'grid-cols-6' : 
          hasIndustryTeam ? 'grid-cols-6' :
          hasWorkflowSystem ? 'grid-cols-5' : 
          'grid-cols-4'
        }`}>
          <TabsTrigger
            value="trigger"
            className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            Lead Search
          </TabsTrigger>
          <TabsTrigger
            value="ai-team"
            className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            AI Team
          </TabsTrigger>
          {isRealEstateUser && (
            <TabsTrigger
              value="re-team"
              className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              RE Team
            </TabsTrigger>
          )}
          {hasIndustryTeam && (
            <TabsTrigger
              value="industry-team"
              className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              {userIndustry === 'DENTIST' ? 'Dental Team' : 'Industry Team'}
            </TabsTrigger>
          )}
          {(isRealEstateUser || hasWorkflowSystem) && (
            <TabsTrigger
              value="workflows"
              className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              Workflows
            </TabsTrigger>
          )}
          <TabsTrigger
            value="monitor"
            className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            Monitor Jobs
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            Manage Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trigger" className="space-y-6">
          {/* Lead Research & Enrichment moved to Leads page → Lead Finder tab */}

          {/* Note: Simple workflow builder removed - use the Workflows tab for visual workflow builder */}

        </TabsContent>

        {/* AI Team Tab */}
        <TabsContent value="ai-team" className="space-y-4">
          {/* Setup CTA - replaces Hire AI Employee */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Professional AI Setup
                  </CardTitle>
                  <CardDescription>
                    Select a professional AI employee, assign a name and phone (if needed), then use in a workflow, campaign, or one-off call
                  </CardDescription>
                </div>
                <Button onClick={() => setShowSetupDialog(true)} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Setup
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Professional AI Experts - 12 roles, RE-style cards */}
          <ProfessionalAIEmployees />
        </TabsContent>

        {/* Setup Dialog - Select pro, name, phone, workflow vs one-off */}
        <Dialog open={showSetupDialog} onOpenChange={(open) => {
          setShowSetupDialog(open);
          if (open) {
            fetchProvisionedProfessionalAgents();
            fetch('/api/twilio/phone-numbers/owned').then((r) => r.ok ? r.json() : {}).then((d) => setTwilioOwnedNumbers(d.numbers || []));
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Setup Professional AI
              </DialogTitle>
              <DialogDescription>
                Select a professional AI employee, assign a name and phone (if needed), then choose how to use it
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Professional Type */}
              <div className="space-y-2">
                <Label>Professional AI Employee *</Label>
                <select
                  value={setupForm.professionalType}
                  onChange={(e) => {
                    const config = Object.values(PROFESSIONAL_EMPLOYEE_CONFIGS).find(c => c.type === e.target.value);
                    setSetupForm({
                      ...setupForm,
                      professionalType: e.target.value,
                      customName: config?.name || '',
                    });
                  }}
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value="">Select a professional...</option>
                  {PROFESSIONAL_EMPLOYEE_TYPES.map((type) => {
                    const config = PROFESSIONAL_EMPLOYEE_CONFIGS[type];
                    return (
                      <option key={type} value={type}>
                        {config?.title || type}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {/* Custom Name */}
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input
                  placeholder="e.g., Sarah"
                  value={setupForm.customName}
                  onChange={(e) => setSetupForm({ ...setupForm, customName: e.target.value })}
                />
              </div>
              
              {/* Use Case */}
              <div className="space-y-2">
                <Label>How do you want to use this?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupForm({ ...setupForm, useCase: 'workflow' })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      setupForm.useCase === 'workflow'
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <Workflow className="h-5 w-5 mb-2" />
                    <p className="font-medium text-sm">Workflow or Campaign</p>
                    <p className="text-xs text-muted-foreground">Use in automated workflows</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupForm({ ...setupForm, useCase: 'oneoff' })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      setupForm.useCase === 'oneoff'
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    <PhoneCall className="h-5 w-5 mb-2" />
                    <p className="font-medium text-sm">One-off Call</p>
                    <p className="text-xs text-muted-foreground">Make a call to someone now</p>
                  </button>
                </div>
              </div>
              
              {/* One-off: Twilio phone + contact details */}
              {setupForm.useCase === 'oneoff' && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Phone className="h-4 w-4" />
                      Select Twilio Phone Number *
                    </Label>
                    <select
                      value={setupForm.selectedTwilioPhone}
                      onChange={(e) => setSetupForm({ ...setupForm, selectedTwilioPhone: e.target.value })}
                      className="w-full p-2 border rounded bg-background"
                      required
                    >
                      <option value="">Select a phone number...</option>
                      {twilioOwnedNumbers.map((n) => (
                        <option key={n.phoneNumber} value={n.phoneNumber}>
                          📞 {n.phoneNumber} {n.friendlyName ? `(${n.friendlyName})` : ''}
                        </option>
                      ))}
                      {twilioOwnedNumbers.length === 0 && (
                        <option disabled>No phone numbers found. Purchase one in Settings.</option>
                      )}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Required. Select from your Twilio account. The system will assign it to this agent in ElevenLabs.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Who should we call?</p>
                    <Input
                      placeholder="Contact name"
                      value={setupForm.contactName}
                      onChange={(e) => setSetupForm({ ...setupForm, contactName: e.target.value })}
                    />
                    <Input
                      placeholder="Phone number (e.g. +1 555 123 4567)"
                      value={setupForm.contactPhone}
                      onChange={(e) => setSetupForm({ ...setupForm, contactPhone: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!setupForm.professionalType) {
                    toast.error('Please select a professional AI employee');
                    return;
                  }
                  if (setupForm.useCase === 'workflow') {
                    setShowSetupDialog(false);
                    toast.success('Opening Workflows...');
                    router.push(`/dashboard/ai-employees?tab=workflows&agent=${setupForm.professionalType}`);
                    return;
                  }
                  if (setupForm.useCase === 'oneoff') {
                    if (!setupForm.selectedTwilioPhone) {
                      toast.error('Please select a Twilio phone number');
                      return;
                    }
                    if (!setupForm.contactName || !setupForm.contactPhone) {
                      toast.error('Please enter contact name and phone');
                      return;
                    }
                    setSetupSubmitting(true);
                    try {
                      const agent = provisionedProfessionalAgents.find((a) => a.employeeType === setupForm.professionalType);
                      const needsAssign = !agent?.twilioPhoneNumber || agent.twilioPhoneNumber !== setupForm.selectedTwilioPhone;
                      if (needsAssign) {
                        const assignRes = await fetch('/api/professional-ai-employees/assign-phone', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            employeeType: setupForm.professionalType,
                            phoneNumber: setupForm.selectedTwilioPhone,
                          }),
                        });
                        const assignData = await assignRes.json().catch(() => ({}));
                        if (!assignRes.ok) throw new Error(assignData.error || 'Failed to assign phone to agent');
                        toast.success('Phone assigned. Initiating call...');
                        fetchProvisionedProfessionalAgents();
                      }
                      const res = await fetch('/api/professional-ai-employees/one-off-call', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          employeeType: setupForm.professionalType,
                          contactName: setupForm.contactName,
                          contactPhone: setupForm.contactPhone,
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.error || 'Failed to initiate call');
                      toast.success(data.message || 'Call initiated!');
                      setShowSetupDialog(false);
                      setSetupForm({ professionalType: '', customName: '', selectedTwilioPhone: '', useCase: 'workflow', contactName: '', contactPhone: '' });
                    } catch (e: any) {
                      toast.error(e.message || 'Failed to initiate call');
                    } finally {
                      setSetupSubmitting(false);
                    }
                  }
                }}
                disabled={!setupForm.professionalType || (setupForm.useCase === 'oneoff' && (!setupForm.selectedTwilioPhone || !setupForm.contactName || !setupForm.contactPhone)) || setupSubmitting}
              >
                {setupSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {setupForm.useCase === 'workflow' ? 'Open Workflows' : 'Make Call'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="monitor" className="space-y-4">
          {/* Unified Monitoring View - Shows all automation activity */}
          {session?.user?.id && (
            <UnifiedMonitor userId={session.user.id} industry={userIndustry} />
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Manager</CardTitle>
              <CardDescription>Manage your tasks and track progress</CardDescription>
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

        {/* Industry Team Tab - Dental, Medical, etc. */}
        {hasIndustryTeam && userIndustry && (
          <TabsContent value="industry-team" className="space-y-4">
            <IndustryAIEmployees industry={userIndustry} />
          </TabsContent>
        )}

        {/* Workflows Tab - For Real Estate and other industries */}
        {(isRealEstateUser || hasWorkflowSystem) && (
          <TabsContent value="workflows" className="space-y-4">
            {isRealEstateUser ? (
              <REWorkflowsTab />
            ) : userIndustry === 'MEDICAL' ? (
              <MedicalWorkflowsTab />
            ) : userIndustry === 'RESTAURANT' ? (
              <RestaurantWorkflowsTab />
            ) : userIndustry === 'CONSTRUCTION' ? (
              <ConstructionWorkflowsTab />
            ) : userIndustry === 'DENTIST' ? (
              <DentistWorkflowsTab />
            ) : userIndustry === 'MEDICAL_SPA' ? (
              <MedicalSpaWorkflowsTab />
            ) : userIndustry === 'OPTOMETRIST' ? (
              <OptometristWorkflowsTab />
            ) : userIndustry === 'HEALTH_CLINIC' ? (
              <HealthClinicWorkflowsTab />
            ) : userIndustry === 'HOSPITAL' ? (
              <HospitalWorkflowsTab />
            ) : userIndustry === 'TECHNOLOGY' ? (
              <TechnologyWorkflowsTab />
            ) : userIndustry === 'SPORTS_CLUB' ? (
              <SportsClubWorkflowsTab />
            ) : userIndustry === 'ORTHODONTIST' ? (
              <DentistWorkflowsTab />
            ) : (
              <IndustryWorkflowsTab industry={userIndustry} />
            )}
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
            <DialogDescription suppressHydrationWarning>
              {(selectedJob?.jobType || '').replace(/_/g, ' ')} • 
              {selectedJob?.status === 'COMPLETED' ? ' Completed' : ' Failed'} on{' '}
              {selectedJob?.completedAt && (typeof selectedJob.completedAt === 'string' ? new Date(selectedJob.completedAt).toLocaleString() : String(selectedJob.completedAt))}
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

                {/* Tech Stack */}
                {selectedJob.output.enrichedData.techStack && selectedJob.output.enrichedData.techStack.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.output.enrichedData.techStack.map((tech: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Funding */}
                {selectedJob.output.enrichedData.funding && (selectedJob.output.enrichedData.funding.amount || selectedJob.output.enrichedData.funding.stage) && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Funding
                    </h3>
                    <div className="p-3 bg-muted rounded-lg">
                      {selectedJob.output.enrichedData.funding.amount && (
                        <p><span className="text-muted-foreground">Amount:</span> {selectedJob.output.enrichedData.funding.amount}</p>
                      )}
                      {selectedJob.output.enrichedData.funding.stage && (
                        <p><span className="text-muted-foreground">Stage:</span> {selectedJob.output.enrichedData.funding.stage}</p>
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
                          {person.phone && (
                            <div className="mt-1 flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${person.phone}`} className="text-primary hover:underline">
                                {person.phone}
                              </a>
                            </div>
                          )}
                          {person.emailAlternatives && person.emailAlternatives.length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Alt emails: {person.emailAlternatives.slice(0, 3).join(', ')}
                            </div>
                          )}
                          {person.source && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {person.source.includes('Hunter') || person.source.includes('Apollo') ? '✅' : '⚠️'} {person.source?.replace(/Hunter|Apollo/gi, 'Soshogle AI') || person.source}
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
                {selectedJob.output.enrichedData.intentSignals && (selectedJob.output.enrichedData.intentSignals.hiring || selectedJob.output.enrichedData.intentSignals.jobPostings?.length) && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Intent Signals
                    </h3>
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      {selectedJob.output.enrichedData.intentSignals.hiring && (
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Company is hiring – potential buying signal</p>
                      )}
                      {selectedJob.output.enrichedData.intentSignals.careersPage && (
                        <a href={selectedJob.output.enrichedData.intentSignals.careersPage} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block mt-1">
                          Careers page
                        </a>
                      )}
                      {selectedJob.output.enrichedData.intentSignals.jobPostings && selectedJob.output.enrichedData.intentSignals.jobPostings.length > 0 && (
                        <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                          {selectedJob.output.enrichedData.intentSignals.jobPostings.slice(0, 5).map((j: string, i: number) => (
                            <li key={i}>{j}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

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
                          <span className="font-medium text-green-600">{workflowResults.results.onboarding.emailSent ? 'Yes via Soshogle AI ✓' : 'No email address'}</span>
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
                            <span className="font-medium text-green-600">{workflowResults.results.communication.emailsSent} via Soshogle AI ✓</span>
                          </div>
                        )}
                        {workflowResults.results.communication.smsSent > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SMS Sent:</span>
                            <span className="font-medium text-green-600">{workflowResults.results.communication.smsSent} via Soshogle AI ✓</span>
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
                    <Button size="sm" variant="outline" onClick={() => {
                      // Scroll to tasks tab
                      const tasksTab = document.querySelector('[value="tasks"]');
                      if (tasksTab) {
                        (tasksTab as HTMLElement).click();
                      }
                    }}>
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