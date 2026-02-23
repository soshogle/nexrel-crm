'use client';

/**
 * Unified Activity Feed - Phase 3
 * Shows work done by both AI employees and humans in one place
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityItem {
  id: string;
  type: 'ai_industry' | 'ai_re' | 'human_task';
  date: string;
  title: string;
  summary?: string;
  status: string;
  source?: string;
  employeeType?: string;
  tasksCompleted?: number;
}

export function UnifiedActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-employees/unified-activity?limit=50&days=7');
      const data = await res.json();
      if (res.ok && data.items) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch {
      toast.error('Failed to load activity');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const getTypeIcon = (type: string) => {
    if (type === 'human_task') return <User className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  const getTypeBadge = (type: string) => {
    if (type === 'human_task') return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Human</Badge>;
    if (type === 'ai_industry') return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">AI Industry</Badge>;
    return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">AI RE</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Unified Activity
        </CardTitle>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Work completed by AI employees and your team in the last 7 days.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activity yet.</p>
            <p className="text-sm mt-1">Run AI employees or complete tasks to see them here.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900"
              >
                <div className="mt-0.5 text-slate-500">
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    {getTypeBadge(item.type)}
                    {item.tasksCompleted != null && item.tasksCompleted > 0 && (
                      <span className="text-xs text-slate-500">
                        {item.tasksCompleted} completed
                      </span>
                    )}
                  </div>
                  {item.summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
