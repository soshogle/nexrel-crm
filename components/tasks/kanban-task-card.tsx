
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Link as LinkIcon, MessageSquare, Paperclip, ListTodo } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  dueDate: string | null;
  assignedTo?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  lead?: {
    id: string;
    businessName: string;
  } | null;
  deal?: {
    id: string;
    title: string;
  } | null;
  category: string | null;
  tags: string[];
  _count?: {
    subtasks: number;
    comments: number;
    attachments: number;
  };
}

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
}

export default function KanbanTaskCard({ task, onClick }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'LOW':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-purple-500/50 transition-all cursor-move space-y-2"
    >
      {/* Priority Badge */}
      <div className="flex items-start justify-between gap-2">
        <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
          {task.priority}
        </Badge>
        {task.category && (
          <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">
            {task.category}
          </Badge>
        )}
      </div>

      {/* Task Title */}
      <h4 className="font-medium text-white text-sm line-clamp-2">{task.title}</h4>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded"
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{task.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(task.dueDate), 'MMM d')}</span>
          </div>
        )}
        {task.assignedTo && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{task.assignedTo.name || 'Unassigned'}</span>
          </div>
        )}
      </div>

      {/* Related Entities */}
      {(task.lead || task.deal) && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <LinkIcon className="h-3 w-3" />
          <span className="truncate">
            {task.lead?.businessName || task.deal?.title}
          </span>
        </div>
      )}

      {/* Counts */}
      {task._count && (task._count.subtasks > 0 || task._count.comments > 0 || task._count.attachments > 0) && (
        <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-700/50">
          {task._count.subtasks > 0 && (
            <div className="flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              <span>{task._count.subtasks}</span>
            </div>
          )}
          {task._count.comments > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{task._count.comments}</span>
            </div>
          )}
          {task._count.attachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{task._count.attachments}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
