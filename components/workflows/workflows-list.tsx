
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, Trash2, MoreVertical, Zap, CheckCircle2, Clock, Pencil } from 'lucide-react';

interface WorkflowsListProps {
  workflows: any[];
  onToggleStatus: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
  onOpenInBuilder?: (id: string) => void;
}

export function WorkflowsList({ workflows, onToggleStatus, onDelete, onOpenInBuilder }: WorkflowsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTriggerLabel = (triggerType: string | undefined) => {
    return (triggerType || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="bg-card hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <CardTitle className="text-base">{workflow.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {workflow.description || 'No description'}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onOpenInBuilder && (
                    <DropdownMenuItem onClick={() => onOpenInBuilder(workflow.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Open in Builder
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onToggleStatus(workflow.id, workflow.status)}
                  >
                    {workflow.status === 'ACTIVE' ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(workflow.id)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Badge className={getStatusColor(workflow.status)}>
                {workflow.status}
              </Badge>
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" />
                {getTriggerLabel(workflow.triggerType)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>{workflow.actions?.length || 0} actions</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{workflow.enrollmentCount || 0} enrollments</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Executions</span>
              <span className="font-medium">{workflow.completionCount || 0}</span>
            </div>

            {workflow.status === 'ACTIVE' && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 pt-1">
                <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></div>
                Running
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
