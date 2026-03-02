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

    // Generate recommendations based on CRM data
    const recommendations = [
      {
        id: 'rec-1',
        name: 'Lead follow-up automation',
        description: 'Automatically send follow-up emails 3 days after initial contact',
        trigger: 'When lead status is CONTACTED',
        actions: ['Send email', 'Create task', 'Update lead status'],
        expectedImpact: 'Increase conversion by 15%',
        automatable: true,
        priority: 'high' as const,
      },
      {
        id: 'rec-2',
        name: 'Deal stage notifications',
        description: 'Notify team when deals move to negotiation stage',
        trigger: 'When deal stage changes to Negotiation',
        actions: ['Send Slack notification', 'Create reminder task'],
        expectedImpact: 'Faster deal closure',
        automatable: true,
        priority: 'medium' as const,
      },
    ];

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
