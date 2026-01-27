
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { aiTaskService } from '@/lib/ai-task-service';

export const dynamic = 'force-dynamic';

// POST /api/tasks/auto-create - Automatically create tasks based on events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, leadId, dealId, contactId, eventData, autoAccept = false } = body;

    // Generate AI suggestions
    const suggestions = await aiTaskService.generateTaskSuggestions({
      userId: session.user.id,
      leadId,
      dealId,
      contactId,
      eventType,
      eventData,
    });

    // If autoAccept is true, automatically create top suggestions
    if (autoAccept && suggestions.length > 0) {
      // Create tasks for top suggestions (confidence >= 80)
      const tasksToCreate = suggestions
        .filter(s => s.confidence >= 80)
        .slice(0, 3); // Limit to top 3

      const createdTasks = await Promise.all(
        tasksToCreate.map(async (suggestion) => {
          const task = await prisma.task.create({
            data: {
              title: suggestion.title,
              description: suggestion.description,
              priority: suggestion.priority,
              status: 'TODO',
              category: suggestion.category || null,
              dueDate: suggestion.dueDate,
              estimatedHours: suggestion.estimatedHours,
              tags: suggestion.tags || [],
              userId: session.user.id,
              leadId: leadId || null,
              dealId: dealId || null,
              aiSuggested: true,
              aiContext: {
                eventType,
                confidence: suggestion.confidence,
                reasoning: suggestion.reasoning,
              },
            },
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              lead: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              deal: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          });

          // Create activity log
          await prisma.taskActivity.create({
            data: {
              taskId: task.id,
              userId: session.user.id,
              action: 'CREATED',
              newValue: 'AI Generated',
              metadata: {
                aiGenerated: true,
                confidence: suggestion.confidence,
                eventType,
              },
            },
          });

          return task;
        })
      );

      return NextResponse.json({ 
        suggestions,
        createdTasks,
        message: `${createdTasks.length} task(s) automatically created`,
      });
    }

    // Otherwise, just return suggestions
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error auto-creating tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-create tasks' },
      { status: 500 }
    );
  }
}
