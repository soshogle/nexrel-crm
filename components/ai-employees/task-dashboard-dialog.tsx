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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Loader2, History, Settings, CheckCircle2, XCircle, Clock, FileText, ChevronDown, ChevronUp, Plus, Mic } from 'lucide-react';
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

interface DailySchedule {
  id: string;
  runAtTime: string;
  runAtTimezone: string;
  enabled: boolean;
}

const DEFAULT_SCHEDULE: Omit<DailySchedule, 'id'> = {
  runAtTime: '09:00',
  runAtTimezone: 'America/New_York',
  enabled: false,
};

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
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [taskSchedules, setTaskSchedules] = useState<Record<string, DailySchedule>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(true); // expanded by default so users find it
  const [template, setTemplate] = useState<{ smsTemplate?: string; emailSubject?: string; emailBody?: string } | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDirty, setTemplateDirty] = useState(false);

  const canRun = source === 'industry' || source === 're' || source === 'professional';

  /** Employees that support custom SMS/email templates */
  const supportsTemplates =
    (source === 'industry' && ['APPOINTMENT_SCHEDULER', 'PATIENT_COORDINATOR', 'TREATMENT_COORDINATOR', 'BILLING_SPECIALIST'].includes(employeeType)) ||
    (source === 're' && employeeType === 'RE_SPEED_TO_LEAD');

  const fetchConfig = async () => {
    if (!agentId && !employeeType) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.set('agentId', agentId);
      params.set('source', source);
      params.set('employeeType', employeeType);
      if (source === 'industry' && industry) params.set('industry', industry);

      const res = await fetch(`/api/ai-employees/task-config?${params}`);
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

  const fetchSchedule = async () => {
    if (!canRun) return;
    try {
      const tsParams = new URLSearchParams({ source, employeeType });
      if (source === 'industry' && industry) tsParams.set('industry', industry);
      const tsRes = await fetch(`/api/ai-employees/task-schedules?${tsParams}`);
      const tsData = await tsRes.json();
      if (tsRes.ok && tsData.schedules?.length) {
        const map: Record<string, DailySchedule> = {};
        for (const s of tsData.schedules) {
          map[s.taskKey] = {
            id: s.id,
            runAtTime: s.runAtTime?.slice(0, 5) || '09:00',
            runAtTimezone: s.runAtTimezone || 'America/New_York',
            enabled: s.enabled ?? true,
          };
        }
        setTaskSchedules(map);
      }
    } catch {
      // ignore
    }
  };

  const fetchTemplates = async () => {
    if (!supportsTemplates) return;
    try {
      const params = new URLSearchParams({ source, employeeType, taskKey: employeeType });
      if (source === 'industry' && industry) params.set('industry', industry);
      const res = await fetch(`/api/ai-employees/task-templates?${params}`);
      const data = await res.json();
      if (res.ok && data.templates?.length) {
        const t = data.templates[0];
        setTemplate({
          smsTemplate: t.smsTemplate ?? '',
          emailSubject: t.emailSubject ?? '',
          emailBody: t.emailBody ?? '',
        });
      } else {
        setTemplate({ smsTemplate: '', emailSubject: '', emailBody: '' });
      }
    } catch {
      setTemplate({ smsTemplate: '', emailSubject: '', emailBody: '' });
    }
  };

  useEffect(() => {
    if (open && agentId) {
      fetchConfig();
      fetchHistory();
      if (canRun) fetchSchedule();
      if (supportsTemplates) fetchTemplates();
    }
  }, [open, agentId, supportsTemplates]);

  const handleToggle = async (taskKey: string, enabled: boolean) => {
    setToggling(taskKey);
    try {
      const res = await fetch('/api/ai-employees/task-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          taskKey,
          enabled,
          source,
          employeeType,
          industry: source === 'industry' ? industry : undefined,
        }),
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
      } else if (source === 'professional') {
        url = '/api/ai-employees/professional/run';
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

  const getTaskScheduleForm = (taskKey: string) =>
    taskSchedules[taskKey] ?? { id: '', ...DEFAULT_SCHEDULE };

  const updateTaskSchedule = (taskKey: string, updates: Partial<DailySchedule>) => {
    setTaskSchedules((prev) => {
      const base = prev[taskKey] ?? { id: '', ...DEFAULT_SCHEDULE };
      return { ...prev, [taskKey]: { ...base, ...updates } };
    });
  };

  const handleSaveTaskSchedule = async (taskKey: string) => {
    const form = getTaskScheduleForm(taskKey);
    setScheduleSaving(true);
    try {
      const body: Record<string, unknown> = {
        source,
        employeeType,
        taskKey,
        runAtTime: form.runAtTime || '09:00',
        runAtTimezone: form.runAtTimezone || 'America/New_York',
        enabled: form.enabled,
      };
      if (source === 'industry' && industry) body.industry = industry;
      const res = await fetch('/api/ai-employees/task-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.schedule) {
        setTaskSchedules((prev) => ({
          ...prev,
          [taskKey]: {
            id: data.schedule.id,
            runAtTime: data.schedule.runAtTime?.slice(0, 5) || '09:00',
            runAtTimezone: data.schedule.runAtTimezone || 'America/New_York',
            enabled: data.schedule.enabled ?? true,
          },
        }));
        toast.success('Schedule saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!supportsTemplates) return;
    setTemplateSaving(true);
    try {
      const body: Record<string, unknown> = {
        source,
        employeeType,
        taskKey: employeeType,
        smsTemplate: template?.smsTemplate || null,
        emailSubject: template?.emailSubject || null,
        emailBody: template?.emailBody || null,
      };
      if (source === 'industry' && industry) body.industry = industry;
      const res = await fetch('/api/ai-employees/task-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplateDirty(false);
        toast.success('Message templates saved');
      } else {
        toast.error(data.error || 'Failed to save templates');
      }
    } catch {
      toast.error('Failed to save templates');
    } finally {
      setTemplateSaving(false);
    }
  };

  const isSmsEmployee =
    (source === 'industry' && ['APPOINTMENT_SCHEDULER', 'PATIENT_COORDINATOR', 'TREATMENT_COORDINATOR'].includes(employeeType)) ||
    (source === 're' && employeeType === 'RE_SPEED_TO_LEAD');
  const isEmailEmployee = source === 'industry' && employeeType === 'BILLING_SPECIALIST';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-50 dark:border-slate-200 dark:text-slate-900">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-900">
            <Settings className="w-5 h-5 text-purple-600" />
            Manage Tasks — {agentName}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-600">
            Toggle duties, edit message templates (SMS/email), schedule runs, and view history.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 mt-4 pr-1">
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
                {tasks.map((t) => {
                  const isExpanded = expandedTask === t.taskKey;
                  const taskScheduleForm = getTaskScheduleForm(t.taskKey);
                  return (
                    <div
                      key={t.taskKey}
                      className={`rounded-lg border bg-white shadow-sm dark:bg-white dark:text-slate-900 ${
                        isExpanded ? 'border-purple-300 dark:border-purple-300' : 'border-slate-200 dark:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between p-3">
                        <button
                          type="button"
                          onClick={() => setExpandedTask(isExpanded ? null : t.taskKey)}
                          className="min-w-0 flex-1 flex items-center gap-2 text-left"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 flex-shrink-0 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 flex-shrink-0 text-slate-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-900 dark:text-slate-900">{t.description}</p>
                            {t.taskKey !== t.description && (
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">{t.taskKey}</p>
                            )}
                          </div>
                        </button>
                        <Switch
                          checked={t.enabled}
                          onCheckedChange={(checked) => handleToggle(t.taskKey, checked)}
                          disabled={toggling === t.taskKey}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {isExpanded && canRun && (
                        <div className="border-t border-slate-200 p-4 space-y-3 dark:border-slate-200">
                          <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Run daily at
                          </h5>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-slate-700 text-xs">Time</Label>
                              <input
                                type="time"
                                value={taskScheduleForm.runAtTime}
                                onChange={(e) => updateTaskSchedule(t.taskKey, { runAtTime: e.target.value })}
                                className="flex h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </div>
                            <div className="space-y-1.5 min-w-[160px]">
                              <Label className="text-slate-700 text-xs">Timezone</Label>
                              <Select
                                value={taskScheduleForm.runAtTimezone}
                                onValueChange={(v) => updateTaskSchedule(t.taskKey, { runAtTimezone: v })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                                  <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                                  <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                                  <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                                  <SelectItem value="America/Toronto">Toronto (ET)</SelectItem>
                                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-slate-700 text-xs">Enable daily run</Label>
                            <Switch
                              checked={taskScheduleForm.enabled}
                              onCheckedChange={(v) => updateTaskSchedule(t.taskKey, { enabled: v })}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSaveTaskSchedule(t.taskKey)}
                            disabled={scheduleSaving}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {scheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save schedule'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit message templates — always visible so users know where to customize SMS/email */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-200 dark:bg-white">
            <button
              type="button"
              onClick={() => setTemplateOpen(!templateOpen)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-50/50"
            >
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-800">
                <FileText className="w-4 h-4 text-purple-600" />
                Message templates (SMS / email)
              </h4>
              {templateOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {templateOpen && (
              <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-200">
                {supportsTemplates ? (
                  <>
                    {isSmsEmployee && (
                      <div className="space-y-1.5">
                        <Label className="text-slate-700">SMS message</Label>
                        <textarea
                          value={template?.smsTemplate ?? ''}
                          onChange={(e) => {
                            setTemplate((p) => ({ ...p, smsTemplate: e.target.value }));
                            setTemplateDirty(true);
                          }}
                          placeholder="Hi {firstName}! ..."
                          rows={3}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <p className="text-xs text-slate-500">Placeholders: {'{firstName}'}, {'{contactPerson}'}, {'{businessName}'}</p>
                      </div>
                    )}
                    {isEmailEmployee && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">Email subject</Label>
                          <input
                            type="text"
                            value={template?.emailSubject ?? ''}
                            onChange={(e) => {
                              setTemplate((p) => ({ ...p, emailSubject: e.target.value }));
                              setTemplateDirty(true);
                            }}
                            placeholder="Friendly reminder: Invoice pending"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">Email body</Label>
                          <textarea
                            value={template?.emailBody ?? ''}
                            onChange={(e) => {
                              setTemplate((p) => ({ ...p, emailBody: e.target.value }));
                              setTemplateDirty(true);
                            }}
                            placeholder="Hi {firstName}, ..."
                            rows={4}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          />
                          <p className="text-xs text-slate-500">Placeholders: {'{firstName}'}, {'{contactPerson}'}, {'{businessName}'}</p>
                        </div>
                      </>
                    )}
                    {templateDirty && (
                      <Button
                        size="sm"
                        onClick={handleSaveTemplate}
                        disabled={templateSaving}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {templateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save templates'}
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    This employee doesn&apos;t send customizable SMS or email. Templates are available for: Speed to Lead, Appointment Coordinator, Patient Coordinator, Treatment Coordinator, and Billing Specialist.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Voice prompts */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-200 dark:bg-white">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-800">
              <Mic className="w-4 h-4 text-purple-600" />
              Voice prompts
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-2">
              Customize what this AI says on phone calls. Voice prompts are set when the agent is provisioned.
            </p>
            <a
              href={`/dashboard/voice-agents${agentId ? `?agentId=${agentId}` : ''}`}
              className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
            >
              Configure in Voice Agents →
            </a>
          </div>

          {/* Add custom task */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-200 dark:bg-white">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-800">
              <Plus className="w-4 h-4 text-purple-600" />
              Add custom task
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Add your own automated jobs (e.g. &quot;Send insurance claims daily at 5pm&quot;). This feature is in development — you can use the task toggles and per-task schedules above for now.
            </p>
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

          {canRun && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Expand a task above to set when it runs daily.
            </p>
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
