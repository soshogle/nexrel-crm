export const dynamic = "force-dynamic";

/**
 * CMA (Comparative Market Analysis) API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCMA, getUserCMAs } from '@/lib/real-estate/cma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const cmas = await getUserCMAs(session.user.id, limit);
    return NextResponse.json({ cmas });
  } catch (error) {
    console.error('CMA GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CMAs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Support both 'subject' and 'subjectProperty' field names
    const subject = body.subject || body.subjectProperty;
    const options = body.options || {
      searchRadius: body.searchRadius,
      maxComps: body.maxComps,
      lookbackMonths: body.lookbackMonths
    };

    if (!subject || !subject.address) {
      return NextResponse.json(
        { error: 'Subject property required (address)' },
        { status: 400 }
      );
    }

    // Parse address if it's a combined string (e.g., "123 Main St, Boston, MA 02101")
    let address = subject.address;
    let city = subject.city || '';
    let state = subject.state || '';
    let zipCode = subject.zipCode || subject.zip || '';

    // If address contains commas, try to parse it
    if (!city && address.includes(',')) {
      const parts = address.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        address = parts[0];
        city = parts[1];
        if (parts.length >= 3) {
          // Last part might be "MA 02101" or just "MA"
          const stateZip = parts[2].trim().split(' ');
          state = stateZip[0];
          if (stateZip.length > 1) zipCode = stateZip[1];
        }
      }
    }

    const cma = await generateCMA(
      {
        address,
        city,
        state,
        zipCode,
        propertyType: subject.propertyType || 'Single Family',
        bedrooms: subject.bedrooms || subject.beds || 3,
        bathrooms: subject.bathrooms || subject.baths || 2,
        squareFeet: subject.squareFeet || subject.sqft || 1500,
        yearBuilt: subject.yearBuilt,
        lotSize: subject.lotSize,
        features: subject.features,
        condition: subject.condition,
        improvements: subject.improvements
      },
      session.user.id,
      options
    );

    return NextResponse.json({
      success: true,
      cma
    });
  } catch (error) {
    console.error('CMA POST error:', error);
    return NextResponse.json(
      { error: 'CMA generation failed' },
      { status: 500 }
    );
  }
}
