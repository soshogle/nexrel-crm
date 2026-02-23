
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

// GET /api/pipelines - Get all pipelines with stages and deals

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const ctx = getDalContextFromSession(session);
    const db = ctx ? getCrmDb(ctx) : prisma;
    // Use ctx.userId when available so pipeline/deal queries match (deal creation uses ctx.userId)
    const userId = ctx?.userId ?? user.id;

    const pagination = parsePagination(request);

    // Get or create default pipeline
    let pipelines = await db.pipeline.findMany({
      where: { userId },
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
      take: pagination.take,
      skip: pagination.skip,
      orderBy: { createdAt: 'asc' },
    });

    // Create default pipeline if none exists
    if (pipelines.length === 0) {
      const defaultPipeline = await db.pipeline.create({
        data: {
          name: 'Default Pipeline',
          description: 'Your default sales pipeline',
          userId,
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

    // Parse tags from JSON strings (safely - empty string or invalid JSON would crash)
    const pipelinesWithParsedTags = pipelines.map(pipeline => ({
      ...pipeline,
      stages: pipeline.stages.map(stage => ({
        ...stage,
        deals: stage.deals.map(deal => {
          let tags: string[] = [];
          if (deal.tags && typeof deal.tags === 'string' && deal.tags.trim()) {
            try {
              const parsed = JSON.parse(deal.tags);
              tags = Array.isArray(parsed) ? parsed : [];
            } catch {
              tags = [];
            }
          }
          return { ...deal, tags };
        }),
      })),
    }));

    const total = await db.pipeline.count({ where: { userId } });
    return paginatedResponse(pipelinesWithParsedTags, total, pagination, 'pipelines');
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    return apiErrors.internal('Failed to fetch pipelines');
  }
}

// POST /api/pipelines - Create new pipeline
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { name, description, color, stages } = await request.json();

    const ctx = getDalContextFromSession(session);
    const db = ctx ? getCrmDb(ctx) : prisma;

    const pipeline = await db.pipeline.create({
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
    return apiErrors.internal('Failed to create pipeline');
  }
}
