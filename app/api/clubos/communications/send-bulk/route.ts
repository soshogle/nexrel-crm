
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clubOSCommunicationService } from '@/lib/clubos-communication-service';
import { addDays, format } from 'date-fns';

// POST /api/clubos/communications/send-bulk - Send bulk notifications

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (!type) {
      return NextResponse.json({ error: 'Missing notification type' }, { status: 400 });
    }

    let sent = 0;

    if (type === 'schedule_reminders') {
      // Send reminders for tomorrow's events
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

      // Get all schedules for tomorrow
      const schedules = await prisma.clubOSSchedule.findMany({
        where: {
          userId: session.user.id,
          startTime: {
            gte: startOfTomorrow,
            lte: endOfTomorrow,
          },
          status: 'SCHEDULED',
        },
        include: {
          venue: true,
          homeTeam: {
            include: {
              members: {
                include: {
                  member: {
                    include: {
                      household: true,
                    },
                  },
                },
              },
            },
          },
          awayTeam: {
            include: {
              members: {
                include: {
                  member: {
                    include: {
                      household: true,
                    },
                  },
                },
              },
            },
          },
          practiceTeam: {
            include: {
              members: {
                include: {
                  member: {
                    include: {
                      household: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Send reminders to all participating families
      const householdsSent = new Set();

      for (const schedule of schedules) {
        const households: any[] = [];

        // Collect households from all teams
        if (schedule.homeTeam) {
          schedule.homeTeam.members.forEach((tm) => {
            if (tm.member.household && !householdsSent.has(tm.member.household.id)) {
              households.push(tm.member.household);
              householdsSent.add(tm.member.household.id);
            }
          });
        }
        if (schedule.awayTeam) {
          schedule.awayTeam.members.forEach((tm) => {
            if (tm.member.household && !householdsSent.has(tm.member.household.id)) {
              households.push(tm.member.household);
              householdsSent.add(tm.member.household.id);
            }
          });
        }
        if (schedule.practiceTeam) {
          schedule.practiceTeam.members.forEach((tm) => {
            if (tm.member.household && !householdsSent.has(tm.member.household.id)) {
              households.push(tm.member.household);
              householdsSent.add(tm.member.household.id);
            }
          });
        }

        // Send reminders
        for (const household of households) {
          try {
            await clubOSCommunicationService.sendScheduleReminder({
              parentName: household.primaryContactName,
              parentEmail: household.primaryContactEmail,
              parentPhone: household.primaryContactPhone,
              childName: '', // Not applicable for bulk reminders
              eventTitle: schedule.title,
              eventType: schedule.eventType,
              startTime: new Date(schedule.startTime),
              venueName: schedule.venue?.name || 'TBD',
              venueAddress: schedule.venue?.address || undefined,
            });
            sent++;
          } catch (error) {
            console.error('Failed to send reminder to', household.primaryContactEmail, error);
          }
        }
      }
    } else if (type === 'balance_reminders') {
      // Send reminders to families with outstanding balances
      const registrations = await prisma.clubOSRegistration.findMany({
        where: {
          household: {
            userId: session.user.id,
          },
          balanceDue: {
            gt: 0,
          },
          status: {
            in: ['APPROVED', 'ACTIVE'],
          },
        },
        include: {
          household: true,
          member: true,
          program: true,
          division: true,
        },
      });

      const householdsSent = new Set();

      for (const registration of registrations) {
        if (!householdsSent.has(registration.household.id)) {
          try {
            await clubOSCommunicationService.sendBalanceReminder({
              parentName: registration.household.primaryContactName,
              parentEmail: registration.household.primaryContactEmail,
              parentPhone: registration.household.primaryContactPhone,
              childName: `${registration.member.firstName} ${registration.member.lastName}`,
              programName: registration.program.name,
              balanceDue: registration.balanceDue,
              dueDate: registration.program.endDate,
            });
            householdsSent.add(registration.household.id);
            sent++;
          } catch (error) {
            console.error('Failed to send balance reminder to', registration.household.primaryContactEmail, error);
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      sent,
      message: `Successfully sent ${sent} notification(s)`,
    });
  } catch (error: any) {
    console.error('Error sending bulk notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
