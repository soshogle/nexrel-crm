
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  ListTodo,
  Calendar,
  Filter,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import CreateTaskDialog from '@/components/tasks/create-task-dialog';
import TaskList from '@/components/tasks/task-list';
import TaskCard from '@/components/tasks/task-card';
import AISuggestionsPanel from '@/components/tasks/ai-suggestions-panel';
import TaskKanbanBoard from '@/components/tasks/task-kanban-board';
import TaskAnalyticsDashboard from '@/components/tasks/task-analytics-dashboard';
import { TaskCalendarView } from '@/components/tasks/task-calendar-view';
import MondayBoard from '@/components/tasks/monday-board';
import { useSession } from 'next-auth/react';

export default function TasksPage() {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'LOW': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'BLOCKED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'REVIEW': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'TODO': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Task Manager</h1>
          <p className="text-gray-400 mt-1">
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
                // Open create dialog with pre-selected status
                setIsCreateDialogOpen(true);
              }}
            />
          ) : view === 'calendar' ? (
            <TaskCalendarView
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onDateClick={(date) => {
                // Open create dialog with pre-filled due date
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
