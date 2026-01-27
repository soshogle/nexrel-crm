
'use client';

import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
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
  _count: {
    comments: number;
    attachments: number;
    subtasks: number;
  };
}

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateClick: (date: Date) => void;
  onTaskUpdated: () => void;
}

export function TaskCalendarView({
  tasks,
  onTaskClick,
  onDateClick,
  onTaskUpdated,
}: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    })
  );

  // Initialize date only on client side
  useEffect(() => {
    setMounted(true);
    setCurrentMonth(new Date());
  }, []);

  const handlePreviousMonth = () => {
    if (!currentMonth) return;
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    if (!currentMonth) return;
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      try {
        return isSameDay(parseISO(task.dueDate), date) && task.status !== 'COMPLETED';
      } catch {
        return false;
      }
    });
  };

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

    // If dropped on a date cell
    if (over.id.toString().startsWith('date-')) {
      const dateString = over.id.toString().replace('date-', '');
      const newDate = new Date(dateString);

      try {
        const response = await fetch(`/api/tasks/${active.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dueDate: newDate.toISOString(),
          }),
        });

        if (response.ok) {
          toast.success('Task due date updated');
          onTaskUpdated();
        } else {
          throw new Error('Failed to update task');
        }
      } catch (error) {
        console.error('Error updating task:', error);
        toast.error('Failed to update task due date');
      }
    }

    setActiveTask(null);
  };

  const priorityColors: Record<string, string> = {
    URGENT: 'bg-red-500/10 text-red-400 border-red-500/50',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
    MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/50',
    LOW: 'bg-gray-500/10 text-gray-400 border-gray-500/50',
  };

  // Don't render until mounted and date initialized
  if (!mounted || !currentMonth) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Calculate dates only after guard clause to prevent hydration errors
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days to start from Sunday
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">Priority:</span>
          <Badge className={priorityColors.URGENT}>Urgent</Badge>
          <Badge className={priorityColors.HIGH}>High</Badge>
          <Badge className={priorityColors.MEDIUM}>Medium</Badge>
          <Badge className={priorityColors.LOW}>Low</Badge>
        </div>

        {/* Calendar Grid */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="aspect-square" />
            ))}
            {daysInMonth.map((date) => {
              const dayTasks = getTasksForDate(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isTodayDate = isToday(date);
              const droppableId = `date-${date.toISOString()}`;

              return (
                <div
                  key={date.toISOString()}
                  data-droppable-id={droppableId}
                  id={droppableId}
                  className={`
                    aspect-square border rounded-lg p-2 cursor-pointer transition-all
                    ${isCurrentMonth ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900'}
                    ${isTodayDate ? 'border-purple-500 border-2' : 'border-gray-700'}
                  `}
                  onClick={() => onDateClick(date)}
                >
                  <div className="flex flex-col h-full">
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isTodayDate ? 'text-purple-400' : 'text-gray-300'
                      }`}
                    >
                      {format(date, 'd')}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          id={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('taskId', task.id);
                          }}
                          className={`
                            text-xs px-2 py-1 rounded border cursor-pointer truncate
                            ${priorityColors[task.priority] || priorityColors.LOW}
                            hover:opacity-80 transition-opacity
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick(task);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {task.priority === 'URGENT' && (
                              <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div
              className={`
                text-xs px-2 py-1 rounded border opacity-75
                ${priorityColors[activeTask.priority] || priorityColors.LOW}
              `}
            >
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
