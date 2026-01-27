import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/widget/submit - Public endpoint to receive form submissions from embedded widgets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, widgetId, formData } = body;

    // Validate required fields
    if (!userId || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 404 }
      );
    }

    // Extract form data
    const {
      businessName,
      contactPerson,
      email,
      phone,
      website,
      address,
      city,
      message,
    } = formData;

    if (!businessName && !contactPerson && !email) {
      return NextResponse.json(
        { error: 'At least one of businessName, contactPerson, or email is required' },
        { status: 400 }
      );
    }

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        userId,
        businessName: businessName || contactPerson || 'Unknown Business',
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        city: city || null,
        source: 'Embedded Widget',
        status: 'NEW',
        notes: message || null,
        enrichedData: {
          widgetId: widgetId || 'default',
          submittedAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown',
          referer: request.headers.get('referer') || 'Unknown',
        },
      },
    });

    console.log(`✅ New lead created from widget: ${lead.id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Lead submitted successfully',
        leadId: lead.id,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Widget submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit form' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// OPTIONS /api/widget/submit - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
