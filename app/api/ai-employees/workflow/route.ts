/**
 * API endpoint for triggering multi-agent workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowEngine } from '@/lib/ai-employees/workflow-engine';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { triggerType, data, workflowConfig } = body;

    if (!triggerType) {
      return NextResponse.json(
        { error: 'triggerType is required' },
        { status: 400 }
      );
    }

    // Execute workflow
    console.log(`\n${'='.repeat(60)}`);
    console.log('🚀 AI EMPLOYEE WORKFLOW STARTING');
    console.log(`   User: ${session.user.email}`);
    console.log(`   Trigger: ${triggerType}`);
    if (workflowConfig) {
      console.log(`   Config: ${JSON.stringify(workflowConfig)}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    const result = await workflowEngine.executeOnboardingWorkflow({
      userId: session.user.id,
      triggerType,
      data: data || {},
      workflowConfig: workflowConfig || null
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('✨ WORKFLOW COMPLETED');
    console.log(`   Workflow ID: ${result.workflowId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Jobs Completed: ${result.jobs.length}`);
    console.log(`${'='.repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Workflow API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
