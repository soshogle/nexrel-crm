
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { aiWorkflowGenerator } from '@/lib/ai-workflow-generator';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Get user's context
    const pipelines = await prisma.pipeline.findMany({
      where: { userId: user.id },
      include: {
        stages: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const channelConnections = await prisma.channelConnection.findMany({
      where: { userId: user.id },
      select: { channelType: true },
    });

    // Generate workflow using AI
    const workflow = await aiWorkflowGenerator.generateWorkflow({
      description,
      userId: user.id,
      context: {
        existingPipelines: pipelines,
        availableChannels: channelConnections.map(c => c.channelType),
      },
    });

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error generating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to generate workflow', details: error.message },
      { status: 500 }
    );
  }
}
