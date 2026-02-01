
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/pipelines - Get all pipelines with stages and deals

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

    // Get or create default pipeline
    let pipelines = await prisma.pipeline.findMany({
      where: { userId: user.id },
      include: {
        stages: {
          orderBy: { displayOrder: 'asc' },
          include: {
            deals: {
              include: {
                lead: {
                  select: {
                    id: true,
                    businessName: true,
                    contactPerson: true,
                    email: true,
                    phone: true,
                  },
                },
                assignedTo: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Create default pipeline if none exists
    if (pipelines.length === 0) {
      const defaultPipeline = await prisma.pipeline.create({
        data: {
          name: 'Default Pipeline',
          description: 'Your default sales pipeline',
          userId: user.id,
          isDefault: true,
          stages: {
            create: [
              { name: 'New Lead', displayOrder: 0, probability: 10 },
              { name: 'Contacted', displayOrder: 1, probability: 25 },
              { name: 'Qualified', displayOrder: 2, probability: 50 },
              { name: 'Proposal Sent', displayOrder: 3, probability: 75 },
              { name: 'Negotiation', displayOrder: 4, probability: 90 },
              { name: 'Closed Won', displayOrder: 5, probability: 100 },
            ],
          },
        },
        include: {
          stages: {
            orderBy: { displayOrder: 'asc' },
            include: {
              deals: {
                include: {
                  lead: true,
                  assignedTo: true,
                },
              },
            },
          },
        },
      });

      pipelines = [defaultPipeline];
    }

    // Parse tags from JSON strings
    const pipelinesWithParsedTags = pipelines.map(pipeline => ({
      ...pipeline,
      stages: pipeline.stages.map(stage => ({
        ...stage,
        deals: stage.deals.map(deal => ({
          ...deal,
          tags: deal.tags ? JSON.parse(deal.tags) : [],
        })),
      })),
    }));

    return NextResponse.json(pipelinesWithParsedTags);
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipelines' },
      { status: 500 }
    );
  }
}

// POST /api/pipelines - Create new pipeline
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

    const { name, description, color, stages } = await request.json();

    const pipeline = await prisma.pipeline.create({
      data: {
        name,
        description,
        color,
        userId: user.id,
        stages: stages ? {
          create: stages.map((stage: any, index: number) => ({
            name: stage.name,
            displayOrder: index,
            probability: stage.probability || 0,
          })),
        } : undefined,
      },
      include: {
        stages: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline' },
      { status: 500 }
    );
  }
}
