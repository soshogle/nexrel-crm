
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TaskCardProps {
  task: any;
  onClick: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function TaskCard({
  task,
  onClick,
  onUpdated,
  onDeleted,
}: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

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
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      toast.success(newStatus === 'COMPLETED' ? 'Task completed!' : 'Task reopened');
      onUpdated();
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      toast.success('Task deleted successfully');
      onDeleted();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const isOverdue = () => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <Card
      onClick={onClick}
      className="bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-purple-500/50 cursor-pointer transition-all group"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Checkbox
              checked={task.status === 'COMPLETED'}
              onCheckedChange={(checked) => handleToggleComplete({} as any)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 border-gray-600"
            />
            <div className="flex-1 min-w-0">
              <h3
                className={`font-medium text-white line-clamp-2 ${
                  task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''
                }`}
              >
                {task.title}
              </h3>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onClick={(e) => handleDelete(e)}
                className="text-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {getStatusIcon(task.status)}
            <span>{task.status.replace('_', ' ')}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {task.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        <div className="space-y-2 text-xs text-gray-400">
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 ${
                isOverdue() ? 'text-red-500' : ''
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
            </div>
          )}

          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assignedTo.name || task.assignedTo.email}</span>
            </div>
          )}

          {task.category && (
            <Badge variant="outline" className="border-gray-700 text-gray-400">
              {task.category}
            </Badge>
          )}

          {task._count && (
            <div className="flex items-center gap-2 pt-1">
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
      </CardContent>
    </Card>
  );
}
