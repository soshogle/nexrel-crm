
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { aiWorkflowGenerator } from '@/lib/ai-workflow-generator';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        language: true,
      },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const body = await request.json();
    const { description } = body;

    if (!description) {
      return apiErrors.badRequest('Description is required');
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
      userLanguage: user.language || 'en',
      context: {
        existingPipelines: pipelines,
        availableChannels: channelConnections.map(c => c.channelType),
      },
    });

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Error generating workflow:', error);
    return apiErrors.internal('Failed to generate workflow', error.message);
  }
}
