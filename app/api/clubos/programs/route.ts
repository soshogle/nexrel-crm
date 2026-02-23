
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/clubos/programs - Get all programs

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const programType = searchParams.get('programType');

    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (programType) where.programType = programType;

    const programs = await prisma.clubOSProgram.findMany({
      where,
      include: {
        divisions: {
          include: {
            teams: true,
          },
        },
        registrations: {
          include: {
            member: true,
          },
        },
        waivers: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ success: true, programs });
  } catch (error) {
    console.error('Error fetching programs:', error);
    return apiErrors.internal('Failed to fetch programs');
  }
}

// POST /api/clubos/programs - Create a new program
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

    const body = await request.json();
    const {
      name,
      description,
      programType,
      status,
      startDate,
      endDate,
      registrationOpenDate,
      registrationCloseDate,
      maxParticipants,
      baseFee,
      familyDiscount,
      earlyBirdDiscount,
      earlyBirdDeadline,
      ageMin,
      ageMax,
      imageUrl,
      tags,
    } = body;

    const program = await prisma.clubOSProgram.create({
      data: {
        userId: user.id,
        name,
        description,
        programType,
        status: status || 'DRAFT',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationOpenDate: registrationOpenDate ? new Date(registrationOpenDate) : null,
        registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate) : null,
        maxParticipants,
        baseFee,
        familyDiscount,
        earlyBirdDiscount,
        earlyBirdDeadline: earlyBirdDeadline ? new Date(earlyBirdDeadline) : null,
        ageMin,
        ageMax,
        imageUrl,
        tags: tags || [],
      },
      include: {
        divisions: true,
      },
    });

    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    console.error('Error creating program:', error);
    return apiErrors.internal('Failed to create program');
  }
}
