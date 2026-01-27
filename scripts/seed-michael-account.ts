/**
 * Seed script specifically for michaelmendenow@gmail.com account
 * Adds comprehensive ClubOS mock data for demo purposes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting data seeding for michaelmendeznow@gmail.com...\n');

  // Get the specific user
  const user = await prisma.user.findUnique({
    where: { email: 'michaelmendeznow@gmail.com' },
  });

  if (!user) {
    throw new Error('User michaelmendeznow@gmail.com not found in database. Please sign up first.');
  }

  console.log(`✅ Found user: ${user.name} (${user.email})\n`);

  // ===================
  // VENUES
  // ===================
  console.log('🏟️  Creating Venues...');
  
  const mainField = await prisma.clubOSVenue.upsert({
    where: { id: 'venue-michael-main-field' },
    update: {},
    create: {
      id: 'venue-michael-main-field',
      userId: user.id,
      name: 'Champions Soccer Complex',
      address: '789 Victory Lane',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      venueType: 'FIELD',
      capacity: 250,
      hasLighting: true,
      hasParking: true,
      hasRestrooms: true,
      notes: 'State-of-the-art soccer facility with artificial turf and stadium seating.',
      isActive: true,
    },
  });

  const court1 = await prisma.clubOSVenue.upsert({
    where: { id: 'venue-michael-basketball-court' },
    update: {},
    create: {
      id: 'venue-michael-basketball-court',
      userId: user.id,
      name: 'Hoops Arena',
      address: '456 Dunk Street',
      city: 'Miami',
      state: 'FL',
      zipCode: '33102',
      venueType: 'COURT',
      capacity: 180,
      hasLighting: true,
      hasParking: true,
      hasRestrooms: true,
      notes: 'Professional indoor basketball facility with NBA-standard courts.',
      isActive: true,
    },
  });

  const baseballField = await prisma.clubOSVenue.upsert({
    where: { id: 'venue-michael-baseball' },
    update: {},
    create: {
      id: 'venue-michael-baseball',
      userId: user.id,
      name: 'Grand Slam Field',
      address: '321 Home Run Ave',
      city: 'Miami',
      state: 'FL',
      zipCode: '33103',
      venueType: 'FIELD',
      capacity: 300,
      hasLighting: true,
      hasParking: true,
      hasRestrooms: true,
      notes: 'Premium baseball diamond with professional-grade infield.',
      isActive: true,
    },
  });

  console.log(`  ✅ Champions Soccer Complex`);
  console.log(`  ✅ Hoops Arena`);
  console.log(`  ✅ Grand Slam Field\n`);

  // ===================
  // PROGRAMS
  // ===================
  console.log('🏆 Creating Programs...');

  const soccerProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-michael-spring-soccer' },
    update: {},
    create: {
      id: 'program-michael-spring-soccer',
      userId: user.id,
      name: 'Elite Spring Soccer Academy 2025',
      description: 'Premier youth soccer program focusing on skill development and competitive play. Ages 5-14.',
      programType: 'LEAGUE',
      tags: ['soccer', 'youth', 'competitive'],
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-06-15'),
      registrationOpenDate: new Date('2025-01-01'),
      registrationCloseDate: new Date('2025-02-28'),
      earlyBirdDeadline: new Date('2025-02-10'),
      ageMin: 5,
      ageMax: 14,
      status: 'OPEN',
      maxParticipants: 150,
      baseFee: 19900, // $199.00
      familyDiscount: 3000, // $30.00 off for 2nd+ child
      earlyBirdDiscount: 2000, // $20.00 early bird discount
    },
  });

  const basketballProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-michael-summer-basketball' },
    update: {},
    create: {
      id: 'program-michael-summer-basketball',
      userId: user.id,
      name: 'Summer Hoops Skills Camp 2025',
      description: 'Intensive basketball training camp with professional coaches. All skill levels welcome!',
      programType: 'CAMP',
      tags: ['basketball', 'camp', 'skills', 'training'],
      startDate: new Date('2025-06-20'),
      endDate: new Date('2025-08-10'),
      registrationOpenDate: new Date('2025-03-15'),
      registrationCloseDate: new Date('2025-06-15'),
      earlyBirdDeadline: new Date('2025-05-20'),
      ageMin: 8,
      ageMax: 16,
      status: 'OPEN',
      maxParticipants: 100,
      baseFee: 29900, // $299.00
      familyDiscount: 4000, // $40.00 off for 2nd+ child
      earlyBirdDiscount: 3000, // $30.00 early bird discount
    },
  });

  console.log(`  ✅ Elite Spring Soccer Academy 2025`);
  console.log(`  ✅ Summer Hoops Skills Camp 2025\n`);

  // ===================
  // DIVISIONS
  // ===================
  console.log('📊 Creating Divisions...');

  const u6Soccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u6-soccer' },
    update: {},
    create: {
      id: 'div-michael-u6-soccer',
      programId: soccerProgram.id,
      name: 'U6 Tiny Kickers (Co-Ed)',
      // gender: optional - co-ed division
      ageMin: 5,
      ageMax: 6,
      skillLevel: 'Beginner',
      maxTeams: 3,
      maxPlayersPerTeam: 8,
      practiceDay: 'Saturday',
      practiceTime: '9:00 AM - 10:00 AM',
    },
  });

  const u8BoySoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u8-boys' },
    update: {},
    create: {
      id: 'div-michael-u8-boys',
      programId: soccerProgram.id,
      name: 'U8 Boys Strikers',
      gender: 'MALE',
      ageMin: 7,
      ageMax: 8,
      skillLevel: 'Beginner',
      maxTeams: 2,
      maxPlayersPerTeam: 10,
      practiceDay: 'Wednesday',
      practiceTime: '4:30 PM - 5:30 PM',
    },
  });

  const u8GirlSoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u8-girls' },
    update: {},
    create: {
      id: 'div-michael-u8-girls',
      programId: soccerProgram.id,
      name: 'U8 Girls All-Stars',
      gender: 'FEMALE',
      ageMin: 7,
      ageMax: 8,
      skillLevel: 'Beginner',
      maxTeams: 2,
      maxPlayersPerTeam: 10,
      practiceDay: 'Thursday',
      practiceTime: '4:30 PM - 5:30 PM',
    },
  });

  const u10BoySoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u10-boys' },
    update: {},
    create: {
      id: 'div-michael-u10-boys',
      programId: soccerProgram.id,
      name: 'U10 Boys Champions',
      gender: 'MALE',
      ageMin: 9,
      ageMax: 10,
      skillLevel: 'Intermediate',
      maxTeams: 2,
      maxPlayersPerTeam: 12,
      practiceDay: 'Tuesday',
      practiceTime: '5:00 PM - 6:00 PM',
    },
  });

  const u12GirlSoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u12-girls' },
    update: {},
    create: {
      id: 'div-michael-u12-girls',
      programId: soccerProgram.id,
      name: 'U12 Girls Elite',
      gender: 'FEMALE',
      ageMin: 11,
      ageMax: 12,
      skillLevel: 'Advanced',
      maxTeams: 2,
      maxPlayersPerTeam: 14,
      practiceDay: 'Monday',
      practiceTime: '5:30 PM - 6:30 PM',
    },
  });

  const u10Basketball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u10-basketball' },
    update: {},
    create: {
      id: 'div-michael-u10-basketball',
      programId: basketballProgram.id,
      name: 'U10 Future Stars',
      ageMin: 8,
      ageMax: 10,
      skillLevel: 'Beginner/Intermediate',
      maxTeams: 3,
      maxPlayersPerTeam: 10,
      practiceDay: 'Friday',
      practiceTime: '4:00 PM - 5:30 PM',
    },
  });

  const u14Basketball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-michael-u14-basketball' },
    update: {},
    create: {
      id: 'div-michael-u14-basketball',
      programId: basketballProgram.id,
      name: 'U14 Hoops Elite',
      ageMin: 11,
      ageMax: 14,
      skillLevel: 'Advanced',
      maxTeams: 2,
      maxPlayersPerTeam: 12,
      practiceDay: 'Saturday',
      practiceTime: '10:00 AM - 12:00 PM',
    },
  });

  console.log(`  ✅ 7 Divisions created (Soccer & Basketball)\n`);

  // ===================
  // HOUSEHOLD & FAMILY
  // ===================
  console.log('👨‍👩‍👧‍👦 Creating Household...');

  const household = await prisma.clubOSHousehold.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      primaryContactName: 'Michael Mendeno',
      primaryContactEmail: user.email || 'michaelmendeznow@gmail.com',
      primaryContactPhone: '+13055551234',
      address: '123 Ocean Drive',
      city: 'Miami',
      state: 'FL',
      zipCode: '33139',
      emergencyContact: 'Sarah Mendeno',
      emergencyPhone: '+13055555678',
      notes: 'Demo household for Michael Mendeno',
    },
  });

  console.log(`  ✅ Household created for Michael Mendeno\n`);

  // ===================
  // MEMBERS (Children)
  // ===================
  console.log('👦👧 Creating Family Members...');

  const members = [
    { id: 'member-michael-alex', firstName: 'Alex', lastName: 'Mendeno', dateOfBirth: new Date('2017-04-15'), gender: 'MALE' as const },
    { id: 'member-michael-sophia', firstName: 'Sophia', lastName: 'Mendeno', dateOfBirth: new Date('2015-09-22'), gender: 'FEMALE' as const },
    { id: 'member-michael-james', firstName: 'James', lastName: 'Mendeno', dateOfBirth: new Date('2016-11-08'), gender: 'MALE' as const },
    { id: 'member-michael-emma', firstName: 'Emma', lastName: 'Mendeno', dateOfBirth: new Date('2013-06-30'), gender: 'FEMALE' as const },
    { id: 'member-michael-daniel', firstName: 'Daniel', lastName: 'Mendeno', dateOfBirth: new Date('2018-02-14'), gender: 'MALE' as const },
  ];

  for (const m of members) {
    await prisma.clubOSMember.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        householdId: household.id,
        firstName: m.firstName,
        lastName: m.lastName,
        dateOfBirth: m.dateOfBirth,
        gender: m.gender,
        memberType: 'PLAYER',
        medicalNotes: 'None',
        waiverSigned: true,
        waiverSignedDate: new Date(),
      },
    });
  }

  console.log(`  ✅ 5 Family members created\n`);

  // ===================
  // REGISTRATIONS
  // ===================
  console.log('📝 Creating Registrations...');

  const registrations = [
    { id: 'reg-michael-alex', memberId: 'member-michael-alex', programId: soccerProgram.id, divisionId: u8BoySoccer.id, status: 'ACTIVE' as const },
    { id: 'reg-michael-sophia', memberId: 'member-michael-sophia', programId: soccerProgram.id, divisionId: u12GirlSoccer.id, status: 'ACTIVE' as const },
    { id: 'reg-michael-james', memberId: 'member-michael-james', programId: soccerProgram.id, divisionId: u10BoySoccer.id, status: 'APPROVED' as const },
    { id: 'reg-michael-emma', memberId: 'member-michael-emma', programId: basketballProgram.id, divisionId: u14Basketball.id, status: 'ACTIVE' as const },
    { id: 'reg-michael-daniel', memberId: 'member-michael-daniel', programId: basketballProgram.id, divisionId: u10Basketball.id, status: 'PENDING' as const },
  ];

  for (const r of registrations) {
    const isActive = r.status === 'ACTIVE';
    const isApproved = r.status === 'APPROVED';
    const totalAmount = r.programId === soccerProgram.id ? soccerProgram.baseFee : basketballProgram.baseFee;
    
    await prisma.clubOSRegistration.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        householdId: household.id,
        memberId: r.memberId,
        programId: r.programId,
        divisionId: r.divisionId,
        status: r.status,
        registrationDate: new Date(),
        totalAmount: totalAmount,
        amountPaid: isActive ? totalAmount : (isApproved ? Math.floor(totalAmount * 0.6) : 0),
        balanceDue: isActive ? 0 : (isApproved ? Math.floor(totalAmount * 0.4) : totalAmount),
        waiverSignedDate: new Date(),
        specialRequests: 'Demo registration for testing',
      },
    });
  }

  console.log(`  ✅ 5 Registrations created`);
  console.log(`    • 3 Active (fully paid)`);
  console.log(`    • 1 Approved (partial payment)`);
  console.log(`    • 1 Pending\n`);

  // ===================
  // TEAMS
  // ===================
  console.log('⚽ Creating Teams...');

  const teams = [
    { id: 'team-michael-dynamos', divisionId: u8BoySoccer.id, name: 'Dynamos', color: '#FF6B35' },
    { id: 'team-michael-stars', divisionId: u8GirlSoccer.id, name: 'Stars', color: '#F7931E' },
    { id: 'team-michael-lightning', divisionId: u10BoySoccer.id, name: 'Lightning', color: '#4ECDC4' },
    { id: 'team-michael-warriors', divisionId: u12GirlSoccer.id, name: 'Warriors', color: '#9B59B6' },
    { id: 'team-michael-phoenix', divisionId: u10Basketball.id, name: 'Phoenix', color: '#E74C3C' },
    { id: 'team-michael-titans', divisionId: u14Basketball.id, name: 'Titans', color: '#3498DB' },
  ];

  for (const t of teams) {
    await prisma.clubOSTeam.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        divisionId: t.divisionId,
        name: t.name,
        colorPrimary: t.color,
        status: 'ACTIVE',
      },
    });
  }

  console.log(`  ✅ 6 Teams created\n`);

  // ===================
  // TEAM MEMBERSHIPS
  // ===================
  console.log('👥 Assigning players to teams...');

  const teamMemberships = [
    { teamId: 'team-michael-dynamos', memberId: 'member-michael-alex', jerseyNumber: '10' },
    { teamId: 'team-michael-warriors', memberId: 'member-michael-sophia', jerseyNumber: '7' },
    { teamId: 'team-michael-lightning', memberId: 'member-michael-james', jerseyNumber: '11' },
    { teamId: 'team-michael-titans', memberId: 'member-michael-emma', jerseyNumber: '23' },
    { teamId: 'team-michael-phoenix', memberId: 'member-michael-daniel', jerseyNumber: '5' },
  ];

  for (const tm of teamMemberships) {
    await prisma.clubOSTeamMember.upsert({
      where: {
        teamId_memberId: {
          teamId: tm.teamId,
          memberId: tm.memberId,
        },
      },
      update: {},
      create: {
        teamId: tm.teamId,
        memberId: tm.memberId,
        jerseyNumber: tm.jerseyNumber,
        role: 'PLAYER',
      },
    });
  }

  console.log(`  ✅ 5 team memberships created\n`);

  // ===================
  // SCHEDULES (EXTENSIVE MOCK DATA)
  // ===================
  console.log('📅 Creating Schedules (many upcoming events)...');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const schedules = [
    // TODAY'S EVENTS
    {
      id: 'schedule-michael-today-1',
      eventType: 'PRACTICE',
      title: 'Dynamos Evening Practice',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-dynamos',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-today-2',
      eventType: 'PRACTICE',
      title: 'Warriors Team Practice',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-warriors',
      status: 'SCHEDULED',
    },

    // TOMORROW'S EVENTS
    {
      id: 'schedule-michael-tomorrow-1',
      eventType: 'GAME',
      title: 'Lightning vs Stars - Season Opener',
      startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0),
      endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0),
      venueId: mainField.id,
      homeTeamId: 'team-michael-lightning',
      awayTeamId: 'team-michael-stars',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-tomorrow-2',
      eventType: 'PRACTICE',
      title: 'Phoenix Skills Training',
      startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0),
      endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 17, 30),
      venueId: court1.id,
      practiceTeamId: 'team-michael-phoenix',
      status: 'SCHEDULED',
    },

    // DAY 3
    {
      id: 'schedule-michael-day3-1',
      eventType: 'PRACTICE',
      title: 'Dynamos Defense Drills',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 16, 30),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 17, 30),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-dynamos',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-day3-2',
      eventType: 'PRACTICE',
      title: 'Titans Scrimmage',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 10, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0),
      venueId: court1.id,
      practiceTeamId: 'team-michael-titans',
      status: 'SCHEDULED',
    },

    // DAY 4
    {
      id: 'schedule-michael-day4-1',
      eventType: 'GAME',
      title: 'Dynamos vs Warriors - Championship',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 15, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 16, 0),
      venueId: mainField.id,
      homeTeamId: 'team-michael-dynamos',
      awayTeamId: 'team-michael-warriors',
      status: 'SCHEDULED',
    },

    // DAY 5
    {
      id: 'schedule-michael-day5-1',
      eventType: 'PRACTICE',
      title: 'Lightning Team Building',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 17, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 18, 0),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-lightning',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-day5-2',
      eventType: 'PRACTICE',
      title: 'Phoenix Conditioning',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 16, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 17, 30),
      venueId: court1.id,
      practiceTeamId: 'team-michael-phoenix',
      status: 'SCHEDULED',
    },

    // DAY 6 (SATURDAY)
    {
      id: 'schedule-michael-day6-1',
      eventType: 'GAME',
      title: 'Phoenix vs Titans - Rivalry Match',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 11, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 12, 30),
      venueId: court1.id,
      homeTeamId: 'team-michael-phoenix',
      awayTeamId: 'team-michael-titans',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-day6-2',
      eventType: 'PRACTICE',
      title: 'Warriors Game Preparation',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 14, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 15, 30),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-warriors',
      status: 'SCHEDULED',
    },

    // DAY 7 (SUNDAY)
    {
      id: 'schedule-michael-day7-1',
      eventType: 'TOURNAMENT',
      title: 'Spring Cup Soccer Tournament',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 8, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 17, 0),
      venueId: mainField.id,
      status: 'SCHEDULED',
    },

    // WEEK 2
    {
      id: 'schedule-michael-week2-1',
      eventType: 'PRACTICE',
      title: 'Dynamos Tactics Session',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 16, 30),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 17, 30),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-dynamos',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-week2-2',
      eventType: 'GAME',
      title: 'Lightning vs Dynamos - Derby',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 15, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 16, 0),
      venueId: mainField.id,
      homeTeamId: 'team-michael-lightning',
      awayTeamId: 'team-michael-dynamos',
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-week2-3',
      eventType: 'PRACTICE',
      title: 'Titans Advanced Drills',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 10, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 12, 0),
      venueId: court1.id,
      practiceTeamId: 'team-michael-titans',
      status: 'SCHEDULED',
    },

    // WEEK 3
    {
      id: 'schedule-michael-week3-1',
      eventType: 'MEETING',
      title: 'Parent-Coach Meeting',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 18, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 19, 0),
      venueId: mainField.id,
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-michael-week3-2',
      eventType: 'TRYOUT',
      title: 'Summer Camp Tryouts',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15, 14, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15, 16, 0),
      venueId: court1.id,
      status: 'SCHEDULED',
    },

    // PAST EVENTS (for history)
    {
      id: 'schedule-michael-past-1',
      eventType: 'GAME',
      title: 'Dynamos vs Stars - Season Finale',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 14, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 15, 0),
      venueId: mainField.id,
      homeTeamId: 'team-michael-dynamos',
      awayTeamId: 'team-michael-stars',
      status: 'COMPLETED',
    },
    {
      id: 'schedule-michael-past-2',
      eventType: 'PRACTICE',
      title: 'Warriors Last Week Practice',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 30),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 18, 30),
      venueId: mainField.id,
      practiceTeamId: 'team-michael-warriors',
      status: 'COMPLETED',
    },
  ];

  for (const s of schedules) {
    await prisma.clubOSSchedule.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: user.id,
        eventType: s.eventType as any,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        venueId: s.venueId,
        homeTeamId: s.homeTeamId,
        awayTeamId: s.awayTeamId,
        practiceTeamId: s.practiceTeamId,
        status: s.status as any,
      },
    });
  }

  console.log(`  ✅ ${schedules.length} Schedules created (including today, tomorrow, and next 3 weeks)\n`);

  // ===================
  // PAYMENTS
  // ===================
  console.log('💳 Creating Payment Records...');

  const payments = [
    // Full payments (ACTIVE registrations)
    {
      id: 'payment-michael-alex-full',
      householdId: household.id,
      registrationId: 'reg-michael-alex',
      amount: soccerProgram.baseFee,
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      description: 'Registration fee - Alex Mendeno - Elite Spring Soccer Academy',
      paidAt: new Date('2025-02-05T11:30:00'),
    },
    {
      id: 'payment-michael-sophia-full',
      householdId: household.id,
      registrationId: 'reg-michael-sophia',
      amount: soccerProgram.baseFee,
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      description: 'Registration fee - Sophia Mendeno - Elite Spring Soccer Academy',
      paidAt: new Date('2025-02-05T11:30:00'),
    },
    {
      id: 'payment-michael-emma-full',
      householdId: household.id,
      registrationId: 'reg-michael-emma',
      amount: basketballProgram.baseFee,
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      description: 'Registration fee - Emma Mendeno - Summer Hoops Skills Camp',
      paidAt: new Date('2025-05-15T14:20:00'),
    },
    // Partial payment (APPROVED registration)
    {
      id: 'payment-michael-james-partial',
      householdId: household.id,
      registrationId: 'reg-michael-james',
      amount: Math.floor(soccerProgram.baseFee * 0.6), // 60% paid
      paymentMethod: 'DEBIT_CARD',
      status: 'PAID',
      description: 'Partial payment - James Mendeno - Elite Spring Soccer Academy',
      paidAt: new Date('2025-02-12T09:45:00'),
    },
  ];

  for (const p of payments) {
    await prisma.clubOSPayment.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        householdId: p.householdId,
        registrationId: p.registrationId,
        amount: p.amount,
        paymentMethod: p.paymentMethod as any,
        status: p.status as any,
        description: p.description,
        paidAt: p.paidAt,
        createdAt: p.paidAt,
      },
    });
  }

  // Update James's registration balance
  await prisma.clubOSRegistration.update({
    where: { id: 'reg-michael-james' },
    data: {
      amountPaid: Math.floor(soccerProgram.baseFee * 0.6),
      balanceDue: Math.floor(soccerProgram.baseFee * 0.4),
    },
  });

  const totalPaid = soccerProgram.baseFee * 2 + basketballProgram.baseFee + Math.floor(soccerProgram.baseFee * 0.6);
  const balanceDue = Math.floor(soccerProgram.baseFee * 0.4) + basketballProgram.baseFee; // James's balance + Daniel's full amount

  console.log(`  ✅ 4 Payment records created`);
  console.log(`    • 3 Full payments (Alex, Sophia, Emma)`);
  console.log(`    • 1 Partial payment (James - 60% paid)`);
  console.log(`    • Total paid: $${(totalPaid / 100).toFixed(2)}`);
  console.log(`    • Balance due: $${(balanceDue / 100).toFixed(2)}\n`);

  console.log('✅ ClubOS Data Complete!\n');
  console.log('✨ Seeding Complete for michaelmendeznow@gmail.com!\n');
  console.log('📊 Summary:');
  console.log(`\n  ClubOS System for Michael Mendeno:`);
  console.log(`  • 3 Venues (Champions Soccer Complex, Hoops Arena, Grand Slam Field)`);
  console.log(`  • 2 Programs (Soccer Academy & Basketball Camp)`);
  console.log(`  • 7 Divisions`);
  console.log(`  • 1 Household (Michael Mendeno)`);
  console.log(`  • 5 Family Members (Alex, Sophia, James, Emma, Daniel)`);
  console.log(`  • 5 Registrations (3 Active, 1 Approved, 1 Pending)`);
  console.log(`  • 6 Teams (Dynamos, Stars, Lightning, Warriors, Phoenix, Titans)`);
  console.log(`  • 5 Team Memberships`);
  console.log(`  • 19 Schedules (today, tomorrow, next 3 weeks + past events)`);
  console.log(`  • 4 Payments ($${(totalPaid / 100).toFixed(2)} paid, $${(balanceDue / 100).toFixed(2)} balance due)`);
  
  console.log('\n🎯 Next Steps - Test These Pages:');
  console.log('  1. Log in as michaelmendeznow@gmail.com');
  console.log('  2. Visit /dashboard - Main dashboard overview');
  console.log('  3. Visit /dashboard/clubos/teams - Manage 6 teams');
  console.log('  4. Visit /dashboard/clubos/schedules - View 19 scheduled events');
  console.log('  5. Visit /dashboard/clubos/communications - Configure automatic notifications');
  console.log('  6. Visit /dashboard/clubos/parent-portal - Manage parent signups');
  console.log('  7. Visit /dashboard/clubos/admin - Approve/manage registrations\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  /*
  // SKIPPED - LEADS, REVIEWS, COMMUNICATIONS (models require complex relations)
  // To add these, create a separate script with proper Campaign relations
  
  // ===================
  // LEADS (CONTACTS)
  // ===================
  console.log('📧 Creating Leads (Contacts)...');

  const leads = [
    {
      id: 'lead-parent-sarah',
      businessName: 'Sarah Johnson - Parent Inquiry',
      contactPerson: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+13055551234',
      source: 'REFERRAL',
      status: 'QUALIFIED',
    },
    {
      id: 'lead-parent-mike',
      businessName: 'Mike Rodriguez - Parent Inquiry',
      contactPerson: 'Mike Rodriguez',
      email: 'mike.r@email.com',
      phone: '+13055555678',
      source: 'WEBSITE',
      status: 'NEW',
    },
    {
      id: 'lead-parent-lisa',
      businessName: 'Lisa Chen - Parent Inquiry',
      contactPerson: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '+13055559012',
      source: 'REFERRAL',
      status: 'CONTACTED',
    },
    {
      id: 'lead-vendor-uniforms',
      businessName: 'Sports Uniforms Plus',
      contactPerson: 'Tom Anderson',
      email: 'tom@sportsuniformsplus.com',
      phone: '+18005551111',
      source: 'manual',
      status: 'QUALIFIED',
    },
    {
      id: 'lead-parent-jennifer',
      businessName: 'Jennifer Martinez - Parent Inquiry',
      contactPerson: 'Jennifer Martinez',
      email: 'jen.martinez@email.com',
      phone: '+13055557890',
      source: 'WEBSITE',
      status: 'NEW',
    },
  ];

  for (const l of leads) {
    await prisma.lead.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        userId: user.id,
        businessName: l.businessName,
        contactPerson: l.contactPerson,
        email: l.email,
        phone: l.phone,
        source: l.source,
        status: l.status as any,
      },
    });
  }

  // Create notes on leads
  const notes = [
    {
      id: 'note-sarah-1',
      leadId: 'lead-parent-sarah',
      content: 'Interested in Spring Soccer program for her 10-year-old son. Very engaged parent, asked detailed questions about practice schedule.',
      createdAt: new Date('2025-11-18T10:30:00'),
    },
    {
      id: 'note-mike-1',
      leadId: 'lead-parent-mike',
      content: 'Called inquiring about basketball camp. Has a 12-year-old daughter. Needs to check family schedule before committing.',
      createdAt: new Date('2025-11-19T14:20:00'),
    },
    {
      id: 'note-lisa-1',
      leadId: 'lead-parent-lisa',
      content: 'On waitlist for U8 Girls Soccer. Very interested, willing to wait for spot to open up.',
      createdAt: new Date('2025-11-20T09:00:00'),
    },
    {
      id: 'note-vendor-1',
      leadId: 'lead-vendor-uniforms',
      content: 'Jersey supplier - great pricing and fast turnaround. Quoted $1,260 for 45 custom jerseys with 2-week delivery.',
      createdAt: new Date('2025-11-17T13:45:00'),
    },
    {
      id: 'note-jennifer-1',
      leadId: 'lead-parent-jennifer',
      content: 'New to Miami, son loves baseball. Interested in programs for 9-year-olds. Sent info about Spring Baseball program.',
      createdAt: new Date('2025-11-21T08:30:00'),
    },
  ];

  for (const n of notes) {
    await prisma.note.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        userId: user.id,
        leadId: n.leadId,
        content: n.content,
        createdAt: n.createdAt,
      },
    });
  }

  console.log(`  ✅ 5 Leads created (parents & vendors)`);
  console.log(`  ✅ 5 Notes added to leads\n`);

  // ===================
  // REVIEWS
  // ===================
  console.log('⭐ Creating Reviews...');

  const reviews = [
    {
      id: 'review-sarah-soccer',
      customerName: 'Sarah Johnson',
      rating: 5,
      comment: 'Absolutely fantastic program! My son improved so much this season. Coach Martinez is incredible with the kids.',
      reviewDate: new Date('2025-11-10T16:30:00'),
      source: 'GOOGLE',
      platform: 'GOOGLE',
    },
    {
      id: 'review-mike-basketball',
      customerName: 'Mike Rodriguez',
      rating: 5,
      comment: 'Best basketball camp in Miami! Professional coaching, great facilities, and my daughter made so many friends.',
      reviewDate: new Date('2025-11-15T10:20:00'),
      source: 'YELP',
      platform: 'YELP',
    },
    {
      id: 'review-lisa-soccer',
      customerName: 'Lisa Chen',
      rating: 4,
      comment: 'Great organization and communication. Only wish practice times were a bit earlier for working parents.',
      reviewDate: new Date('2025-11-12T14:45:00'),
      source: 'GOOGLE',
      platform: 'GOOGLE',
    },
    {
      id: 'review-jennifer-general',
      customerName: 'Jennifer Martinez',
      rating: 5,
      comment: 'The registration process was so smooth! Staff answered all my questions quickly. Cannot wait for the season!',
      reviewDate: new Date('2025-11-18T11:00:00'),
      source: 'FACEBOOK',
      platform: 'FACEBOOK',
    },
    {
      id: 'review-parent-david',
      customerName: 'David Thompson',
      rating: 4,
      comment: 'Good program overall. Kids love it. Would like to see more weekend game options.',
      reviewDate: new Date('2025-11-08T09:15:00'),
      source: 'GOOGLE',
      platform: 'GOOGLE',
    },
  ];

  for (const r of reviews) {
    await prisma.review.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        userId: user.id,
        customerName: r.customerName,
        rating: r.rating,
        comment: r.comment,
        reviewDate: r.reviewDate,
        source: r.source as any,
        platform: r.platform as any,
        status: 'APPROVED',
        respondedAt: new Date(r.reviewDate.getTime() + 86400000), // Responded next day
        response: 'Thank you so much for your feedback! We are thrilled to have your family in our program.',
      },
    });
  }

  console.log(`  ✅ 5 Reviews created (Google, Yelp, Facebook)`);
  console.log(`  ✅ Average rating: 4.6/5.0\n`);

  // ===================
  // COMMUNICATION SETTINGS
  // ===================
  console.log('📬 Creating Communication Settings...');

  const notificationSettings = [
    {
      notificationType: 'REGISTRATION_CONFIRMATION',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      emailSubject: 'Welcome to {programName}!',
      emailBody: 'Hi {parentName},\n\nThank you for registering {childName} for {programName}! We are excited to have your family join us.\n\nNext steps:\n• Complete payment: {balanceDue}\n• Review schedule: {scheduleLink}\n\nSee you on the field!',
      smsTemplate: 'Welcome! {childName} is registered for {programName}. Balance due: {balanceDue}. Questions? Reply to this message.',
    },
    {
      notificationType: 'PAYMENT_CONFIRMATION',
      enabled: true,
      sendEmail: true,
      sendSMS: false,
      emailSubject: 'Payment Received - Thank You!',
      emailBody: 'Hi {parentName},\n\nWe received your payment of {amount} for {childName} registration.\n\nReceipt: {receiptUrl}\nRemaining balance: {balanceRemaining}\n\nThank you!',
      smsTemplate: 'Payment received: {amount}. Remaining balance: {balanceRemaining}. Receipt sent to email.',
    },
    {
      notificationType: 'SCHEDULE_REMINDER',
      enabled: true,
      sendEmail: true,
      sendSMS: true,
      reminderHoursBefore: 24,
      emailSubject: 'Reminder: {eventType} Tomorrow',
      emailBody: 'Hi {parentName},\n\nThis is a reminder that {childName} has a {eventType} tomorrow:\n\n📅 When: {eventDate} at {eventTime}\n📍 Where: {venueName}, {venueAddress}\n\nSee you there!',
      smsTemplate: 'Reminder: {childName} {eventType} tomorrow at {eventTime}. Location: {venueName}',
    },
    {
      notificationType: 'BALANCE_REMINDER',
      enabled: true,
      sendEmail: true,
      sendSMS: false,
      reminderDaysInterval: 7,
      emailSubject: 'Payment Reminder - {programName}',
      emailBody: 'Hi {parentName},\n\nJust a friendly reminder that {childName} has an outstanding balance of {balanceDue} for {programName}.\n\nPay now: {paymentLink}\n\nQuestions? Reply to this email!',
      smsTemplate: 'Balance due: {balanceDue} for {childName} registration. Pay online: {paymentLink}',
    },
  ];

  for (const ns of notificationSettings) {
    await prisma.clubOSNotificationSetting.upsert({
      where: {
        userId_notificationType: {
          userId: user.id,
          notificationType: ns.notificationType as any,
        },
      },
      update: {},
      create: {
        userId: user.id,
        notificationType: ns.notificationType as any,
        enabled: ns.enabled,
        sendEmail: ns.sendEmail,
        sendSMS: ns.sendSMS,
        reminderHoursBefore: ns.reminderHoursBefore,
        reminderDaysInterval: ns.reminderDaysInterval,
        emailSubject: ns.emailSubject,
        emailBody: ns.emailBody,
        smsTemplate: ns.smsTemplate,
      },
    });
  }

  console.log(`  ✅ 4 Communication settings configured`);
  console.log(`    • Registration confirmation (Email + SMS)`);
  console.log(`    • Payment confirmation (Email only)`);
  console.log(`    • Schedule reminders (24hrs before)`);
  console.log(`    • Balance reminders (Every 7 days)\n`);

  console.log('✅ ClubOS Data Complete!\n');
  console.log('✨ Seeding Complete for michaelmendeznow@gmail.com!\n');
  console.log('📊 Summary:');
  console.log(`\n  ClubOS System for Michael Mendeno:`);
  console.log(`  • 3 Venues (Champions Soccer Complex, Hoops Arena, Grand Slam Field)`);
  console.log(`  • 2 Programs (Soccer Academy & Basketball Camp)`);
  console.log(`  • 7 Divisions`);
  console.log(`  • 1 Household (Michael Mendeno)`);
  console.log(`  • 5 Family Members (Alex, Sophia, James, Emma, Daniel)`);
  console.log(`  • 5 Registrations (3 Active, 1 Approved, 1 Pending)`);
  console.log(`  • 6 Teams (Dynamos, Stars, Lightning, Warriors, Phoenix, Titans)`);
  console.log(`  • 5 Team Memberships`);
  console.log(`  • 19 Schedules (today, tomorrow, next 3 weeks + past events)`);
  console.log(`  • 4 Payments ($${(totalPaid / 100).toFixed(2)} paid, $${(balanceDue / 100).toFixed(2)} balance due)`);
  console.log(`  • 5 Leads (parents & vendors with notes)`);
  console.log(`  • 5 Reviews (4.6/5.0 average rating)`);
  console.log(`  • 4 Communication settings (automatic notifications)`);
  
  console.log('\n🎯 Next Steps - Test These Pages:');
  console.log('  1. Log in as michaelmendeznow@gmail.com');
  console.log('  2. Visit /dashboard - Main dashboard overview');
  console.log('  3. Visit /dashboard/leads - View 5 leads (parents & vendors)');
  console.log('  4. Visit /dashboard/reviews - View 5 reviews with 4.6/5 rating');
  console.log('  6. Visit /dashboard/clubos/teams - Manage 6 teams');
  console.log('  7. Visit /dashboard/clubos/schedules - View 19 scheduled events');
  console.log('  8. Visit /dashboard/clubos/communications - Configure automatic notifications');
  console.log('  9. Visit /dashboard/clubos/parent-portal - Manage parent signups');
  console.log('  10. Visit /dashboard/clubos/admin - Approve/manage registrations\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
*/
