/**
 * Monday.com-style Task Board
 * Modern table-based task management with colored statuses
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  MoreHorizontal,
  Calendar,
  User,
  Flag,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignee?: { id: string; name: string; email: string };
  createdAt: string;
}

interface MondayBoardProps {
  isAdmin?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'TODO': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  'IN_PROGRESS': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'REVIEW': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  'COMPLETED': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  'BLOCKED': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

const PRIORITY_COLORS: Record<string, { bg: string; border: string }> = {
  'LOW': { bg: 'bg-gray-200', border: 'border-l-gray-400' },
  'MEDIUM': { bg: 'bg-yellow-200', border: 'border-l-yellow-500' },
  'HIGH': { bg: 'bg-orange-200', border: 'border-l-orange-500' },
  'URGENT': { bg: 'bg-red-200', border: 'border-l-red-500' },
};

export default function MondayBoard({ isAdmin = false }: MondayBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks?limit=100');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!isAdmin) {
      toast.error('Only admins can modify tasks');
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success('Status updated');
        fetchTasks();
      }
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const updateTaskPriority = async (taskId: string, priority: string) => {
    if (!isAdmin) {
      toast.error('Only admins can modify tasks');
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      if (res.ok) {
        toast.success('Priority updated');
        fetchTasks();
      }
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const addTask = async (status: string) => {
    if (!newTaskTitle.trim() || !isAdmin) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle, status, priority: 'MEDIUM' })
      });
      if (res.ok) {
        toast.success('Task created');
        setNewTaskTitle('');
        setAddingToGroup(null);
        fetchTasks();
      }
    } catch (e) {
      toast.error('Failed to create task');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Task deleted');
        fetchTasks();
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const toggleGroup = (status: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(status)) {
      newCollapsed.delete(status);
    } else {
      newCollapsed.add(status);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Group tasks by status
  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.status || 'TODO';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Filter by search
  const filteredGroups = Object.entries(groupedTasks).map(([status, statusTasks]) => ({
    status,
    tasks: statusTasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(g => g.tasks.length > 0 || !searchQuery);

  // Ensure all statuses are shown
  const allStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED'];
  const displayGroups = allStatuses.map(status => {
    const found = filteredGroups.find(g => g.status === status);
    return found || { status, tasks: [] };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{tasks.length} tasks</span>
          {!isAdmin && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              View Only
            </Badge>
          )}
        </div>
      </div>

      {/* Monday-style Table */}
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-5">Task</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Priority</div>
          <div className="col-span-2 text-center">Due Date</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>

        {/* Groups */}
        {displayGroups.map(({ status, tasks: groupTasks }) => {
          const colors = STATUS_COLORS[status] || STATUS_COLORS['TODO'];
          const isCollapsed = collapsedGroups.has(status);

          return (
            <div key={status} className="border-b last:border-b-0">
              {/* Group Header */}
              <div 
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/30 ${colors.bg}`}
                onClick={() => toggleGroup(status)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className={`font-semibold text-sm ${colors.text}`}>
                  {status.replace('_', ' ')}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {groupTasks.length}
                </Badge>
              </div>

              {/* Group Tasks */}
              {!isCollapsed && (
                <div className="divide-y divide-border/50">
                  {groupTasks.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No tasks in this group
                    </div>
                  ) : (
                    groupTasks.map((task) => {
                      const priorityColors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['MEDIUM'];
                      return (
                        <div 
                          key={task.id} 
                          className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/20 border-l-4 ${priorityColors.border}`}
                        >
                          {/* Task Title */}
                          <div className="col-span-5 flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Status Dropdown */}
                          <div className="col-span-2 flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild disabled={!isAdmin}>
                                <button className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} hover:opacity-80`}>
                                  {status.replace('_', ' ')}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {allStatuses.map(s => (
                                  <DropdownMenuItem key={s} onClick={() => updateTaskStatus(task.id, s)}>
                                    <div className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.dot}`} />
                                    {s.replace('_', ' ')}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Priority Dropdown */}
                          <div className="col-span-2 flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild disabled={!isAdmin}>
                                <button className={`px-3 py-1 rounded text-xs font-medium ${priorityColors.bg} hover:opacity-80`}>
                                  <Flag className="h-3 w-3 inline mr-1" />
                                  {task.priority}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                                  <DropdownMenuItem key={p} onClick={() => updateTaskPriority(task.id, p)}>
                                    <div className={`w-3 h-3 rounded mr-2 ${PRIORITY_COLORS[p]?.bg}`} />
                                    {p}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Due Date */}
                          <div className="col-span-2 flex justify-center">
                            {task.dueDate ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex justify-center">
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => updateTaskStatus(task.id, 'COMPLETED')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                    Mark Complete
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-red-600">
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add Task Row */}
                  {isAdmin && !isCollapsed && (
                    <div className="px-4 py-2 bg-muted/10">
                      {addingToGroup === status ? (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter task title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTask(status)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => addTask(status)}>Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingToGroup(null); setNewTaskTitle(''); }}>Cancel</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingToGroup(status)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                          Add task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
