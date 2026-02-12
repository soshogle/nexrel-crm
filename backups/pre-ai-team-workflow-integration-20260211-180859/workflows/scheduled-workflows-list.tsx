
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock, Trash2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScheduledWorkflow {
  id: string;
  name: string;
  description: string;
  scheduledDate: string;
  status: string;
  metadata: any;
}

export function ScheduledWorkflowsList() {
  const [workflows, setWorkflows] = useState<ScheduledWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowToCancel, setWorkflowToCancel] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduledWorkflows();
  }, []);

  const fetchScheduledWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workflows/schedule');
      const data = await response.json();
      
      if (response.ok) {
        setWorkflows(data.scheduled || []);
      } else {
        toast.error('Failed to load scheduled workflows');
      }
    } catch (error) {
      console.error('Error fetching scheduled workflows:', error);
      toast.error('Error loading scheduled workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/schedule?id=${workflowId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Workflow cancelled successfully');
        setWorkflows(workflows.filter(w => w.id !== workflowId));
      } else {
        toast.error('Failed to cancel workflow');
      }
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      toast.error('Error cancelling workflow');
    } finally {
      setWorkflowToCancel(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntil = (dateString: string) => {
    const now = new Date();
    const scheduled = new Date(dateString);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'starting soon';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">No scheduled workflows</h3>
          <p className="text-sm text-muted-foreground">
            Schedule a workflow from the templates above
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scheduled Workflows</h3>
          <Badge variant="secondary">
            {workflows.length} active
          </Badge>
        </div>

        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base mb-1">{workflow.name}</CardTitle>
                  {workflow.description && (
                    <CardDescription className="text-sm line-clamp-1">
                      {workflow.description}
                    </CardDescription>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWorkflowToCancel(workflow.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(workflow.scheduledDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(workflow.scheduledDate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getTimeUntil(workflow.scheduledDate)}
                </Badge>
                {workflow.metadata?.timezone && (
                  <Badge variant="secondary" className="text-xs">
                    {workflow.metadata.timezone}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!workflowToCancel} onOpenChange={() => setWorkflowToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Scheduled Workflow?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled workflow execution. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Workflow</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => workflowToCancel && handleCancelWorkflow(workflowToCancel)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
