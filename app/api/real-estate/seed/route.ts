export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let created = { leads: 0, fsboListings: 0 };

    // Create sample RE leads
    const sampleLeads = [
      {
        businessName: 'FSBO - 123 Oak Street',
        contactPerson: 'John Smith',
        email: 'jsmith@example.com',
        phone: '(514) 555-1234',
        address: '123 Oak Street',
        city: 'Montreal',
        state: 'QC',
        zipCode: 'H3A 1A1',
        country: 'Canada',
        businessCategory: 'real-estate',
        source: 'DUPROPRIO',
        status: 'QUALIFIED',
        tags: ['seller', 'fsbo', 'motivated'],
      },
      {
        businessName: 'Buyer Lead - Pre-approved',
        contactPerson: 'Sarah Johnson',
        email: 'sarahj@example.com',
        phone: '(514) 555-2345',
        address: '456 Maple Ave',
        city: 'Laval',
        state: 'QC',
        zipCode: 'H7N 2V3',
        country: 'Canada',
        businessCategory: 'real-estate',
        source: 'ZILLOW',
        status: 'CONTACTED',
        tags: ['buyer', 'pre-approved'],
      },
    ];

    for (const leadData of sampleLeads) {
      const existing = await prisma.lead.findFirst({
        where: { userId, email: leadData.email },
      });

      if (!existing) {
        await prisma.lead.create({
          data: {
            userId,
            ...leadData,
            status: leadData.status as any,
          },
        });
        created.leads++;
      }
    }

    // Create sample FSBO listings
    const fsboSamples = [
      {
        source: 'DUPROPRIO',
        sourceUrl: `https://duproprio.com/listing/${Date.now()}-1`,
        address: '123 Rue Saint-Denis',
        city: 'Montreal',
        state: 'QC',
        zip: 'H2X 3K3',
        country: 'CA',
        listPrice: 549000,
        beds: 3,
        baths: 2,
        sqft: 1450,
        yearBuilt: 1985,
        propertyType: 'Condo',
        sellerName: 'Jean-Pierre Martin',
        sellerPhone: '(514) 555-0001',
        status: 'NEW',
      },
      {
        source: 'DUPROPRIO',
        sourceUrl: `https://duproprio.com/listing/${Date.now()}-2`,
        address: '456 Avenue du Parc',
        city: 'Montreal',
        state: 'QC',
        zip: 'H2V 4E6',
        country: 'CA',
        listPrice: 725000,
        beds: 4,
        baths: 2.5,
        sqft: 2100,
        yearBuilt: 1920,
        propertyType: 'Duplex',
        sellerName: 'Marie Tremblay',
        sellerPhone: '(514) 555-0002',
        status: 'CONTACTED',
      },
    ];

    for (const fsbo of fsboSamples) {
      try {
        await prisma.rEFSBOListing.create({
          data: {
            assignedUserId: userId,
            source: fsbo.source as any,
            sourceUrl: fsbo.sourceUrl,
            address: fsbo.address,
            city: fsbo.city,
            state: fsbo.state,
            zip: fsbo.zip,
            country: fsbo.country,
            listPrice: fsbo.listPrice,
            beds: fsbo.beds,
            baths: fsbo.baths,
            sqft: fsbo.sqft,
            yearBuilt: fsbo.yearBuilt,
            propertyType: fsbo.propertyType,
            sellerName: fsbo.sellerName,
            sellerPhone: fsbo.sellerPhone,
            status: fsbo.status as any,
          },
        });
        created.fsboListings++;
      } catch (e) {
        // Ignore duplicate URL errors
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample Real Estate data seeded',
      created,
    });
  } catch (error) {
    console.error('RE Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed RE data' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'POST to this endpoint to seed sample Real Estate data',
    endpoint: '/api/real-estate/seed',
  });
}