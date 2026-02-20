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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Calendar,
  Plus,
  RefreshCw,
  ListTodo,
  Filter,
  Settings,
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
import { UnifiedMonitor } from '@/components/workflows/unified-monitor';
import { JobResultsDialog } from '@/components/ai-employees/job-results-dialog';
import { WorkflowResultsDialog } from '@/components/ai-employees/workflow-results-dialog';
import { SetupDialog } from '@/components/ai-employees/setup-dialog';
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
      <Card className="bg-primary border-primary-foreground/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary-foreground">Your Tasks</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <Tabs value={view} onValueChange={(v: any) => setView(v)}>
              <TabsList className="bg-primary-foreground/10">
                <TabsTrigger value="monday" className="data-[state=active]:bg-primary-foreground/20 text-primary-foreground">
                  📋 Board
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-primary-foreground/20 text-primary-foreground">
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban" className="data-[state=active]:bg-primary-foreground/20 text-primary-foreground">
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="calendar" className="data-[state=active]:bg-primary-foreground/20 text-primary-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary-foreground/20 text-primary-foreground">
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
              <ListTodo className="h-12 w-12 mx-auto text-primary-foreground/60 mb-4" />
              <p className="text-primary-foreground/80">No tasks found</p>
              <p className="text-primary-foreground/70 text-sm mt-1">
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
  
  // Setup dialog
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  
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
  const initialTab = tabParam && ['ai-team', 're-team', 'industry-team', 'workflows', 'monitor', 'tasks'].includes(tabParam) ? tabParam : 'ai-team';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedProfessionalForWorkflow, setSelectedProfessionalForWorkflow] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchVoiceAgents();
    fetchAppointments();
    fetchTeamMembers();
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full bg-black ${
          isRealEstateUser && hasIndustryTeam ? 'grid-cols-6' :
          isRealEstateUser ? 'grid-cols-5' : 
          hasIndustryTeam ? 'grid-cols-5' :
          hasWorkflowSystem ? 'grid-cols-4' : 
          'grid-cols-3'
        }`}>
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

        <SetupDialog
          open={showSetupDialog}
          onOpenChange={setShowSetupDialog}
          onProvisionRefresh={() => {}}
          onSwitchToWorkflows={(professionalType) => {
            setSelectedProfessionalForWorkflow(professionalType);
            setActiveTab('workflows');
          }}
        />

        <TabsContent value="monitor" className="space-y-4">
          {/* Unified Monitoring View - Shows all automation activity */}
          {session?.user?.id && (
            <UnifiedMonitor userId={session.user.id} industry={userIndustry} />
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
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
              <REWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'MEDICAL' ? (
              <MedicalWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'RESTAURANT' ? (
              <RestaurantWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'CONSTRUCTION' ? (
              <ConstructionWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'DENTIST' ? (
              <DentistWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'MEDICAL_SPA' ? (
              <MedicalSpaWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'OPTOMETRIST' ? (
              <OptometristWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'HEALTH_CLINIC' ? (
              <HealthClinicWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'HOSPITAL' ? (
              <HospitalWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'TECHNOLOGY' ? (
              <TechnologyWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'SPORTS_CLUB' ? (
              <SportsClubWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : userIndustry === 'ORTHODONTIST' ? (
              <DentistWorkflowsTab preSelectedAgent={selectedProfessionalForWorkflow} />
            ) : (
              <IndustryWorkflowsTab industry={userIndustry} preSelectedAgent={selectedProfessionalForWorkflow} />
            )}
          </TabsContent>
        )}
      </Tabs>

      <JobResultsDialog
        open={showResultsDialog}
        onOpenChange={setShowResultsDialog}
        selectedJob={selectedJob}
        loading={loadingJobDetails}
      />

      <WorkflowResultsDialog
        open={showWorkflowResults}
        onOpenChange={setShowWorkflowResults}
        workflowResults={workflowResults}
      />
    </div>
  );
}