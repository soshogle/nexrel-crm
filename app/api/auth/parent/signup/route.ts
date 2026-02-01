
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

/**
 * Parent Signup API
 * Allows parents to self-register by providing a club code
 * Creates both a User account and a ClubOSHousehold
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      phone,
      clubCode,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
    } = body;

    // Validate required fields
    if (!email || !password || !name || !clubCode) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, clubCode' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Find the club owner by club code or subdomain
    let clubOwner;
    
    // Check if clubCode is actually a subdomain identifier
    if (clubCode.startsWith('subdomain-')) {
      const subdomain = clubCode.replace('subdomain-', '');
      clubOwner = await prisma.user.findUnique({
        where: { subdomain },
        select: { id: true, name: true, email: true, industry: true, subdomain: true, clubCode: true },
      });
      
      if (!clubOwner) {
        return NextResponse.json(
          { error: 'Invalid subdomain. Club not found.' },
          { status: 404 }
        );
      }
    } else {
      // Traditional club code lookup
      clubOwner = await prisma.user.findUnique({
        where: { clubCode },
        select: { id: true, name: true, email: true, industry: true, subdomain: true, clubCode: true },
      });

      if (!clubOwner) {
        return NextResponse.json(
          { error: 'Invalid club code. Please check with your club administrator.' },
          { status: 404 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with PARENT role
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'PARENT',
        parentRole: true,
        onboardingCompleted: true, // Parents don't need onboarding
      },
    });

    // Create household linked to club owner with instant access
    // Store the actual club code (or create one if coming via subdomain)
    const storedClubCode = clubOwner.clubCode || clubCode;
    
    const household = await prisma.clubOSHousehold.create({
      data: {
        userId: user.id,
        clubOwnerId: clubOwner.id,
        clubCode: storedClubCode,
        primaryContactName: name,
        primaryContactEmail: email,
        primaryContactPhone: phone || '',
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        status: 'ACTIVE', // Instant access - no approval needed
        verifiedAt: new Date(), // Mark as verified immediately
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now browse programs and register your children. Payment will be required at the time of registration.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      household: {
        id: household.id,
        status: household.status,
        clubOwnerName: clubOwner.name,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Parent signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create parent account' },
      { status: 500 }
    );
  }
}
