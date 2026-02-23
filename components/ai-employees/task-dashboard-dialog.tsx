'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, History, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PROFESSIONAL_EMPLOYEE_CONFIGS } from '@/lib/professional-ai-employees/config';
import { getREEmployeeConfig } from '@/lib/real-estate/ai-employees/configs';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

interface Task {
  taskKey: string;
  enabled: boolean;
  description: string;
}

/** Fallback tasks when API returns empty - ensures duties are always visible */
function getFallbackTasks(
  source: 'industry' | 're' | 'professional',
  employeeType: string,
  industry?: string
): Task[] {
  if (source === 'professional') {
    const config = PROFESSIONAL_EMPLOYEE_CONFIGS[employeeType as keyof typeof PROFESSIONAL_EMPLOYEE_CONFIGS];
    if (config?.capabilities?.length) {
      return config.capabilities.map((cap) => ({
        taskKey: slugify(cap),
        enabled: true,
        description: cap,
      }));
    }
    return [{ taskKey: 'run', enabled: true, description: config?.fullDescription || 'Conversational assistant' }];
  }
  if (source === 're') {
    const reConfig = getREEmployeeConfig(employeeType as any);
    if (reConfig?.capabilities?.length) {
      return reConfig.capabilities.map((cap) => ({
        taskKey: slugify(cap),
        enabled: true,
        description: cap,
      }));
    }
    return [{ taskKey: 'run', enabled: true, description: reConfig?.description || 'Run tasks' }];
  }
  if (source === 'industry' && industry) {
    const module = getIndustryAIEmployeeModule(industry as any);
    const config = module?.configs?.[employeeType] as { capabilities?: string[]; description?: string } | undefined;
    if (config?.capabilities?.length) {
      return config.capabilities.map((cap) => ({
        taskKey: slugify(cap),
        enabled: true,
        description: cap,
      }));
    }
    return [{ taskKey: 'run', enabled: true, description: config?.description || 'Run tasks' }];
  }
  return [{ taskKey: 'run', enabled: true, description: 'Run tasks' }];
}

interface HistoryItem {
  id: string;
  date: string;
  status: string;
  summary?: string;
  tasksCompleted?: string[];
  details?: unknown;
}

interface TaskDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  employeeType: string;
  source: 'industry' | 're' | 'professional';
  industry?: string;
}

export function TaskDashboardDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  employeeType,
  source,
  industry,
}: TaskDashboardDialogProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchConfig = async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-employees/task-config?agentId=${agentId}`);
      const data = await res.json();
      if (res.ok && data.tasks?.length) {
        setTasks(data.tasks);
      } else {
        // Fallback: show duties from config so user always sees tasks + toggles
        const fallback = getFallbackTasks(source, employeeType, industry ?? undefined);
        setTasks(fallback);
      }
    } catch {
      const fallback = getFallbackTasks(source, employeeType, industry ?? undefined);
      setTasks(fallback);
      toast.error('Could not load saved preferences — showing defaults');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/ai-employees/task-history?agentId=${agentId}&limit=10`);
      const data = await res.json();
      if (res.ok && data.history) setHistory(data.history);
    } catch {
      toast.error('Failed to load history');
    }
  };

  useEffect(() => {
    if (open && agentId) {
      fetchConfig();
      fetchHistory();
    }
  }, [open, agentId]);

  const handleToggle = async (taskKey: string, enabled: boolean) => {
    setToggling(taskKey);
    try {
      const res = await fetch('/api/ai-employees/task-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, taskKey, enabled }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.taskKey === taskKey ? { ...t, enabled } : t))
        );
        toast.success(data.message || 'Task updated');
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update task');
    } finally {
      setToggling(null);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      let url: string;
      let body: Record<string, unknown>;
      if (source === 'industry' && industry) {
        url = '/api/industry-ai-employees/run';
        body = { industry, employeeType };
      } else if (source === 're') {
        url = '/api/ai-employees/real-estate/run';
        body = { employeeType };
      } else {
        toast.info('This employee is conversational only — no automated tasks to run.');
        return;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.summary || 'Tasks completed');
        fetchHistory();
      } else {
        toast.error(data.error || 'Run failed');
      }
    } catch {
      toast.error('Failed to run tasks');
    } finally {
      setRunning(false);
    }
  };

  const canRun = source === 'industry' || source === 're';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-50 dark:border-slate-200 dark:text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-900">
            <Settings className="w-5 h-5 text-purple-600" />
            Manage Tasks — {agentName}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-600">
            Configure what runs, view history, and trigger runs manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Task toggles */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-800">Duties &amp; tasks</h4>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-600">
                No tasks configured for this agent yet.
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div
                    key={t.taskKey}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-200 dark:bg-white dark:text-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-900">{t.description}</p>
                      {t.taskKey !== t.description && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">{t.taskKey}</p>
                      )}
                    </div>
                    <Switch
                      checked={t.enabled}
                      onCheckedChange={(checked) => handleToggle(t.taskKey, checked)}
                      disabled={toggling === t.taskKey}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          {canRun && (
            <div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handleRun}
                disabled={running}
              >
                {running ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run tasks now
              </Button>
            </div>
          )}

          {/* History */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-800">
              <History className="w-4 h-4" />
              Task history
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-500">No runs yet.</p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-200 dark:bg-white dark:text-slate-700"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-600">
                        {new Date(h.date).toLocaleString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          h.status === 'SUCCESS'
                            ? 'bg-green-500/10 border-green-500/30 text-green-700'
                            : 'bg-red-500/10 border-red-500/30 text-red-700'
                        }
                      >
                        {h.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {h.status}
                      </Badge>
                    </div>
                    {h.summary && (
                      <p className="text-slate-700">{h.summary}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
