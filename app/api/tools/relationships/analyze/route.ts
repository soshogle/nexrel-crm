import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/tools/relationships/analyze - Analyze tool usage patterns and create relationships
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tool actions for the user
    const actions = await prisma.toolAction.findMany({
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
      take: 500, // Analyze last 500 successful actions
    });

    // Group actions by instance pairs that occur within 30 minutes
    const timeWindow = 30 * 60 * 1000; // 30 minutes
    const pairMap = new Map<string, { count: number; successful: number }>();

    for (let i = 0; i < actions.length - 1; i++) {
      const action1 = actions[i];
      const action2 = actions[i + 1];

      const timeDiff = Math.abs(
        action1.executedAt.getTime() - action2.executedAt.getTime()
      );

      if (timeDiff < timeWindow) {
        const pairKey = `${action1.instanceId}->${action2.instanceId}`;
        const existing = pairMap.get(pairKey) || { count: 0, successful: 0 };
        pairMap.set(pairKey, {
          count: existing.count + 1,
          successful: existing.successful + (action1.success && action2.success ? 1 : 0),
        });
      }
    }

    // Create or update relationships
    const relationships = [];
    for (const [pairKey, stats] of pairMap.entries()) {
      const [sourceId, targetId] = pairKey.split('->');

      // Only create relationship if pattern occurs at least 3 times
      if (stats.count >= 3) {
        const strength = (stats.successful / stats.count) * 10; // 0-10 scale
        const aiConfidence = Math.min(stats.count / 10, 1); // Higher frequency = higher confidence

        const existing = await prisma.toolRelationship.findFirst({
          where: {
            userId: session.user.id,
            sourceInstanceId: sourceId,
            targetType: 'tool',
            targetId: targetId,
          },
        });

        if (existing) {
          // Update existing relationship
          const updated = await prisma.toolRelationship.update({
            where: { id: existing.id },
            data: {
              interactionCount: existing.interactionCount + stats.count,
              successfulUses: existing.successfulUses + stats.successful,
              strength,
              aiConfidence,
              lastUsedAt: new Date(),
            },
          });
          relationships.push(updated);
        } else {
          // Create new relationship
          const newRel = await prisma.toolRelationship.create({
            data: {
              userId: session.user.id,
              sourceInstanceId: sourceId,
              targetType: 'tool',
              targetId: targetId,
              relationshipType: 'triggers',
              strength,
              interactionCount: stats.count,
              successfulUses: stats.successful,
              aiConfidence,
              suggestedByAI: true,
              context: {
                detectedPattern: `${stats.count} uses within 30-minute windows`,
                successRate: `${Math.round((stats.successful / stats.count) * 100)}%`,
              },
            },
          });
          relationships.push(newRel);
        }
      }
    }

    // Detect usage patterns
    const patterns = await detectUsagePatterns(session.user.id, actions);

    return NextResponse.json({
      success: true,
      analysisResults: {
        totalActionsParsed: actions.length,
        relationshipsCreated: relationships.length,
        patternsDetected: patterns.length,
      },
      relationships,
      patterns,
    });
  } catch (error: any) {
    console.error('Error analyzing tool relationships:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze tool relationships' },
      { status: 500 }
    );
  }
}

// Helper function to detect usage patterns
async function detectUsagePatterns(userId: string, actions: any[]) {
  const patternMap = new Map<string, { count: number; toolIds: string[]; avgTime: number }>();
  const timeWindow = 60 * 60 * 1000; // 1 hour

  // Group actions into sessions
  const sessions: any[][] = [];
  let currentSession: any[] = [];
  let lastTime: Date | null = null;

  for (const action of actions) {
    if (!lastTime || action.executedAt.getTime() - lastTime.getTime() < timeWindow) {
      currentSession.push(action);
    } else {
      if (currentSession.length >= 3) {
        // Only consider sessions with 3+ tools
        sessions.push([...currentSession]);
      }
      currentSession = [action];
    }
    lastTime = action.executedAt;
  }

  if (currentSession.length >= 3) {
    sessions.push(currentSession);
  }

  // Analyze sessions for patterns
  for (const session of sessions) {
    const sequence = session.map((a: any) => a.actionType).join('->');
    const toolIds = session.map((a: any) => a.instanceId);
    const sessionTime = session[session.length - 1].executedAt.getTime() - session[0].executedAt.getTime();

    const existing = patternMap.get(sequence) || {
      count: 0,
      toolIds,
      avgTime: 0,
    };

    patternMap.set(sequence, {
      count: existing.count + 1,
      toolIds,
      avgTime: (existing.avgTime * existing.count + sessionTime) / (existing.count + 1),
    });
  }

  // Save detected patterns
  const patterns = [];
  for (const [sequence, stats] of patternMap.entries()) {
    if (stats.count >= 2) {
      // Pattern must occur at least twice
      const successRate = 0.85; // Placeholder - calculate from actual data
      const confidence = Math.min(stats.count / 5, 1);

      const existing = await prisma.toolUsagePattern.findFirst({
        where: {
          userId,
          patternName: sequence,
        },
      });

      if (existing) {
        const updated = await prisma.toolUsagePattern.update({
          where: { id: existing.id },
          data: {
            detectedCount: existing.detectedCount + stats.count,
            lastDetectedAt: new Date(),
          },
        });
        patterns.push(updated);
      } else {
        const newPattern = await prisma.toolUsagePattern.create({
          data: {
            userId,
            patternName: sequence,
            description: `Detected pattern: ${sequence.replace(/->/g, ' → ')}`,
            toolInstanceIds: stats.toolIds,
            executionOrder: sequence.split('->').map((step: string, i: number) => ({
              step: i + 1,
              action: step,
              toolId: stats.toolIds[i],
            })),
            detectedCount: stats.count,
            successRate,
            avgTimeSaved: Math.round(stats.avgTime / 60000), // Convert to minutes
            confidence,
            recommendation:
              confidence > 0.7
                ? 'This pattern is strong enough to automate. Consider creating a workflow.'
                : 'Pattern detected but needs more occurrences for automation.',
          },
        });
        patterns.push(newPattern);
      }
    }
  }

  return patterns;
}
