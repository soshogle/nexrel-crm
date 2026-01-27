
'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  User,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import KanbanTaskCard from './kanban-task-card';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';
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

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdated: () => void;
  onCreateTask: (status: string) => void;
}

const STATUS_COLUMNS = [
  {
    id: 'TODO',
    title: 'To Do',
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    id: 'BLOCKED',
    title: 'Blocked',
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  {
    id: 'REVIEW',
    title: 'In Review',
    icon: XCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  {
    id: 'COMPLETED',
    title: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
];

export default function TaskKanbanBoard({
  tasks,
  onTaskClick,
  onTaskUpdated,
  onCreateTask,
}: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    STATUS_COLUMNS.forEach((column) => {
      grouped[column.id] = tasks.filter((task) => task.status === column.id);
    });
    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      setIsDragging(true);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setIsDragging(false);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (task && task.status !== newStatus) {
      // Optimistic update
      task.status = newStatus as Task['status'];

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            ...(newStatus === 'COMPLETED' && { progressPercent: 100 }),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task status');
        }

        toast.success(`Task moved to ${STATUS_COLUMNS.find((c) => c.id === newStatus)?.title}`);
        onTaskUpdated();
      } catch (error) {
        console.error('Error updating task:', error);
        toast.error('Failed to update task status');
        onTaskUpdated(); // Refresh to revert optimistic update
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id] || [];
          const Icon = column.icon;

          return (
            <div key={column.id} className="flex flex-col">
              <Card className={`bg-gray-900 border-gray-800 ${isDragging ? 'ring-2 ring-purple-500/20' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${column.color}`} />
                      <span className="text-white">{column.title}</span>
                      <Badge
                        variant="outline"
                        className={`${column.bgColor} ${column.borderColor} ${column.color} text-xs`}
                      >
                        {columnTasks.length}
                      </Badge>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCreateTask(column.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <SortableContext
                    id={column.id}
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[200px]">
                      {columnTasks.map((task) => (
                        <KanbanTaskCard
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task)}
                        />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                          <Icon className="h-8 w-8 mb-2 opacity-20" />
                          <p>No tasks</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-50">
            <KanbanTaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
