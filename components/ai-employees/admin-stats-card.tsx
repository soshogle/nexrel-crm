'use client';

/**
 * Admin Stats Card - Phase 5
 * Shows platform-wide AI employee stats (ADMIN/SUPER_ADMIN only)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';

interface AdminStats {
  activeSchedules: number;
  uniqueUsersWithSchedules: number;
  industryExecutions24h: number;
  reExecutions24h: number;
  totalExecutions24h: number;
}

export function AdminStatsCard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai-employees/admin-stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.stats) setStats(d.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          <Shield className="w-4 h-4" />
          Admin: AI Employee Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-slate-500">Active schedules</span>
          <p className="font-semibold">{stats.activeSchedules}</p>
        </div>
        <div>
          <span className="text-slate-500">Users with schedules</span>
          <p className="font-semibold">{stats.uniqueUsersWithSchedules}</p>
        </div>
        <div>
          <span className="text-slate-500">Executions (24h)</span>
          <p className="font-semibold">{stats.totalExecutions24h}</p>
          <p className="text-xs text-slate-500">
            Industry: {stats.industryExecutions24h} · RE: {stats.reExecutions24h}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
