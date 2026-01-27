
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clubOSCommunicationService } from '@/lib/clubos-communication-service';

/**
 * ClubOS Registration API
 * Handles program registration with age-based division assignment,
 * capacity checking, waitlist management, and family discounts
 */

// Helper: Calculate age at August 1st of current year

export const dynamic = 'force-dynamic';

function calculateAgeAtCutoff(dateOfBirth: Date): number {
  const cutoffDate = new Date(new Date().getFullYear(), 7, 1); // August 1
  const age = cutoffDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = cutoffDate.getMonth() - dateOfBirth.getMonth();
  const dayDiff = cutoffDate.getDate() - dateOfBirth.getDate();
  
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1;
  }
  return age;
}

// Helper: Find appropriate division based on age and gender
async function assignDivision(
  programId: string,
  age: number,
  gender: string | null
) {
  const divisions = await prisma.clubOSDivision.findMany({
    where: {
      programId,
      ageMin: { lte: age },
      ageMax: { gte: age },
    },
  });

  if (divisions.length === 0) {
    return null;
  }

  // Try to match gender-specific division first
  const genderMatch = divisions.find(
    (d) => d.gender === gender || d.gender === null
  );

  return genderMatch || divisions[0];
}

// Helper: Calculate total fee with family discount
async function calculateTotalFee(
  programId: string,
  householdId: string
): Promise<number> {
  const program = await prisma.clubOSProgram.findUnique({
    where: { id: programId },
    select: {
      baseFee: true,
      familyDiscount: true,
      earlyBirdDiscount: true,
      earlyBirdDeadline: true,
    },
  });

  if (!program) throw new Error('Program not found');

  let totalFee = program.baseFee;

  // Apply early bird discount if applicable
  if (
    program.earlyBirdDiscount &&
    program.earlyBirdDeadline &&
    new Date() < program.earlyBirdDeadline
  ) {
    totalFee -= program.earlyBirdDiscount;
  }

  // Apply family discount if this is 2nd+ child
  const existingRegistrations = await prisma.clubOSRegistration.count({
    where: {
      householdId,
      programId,
      status: {
        in: ['PENDING', 'APPROVED', 'ACTIVE'],
      },
    },
  });

  if (existingRegistrations > 0 && program.familyDiscount) {
    totalFee -= program.familyDiscount;
  }

  return Math.max(0, totalFee); // Never go below 0
}

// Helper: Check program capacity and waitlist status
async function checkCapacity(programId: string) {
  const program = await prisma.clubOSProgram.findUnique({
    where: { id: programId },
    select: {
      maxParticipants: true,
      currentParticipants: true,
    },
  });

  if (!program) throw new Error('Program not found');

  if (!program.maxParticipants) {
    return { hasCapacity: true, needsWaitlist: false };
  }

  const hasCapacity = program.currentParticipants < program.maxParticipants;
  return { hasCapacity, needsWaitlist: !hasCapacity };
}

/**
 * POST /api/clubos/registrations
 * Create new registration with auto-assignment
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { householdId, memberId, programId, specialRequests } = body;

    // Validate required fields
    if (!householdId || !memberId || !programId) {
      return NextResponse.json(
        { error: 'Missing required fields: householdId, memberId, programId' },
        { status: 400 }
      );
    }

    // Verify member exists and get their info
    const member = await prisma.clubOSMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!member || !member.dateOfBirth) {
      return NextResponse.json(
        { error: 'Member not found or missing date of birth' },
        { status: 400 }
      );
    }

    // Calculate age at August 1 cutoff
    const age = calculateAgeAtCutoff(member.dateOfBirth);

    // Find appropriate division
    const division = await assignDivision(programId, age, member.gender);

    if (!division) {
      return NextResponse.json(
        {
          error: `No division found for age ${age}. Please contact administrator.`,
        },
        { status: 400 }
      );
    }

    // Calculate total fee with discounts
    const totalAmount = await calculateTotalFee(programId, householdId);

    // Check capacity
    const { hasCapacity, needsWaitlist } = await checkCapacity(programId);

    // Create registration
    const status = needsWaitlist ? 'WAITLIST' : 'PENDING';

    const registration = await prisma.clubOSRegistration.create({
      data: {
        householdId,
        memberId,
        programId,
        divisionId: division.id,
        status,
        totalAmount,
        balanceDue: totalAmount,
        specialRequests,
      },
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        program: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        division: {
          select: {
            name: true,
            practiceDay: true,
            practiceTime: true,
          },
        },
      },
    });

    // If waitlisted, create waitlist entry
    if (needsWaitlist) {
      const waitlistPosition = await prisma.clubOSWaitlist.count({
        where: {
          registration: {
            programId,
            status: 'WAITLIST',
          },
        },
      });

      await prisma.clubOSWaitlist.create({
        data: {
          registrationId: registration.id,
          position: waitlistPosition + 1,
        },
      });
    } else {
      // Increment participant count if not waitlisted
      await prisma.clubOSProgram.update({
        where: { id: programId },
        data: {
          currentParticipants: { increment: 1 },
        },
      });
    }

    // Send registration confirmation email/SMS
    try {
      // Get household and program details for notification
      const household = await prisma.clubOSHousehold.findUnique({
        where: { id: householdId },
      });
      
      const program = await prisma.clubOSProgram.findUnique({
        where: { id: programId },
      });

      if (household && program) {
        await clubOSCommunicationService.sendRegistrationConfirmation({
          parentName: household.primaryContactName,
          parentEmail: household.primaryContactEmail,
          parentPhone: household.primaryContactPhone,
          childName: `${member.firstName} ${member.lastName}`,
          programName: program.name,
          divisionName: division.name,
          totalAmount,
          status,
        });
      }
    } catch (notificationError) {
      console.error('Failed to send registration confirmation:', notificationError);
      // Don't fail the registration if notification fails
    }

    return NextResponse.json({
      success: true,
      registration,
      message: needsWaitlist
        ? `Registration added to waitlist. You are #${
            (await prisma.clubOSWaitlist.count({
              where: { registration: { programId } },
            })) + 1
          } in line.`
        : `Registration successful! ${member.firstName} has been registered for ${division.name}.`,
    });
  } catch (error: unknown) {
    console.error('Registration creation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/clubos/registrations
 * List registrations with filters
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const programId = searchParams.get('programId');
    const status = searchParams.get('status');
    const householdId = searchParams.get('householdId');

    const where: {
      program: { userId: string };
      programId?: string;
      status?: any;
      householdId?: string;
    } = {
      program: {
        userId: session.user.id,
      },
    };

    if (programId) where.programId = programId;
    if (status) where.status = status;
    if (householdId) where.householdId = householdId;

    const registrations = await prisma.clubOSRegistration.findMany({
      where,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            email: true,
            phone: true,
          },
        },
        program: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            programType: true,
          },
        },
        division: {
          select: {
            name: true,
            practiceDay: true,
            practiceTime: true,
          },
        },
        household: {
          select: {
            primaryContactName: true,
            primaryContactEmail: true,
            primaryContactPhone: true,
          },
        },
        waitlistEntry: {
          select: {
            position: true,
            notifiedDate: true,
            responseDeadline: true,
          },
        },
      },
      orderBy: {
        registrationDate: 'desc',
      },
    });

    // Get summary stats
    const stats = {
      total: registrations.length,
      pending: registrations.filter((r) => r.status === 'PENDING').length,
      approved: registrations.filter((r) => r.status === 'APPROVED').length,
      waitlist: registrations.filter((r) => r.status === 'WAITLIST').length,
      active: registrations.filter((r) => r.status === 'ACTIVE').length,
    };

    return NextResponse.json({
      success: true,
      registrations,
      stats,
    });
  } catch (error: unknown) {
    console.error('Registrations fetch error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
