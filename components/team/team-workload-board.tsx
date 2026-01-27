
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { Users, Clock, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedToId?: string;
}

interface TeamWorkloadBoardProps {
  members: TeamMember[];
  tasks: Task[];
  onTaskUpdated: () => void;
}

export function TeamWorkloadBoard({ members, tasks, onTaskUpdated }: TeamWorkloadBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const newAssigneeId = over.id as string;

    // Don't update if dropped on same assignee
    const task = tasks.find((t) => t.id === taskId);
    if (task?.assignedToId === newAssigneeId) {
      setActiveTask(null);
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: newAssigneeId }),
      });

      if (response.ok) {
        toast.success('Task reassigned successfully');
        onTaskUpdated();
      } else {
        toast.error('Failed to reassign task');
      }
    } catch (error) {
      console.error('Error reassigning task:', error);
      toast.error('Failed to reassign task');
    }

    setActiveTask(null);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      URGENT: 'bg-red-500/20 text-red-300 border-red-500/30',
      HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      MEDIUM: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      LOW: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };
    return colors[priority] || colors.MEDIUM;
  };

  // Add unassigned column
  const allColumns = [
    { id: 'unassigned', name: 'Unassigned', role: 'Unassigned Tasks' },
    ...members,
  ];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          <span>Drag and drop tasks between team members to reassign</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allColumns.map((column) => {
            const columnTasks = tasks.filter((t) =>
              column.id === 'unassigned' ? !t.assignedToId : t.assignedToId === column.id
            );

            return (
              <div key={column.id} data-droppable-id={column.id} id={column.id} className="min-h-[200px]">
                <Card className="bg-gray-900 border-gray-800 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {column.id !== 'unassigned' && (
                        <Avatar className="h-8 w-8 border-2 border-purple-500/30">
                          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs">
                            {column.name?.split(' ').map((n) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-sm text-white">{column.name || 'Unknown'}</CardTitle>
                        <p className="text-xs text-gray-400">{column.role || 'No role'}</p>
                      </div>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {columnTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No tasks assigned
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <div
                          key={task.id}
                          id={task.id}
                          className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg cursor-move hover:border-purple-500/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-medium text-white line-clamp-2">{task.title}</h4>
                            <Badge className={getPriorityColor(task.priority)} variant="outline">
                              {task.priority}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {task.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {task.status === 'COMPLETED' ? (
                                <Clock className="h-3 w-3 text-green-400" />
                              ) : task.dueDate && new Date(task.dueDate) < new Date() ? (
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              <span>{task.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="p-3 bg-gray-800 border-2 border-purple-500 rounded-lg shadow-lg opacity-90 w-64">
            <h4 className="text-sm font-medium text-white mb-1">{activeTask.title}</h4>
            <Badge className={getPriorityColor(activeTask.priority)} variant="outline">
              {activeTask.priority}
            </Badge>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
