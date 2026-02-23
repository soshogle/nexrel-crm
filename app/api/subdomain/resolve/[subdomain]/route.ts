
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

// GET /api/subdomain/resolve/[subdomain] - Resolve subdomain to userId (public)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;

    if (!subdomain) {
      return apiErrors.badRequest('Subdomain parameter is required');
    }

    // Look up user by subdomain
    const user = await prisma.user.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        businessDescription: true,
        website: true,
        phone: true,
        address: true,
        image: true,
        // Public info only - no sensitive data
      },
    });

    if (!user) {
      return apiErrors.notFound('Business not found for this subdomain');
    }

    return NextResponse.json({
      userId: user.id,
      businessName: user.name,
      description: user.businessDescription,
      website: user.website,
      phone: user.phone,
      address: user.address,
      logo: user.image,
    });
  } catch (error: any) {
    console.error('Error resolving subdomain:', error);
    return apiErrors.internal(error.message || 'Failed to resolve subdomain');
  }
}
