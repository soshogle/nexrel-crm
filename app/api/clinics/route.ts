/**
 * Clinics API
 * Multi-clinic management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - List clinics for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const db = getRouteDb(session);
    const userClinics = await db.userClinic.findMany({
      where: { userId: session.user.id },
      include: {
        clinic: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const clinics = userClinics
      .map(uc => ({
        ...uc.clinic,
        role: uc.role,
        isPrimary: uc.isPrimary,
        membershipId: uc.id,
      }))
      .filter(c => includeInactive || c.isActive);

    return NextResponse.json({ clinics });
  } catch (error: any) {
    console.error('Error fetching clinics:', error);
    return apiErrors.internal('Failed to fetch clinics', error.message);
  }
}

// POST - Create new clinic
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      email,
      website,
      timezone,
      currency,
      language,
      logo,
      primaryColor,
    } = body;

    if (!name) {
      return apiErrors.badRequest('Clinic name is required');
    }

    const db = getRouteDb(session);
    const clinic = await db.clinic.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        country: country || 'Canada',
        phone,
        email,
        website,
        timezone: timezone || 'America/Toronto',
        currency: currency || 'CAD',
        language: language || 'en',
        logo,
        primaryColor: primaryColor || '#9333ea',
        isActive: true,
      },
    });

    const userClinic = await db.userClinic.create({
      data: {
        userId: session.user.id,
        clinicId: clinic.id,
        role: 'OWNER',
        isPrimary: true, // First clinic is primary
      },
    });

    return NextResponse.json({
      success: true,
      clinic: {
        ...clinic,
        role: 'OWNER',
        isPrimary: true,
        membershipId: userClinic.id,
      },
    });
  } catch (error: any) {
    console.error('Error creating clinic:', error);
    return apiErrors.internal('Failed to create clinic', error.message);
  }
}
