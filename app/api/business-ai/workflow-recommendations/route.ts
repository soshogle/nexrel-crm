/**
 * Business AI Workflow Recommendations API
 * Returns AI-suggested workflow automations. Uses mock data when CRM has no data.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);
    const [leadCount, dealCount] = await Promise.all([
      leadService.count(ctx),
      db.deal.count({ where: { userId: session.user.id } }),
    ]);

    const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
    // Preserve demo behavior only for orthodontist demo account
    if (isOrthoDemo && leadCount === 0 && dealCount === 0) {
      const { MOCK_WORKFLOW_RECOMMENDATIONS } = await import('@/lib/mock-data');
      return NextResponse.json({
        success: true,
        recommendations: MOCK_WORKFLOW_RECOMMENDATIONS,
        generatedAt: new Date().toISOString(),
      });
    }

    if (leadCount === 0 && dealCount === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Gather real CRM data to produce relevant recommendations
    const userId = session.user.id;
    const [leads, staleDeals, taskStats] = await Promise.all([
      db.lead.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      db.deal.count({
        where: {
          userId,
          actualCloseDate: null,
          updatedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.task.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
    ]);

    const statusCounts = Object.fromEntries(
      leads.map(l => [l.status, l._count]),
    );
    const taskCounts = Object.fromEntries(
      taskStats.map(t => [t.status, t._count]),
    );

    const totalTasks = Object.values(taskCounts).reduce((s, c) => s + c, 0);
    const completedTasks = taskCounts['COMPLETED'] ?? 0;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

    const recommendations: {
      id: string;
      name: string;
      description: string;
      trigger: string;
      actions: string[];
      expectedImpact: string;
      automatable: boolean;
      priority: 'high' | 'medium' | 'low';
    }[] = [];

    let recIdx = 0;

    const newLeads = statusCounts['NEW'] ?? 0;
    if (newLeads >= 5) {
      recIdx++;
      recommendations.push({
        id: `rec-${recIdx}`,
        name: 'New-lead follow-up automation',
        description: `You have ${newLeads} leads stuck in NEW status. Set up an automatic follow-up sequence to move them forward.`,
        trigger: 'When lead status is NEW for more than 48 hours',
        actions: ['Send follow-up email', 'Create task for sales rep', 'Update lead status to CONTACTED'],
        expectedImpact: `Could engage up to ${newLeads} idle leads`,
        automatable: true,
        priority: 'high',
      });
    }

    if (staleDeals >= 3) {
      recIdx++;
      recommendations.push({
        id: `rec-${recIdx}`,
        name: 'Stale pipeline review',
        description: `${staleDeals} deals haven't been updated in over 2 weeks. Create a periodic review workflow to keep your pipeline fresh.`,
        trigger: 'Weekly on Monday at 9:00 AM',
        actions: ['Generate stale-deal report', 'Notify deal owners', 'Create follow-up tasks'],
        expectedImpact: `Re-activate ${staleDeals} stale deals`,
        automatable: true,
        priority: 'high',
      });
    }

    if (totalTasks > 10 && completionRate < 0.5) {
      recIdx++;
      recommendations.push({
        id: `rec-${recIdx}`,
        name: 'Task completion improvement',
        description: `Task completion rate is ${Math.round(completionRate * 100)}%. Consider auto-prioritizing and sending reminders for overdue tasks.`,
        trigger: 'Daily at 8:00 AM',
        actions: ['Check overdue tasks', 'Send reminder notifications', 'Escalate blocked tasks'],
        expectedImpact: 'Improve task completion rate',
        automatable: true,
        priority: 'medium',
      });
    }

    const contactedLeads = statusCounts['CONTACTED'] ?? 0;
    if (contactedLeads >= 5 && (statusCounts['RESPONDED'] ?? 0) < contactedLeads * 0.3) {
      recIdx++;
      recommendations.push({
        id: `rec-${recIdx}`,
        name: 'Re-engagement drip campaign',
        description: `${contactedLeads} contacted leads with low response rate. A drip campaign could re-engage them.`,
        trigger: 'When lead stays CONTACTED for 5+ days without response',
        actions: ['Enroll in drip sequence', 'Send multi-channel touchpoints', 'Track engagement'],
        expectedImpact: `Re-engage up to ${contactedLeads} unresponsive leads`,
        automatable: true,
        priority: 'medium',
      });
    }

    if (recommendations.length === 0) {
      recIdx++;
      recommendations.push({
        id: `rec-${recIdx}`,
        name: 'Deal stage notifications',
        description: 'Keep your team informed when deals progress through the pipeline.',
        trigger: 'When deal stage changes',
        actions: ['Send notification', 'Create follow-up task'],
        expectedImpact: 'Faster deal closure and team alignment',
        automatable: true,
        priority: 'low',
      });
    }

    return NextResponse.json({
      success: true,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Business AI workflow recommendations error:', error);
    return apiErrors.internal(error.message || 'Failed to generate workflow recommendations');
  }
}
