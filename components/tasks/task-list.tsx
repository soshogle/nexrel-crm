
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreVertical,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  Link as LinkIcon,
  Phone,
} from 'lucide-react';
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TaskListProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

export default function TaskList({
  tasks,
  onTaskClick,
  onTaskUpdated,
  onTaskDeleted,
}: TaskListProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [taskForCall, setTaskForCall] = useState<any>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'LOW': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'BLOCKED': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleToggleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (updatingTasks.has(task.id)) return;
    
    setUpdatingTasks(new Set(updatingTasks).add(task.id));

    try {
      const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      toast.success(newStatus === 'COMPLETED' ? 'Task completed!' : 'Task reopened');
      onTaskUpdated();
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      const newSet = new Set(updatingTasks);
      newSet.delete(task.id);
      setUpdatingTasks(newSet);
    }
  };

  const handleDelete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      toast.success('Task deleted successfully');
      onTaskDeleted();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const isOverdue = (task: any) => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  };

  const handleMakeCall = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskForCall(task);
    setCallDialogOpen(true);
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task)}
          className="group p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-purple-500/50 rounded-lg cursor-pointer transition-all"
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className="mt-0.5">
              <Checkbox
                checked={task.status === 'COMPLETED'}
                onCheckedChange={(checked) => handleToggleComplete(task, {} as any)}
                onClick={(e) => e.stopPropagation()}
                className="border-gray-600"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-medium text-white truncate ${
                      task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(task, e)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>

                <div className="flex items-center gap-1">
                  {getStatusIcon(task.status)}
                  <span>{task.status.replace('_', ' ')}</span>
                </div>

                {task.category && (
                  <Badge variant="outline" className="border-gray-700 text-gray-400">
                    {task.category}
                  </Badge>
                )}

                {task.dueDate && (
                  <div
                    className={`flex items-center gap-1 ${
                      isOverdue(task) ? 'text-red-500' : ''
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                  </div>
                )}

                {task.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{task.assignedTo.name || task.assignedTo.email}</span>
                  </div>
                )}

                {(task.leadId || task.dealId) && (
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    <span>
                      {task.lead?.businessName || task.deal?.title}
                    </span>
                    {task.lead?.phone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleMakeCall(task, e)}
                        className="h-5 w-5 p-0 ml-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        title="Make Voice AI Call"
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                {task._count && (
                  <div className="flex items-center gap-2">
                    {task._count.subtasks > 0 && (
                      <span>📋 {task._count.subtasks}</span>
                    )}
                    {task._count.comments > 0 && (
                      <span>💬 {task._count.comments}</span>
                    )}
                    {task._count.attachments > 0 && (
                      <span>📎 {task._count.attachments}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        defaultName={taskForCall?.lead?.contactPerson || taskForCall?.lead?.businessName || ''}
        defaultPhone={taskForCall?.lead?.phone || ''}
        defaultPurpose={`Follow-up for task: ${taskForCall?.title || ''}`}
        leadId={taskForCall?.leadId}
      />
    </div>
  );
}
