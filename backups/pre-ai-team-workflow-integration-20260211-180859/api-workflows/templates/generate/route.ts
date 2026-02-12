import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/workflows/templates/generate - AI generates workflow from user behavior
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pattern, name, description } = body;

    if (!pattern || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: pattern, name' },
        { status: 400 }
      );
    }

    // Analyze tool usage patterns to generate workflow
    const toolActions = await prisma.toolAction.findMany({
      where: {
        userId: session.user.id,
        success: true,
      },
      include: {
        instance: {
          include: {
            definition: true,
          },
        },
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
    });

    // Group actions by time windows to detect patterns
    // Simple pattern: tools used within 30 minutes of each other
    const timeWindow = 30 * 60 * 1000; // 30 minutes
    const sequences: any[] = [];
    let currentSequence: any[] = [];
    let lastTime: Date | null = null;

    for (const action of toolActions) {
      if (!lastTime || action.executedAt.getTime() - lastTime.getTime() < timeWindow) {
        currentSequence.push(action);
      } else {
        if (currentSequence.length > 1) {
          sequences.push([...currentSequence]);
        }
        currentSequence = [action];
      }
      lastTime = action.executedAt;
    }

    if (currentSequence.length > 1) {
      sequences.push(currentSequence);
    }

    // Find most common sequence pattern
    const patternMap = new Map<string, number>();
    for (const seq of sequences) {
      const key = seq.map((a: any) => a.actionType).join('->');
      patternMap.set(key, (patternMap.get(key) || 0) + 1);
    }

    const mostCommonPattern = Array.from(patternMap.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const confidence = mostCommonPattern
      ? mostCommonPattern[1] / sequences.length
      : 0;

    // Generate workflow nodes
    const nodes: any[] = [
      {
        id: 'trigger',
        type: 'TRIGGER',
        config: {
          triggerType: pattern.triggerType || 'MANUAL',
          description: 'Start the workflow',
        },
      },
    ];

    const edges: any[] = [];

    // Add tool action nodes based on detected pattern
    if (mostCommonPattern) {
      const actions = mostCommonPattern[0].split('->');
      actions.forEach((actionType: string, index: number) => {
        const nodeId = `action_${index + 1}`;
        nodes.push({
          id: nodeId,
          type: 'TOOL_ACTION',
          config: {
            actionType,
            description: `Execute ${actionType}`,
          },
        });

        // Connect to previous node
        const prevNodeId = index === 0 ? 'trigger' : `action_${index}`;
        edges.push({
          from: prevNodeId,
          to: nodeId,
        });
      });

      // Add end node
      nodes.push({
        id: 'end',
        type: 'END',
        config: {
          description: 'Workflow completed',
        },
      });

      edges.push({
        from: `action_${actions.length}`,
        to: 'end',
      });
    }

    // Create workflow template
    const template = await prisma.aIWorkflowTemplate.create({
      data: {
        name,
        description: description || `Auto-generated from user behavior: ${name}`,
        pattern: mostCommonPattern
          ? {
              sequence: mostCommonPattern[0],
              frequency: mostCommonPattern[1],
            }
          : {},
        confidence,
        detectedFromUserId: session.user.id,
        workflowDefinition: {
          version: '1.0',
          nodes,
          edges,
        },
        nodes,
        edges,
      },
    });

    return NextResponse.json({
      success: true,
      template,
      analysisDetails: {
        totalSequences: sequences.length,
        mostCommonPattern: mostCommonPattern?.[0],
        patternFrequency: mostCommonPattern?.[1],
        confidence,
      },
    });
  } catch (error: any) {
    console.error('Error generating workflow template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate workflow template' },
      { status: 500 }
    );
  }
}
