export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Sample data for Real Estate demo
const SAMPLE_LEADS = [
  {
    businessName: 'FSBO - 123 Oak Street',
    contactPerson: 'John Smith',
    email: 'jsmith@email.com',
    phone: '(514) 555-1234',
    address: '123 Oak Street',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H3A 1A1',
    country: 'Canada',
    businessCategory: 'real-estate',
    source: 'DUPROPRIO',
    contactType: 'seller',
    status: 'QUALIFIED',
    tags: ['seller', 'fsbo', 'motivated'],
    nextAction: 'Looking to sell in 3 months, pre-approved for new home',
  },
  {
    businessName: 'Buyer Lead - Pre-approved',
    contactPerson: 'Sarah Johnson',
    email: 'sarahj@gmail.com',
    phone: '(514) 555-2345',
    address: '456 Maple Ave',
    city: 'Laval',
    state: 'QC',
    zipCode: 'H7N 2V3',
    country: 'Canada',
    businessCategory: 'real-estate',
    source: 'ZILLOW',
    contactType: 'buyer',
    status: 'CONTACTED',
    tags: ['buyer', 'pre-approved', 'urgent'],
    nextAction: 'Pre-approved for $650k, needs to relocate ASAP',
  },
  {
    businessName: 'FSBO - 789 Pine Road',
    contactPerson: 'Michael Chen',
    email: 'mchen@outlook.com',
    phone: '(514) 555-3456',
    address: '789 Pine Road',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H2X 3R8',
    country: 'Canada',
    businessCategory: 'real-estate',
    source: 'FSBO',
    contactType: 'seller',
    status: 'CONTACTED',
    tags: ['seller', 'fsbo'],
    nextAction: 'Thinking about listing, price discussions',
  },
  {
    businessName: 'Buyer - Downtown Condo',
    contactPerson: 'Emily Wilson',
    email: 'emilyw@email.com',
    phone: '(514) 555-4567',
    address: '321 University St',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H3A 2A7',
    country: 'Canada',
    businessCategory: 'real-estate',
    source: 'REALTOR',
    contactType: 'buyer',
    status: 'QUALIFIED',
    tags: ['buyer', 'condo', 'first-time'],
    nextAction: 'Looking for condo under $400k, open house scheduled',
  },
  {
    businessName: 'Both - Selling to Buy',
    contactPerson: 'Robert & Linda Davis',
    email: 'davisfamily@email.com',
    phone: '(514) 555-5678',
    address: '555 Boulevard St-Laurent',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H2T 1S6',
    country: 'Canada',
    businessCategory: 'real-estate',
    source: 'REFERRAL',
    contactType: 'both',
    status: 'QUALIFIED',
    tags: ['buyer', 'seller', 'upsizing'],
    nextAction: 'Selling current home, looking for larger property, urgent timeline',
  },
];

const SAMPLE_DEALS = [
  {
    title: 'Smith Family Home Sale',
    value: 15000,
    probability: 75,
    stageName: 'Contract Pending',
    closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Johnson Condo Purchase',
    value: 12000,
    probability: 60,
    stageName: 'Negotiation',
    closeDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Chen Investment Property',
    value: 8000,
    probability: 40,
    stageName: 'Active Showing',
    closeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    let created = {
      leads: 0,
      deals: 0,
      notes: 0,
      fsboListings: 0,
    };

    // Get or create pipeline stages
    let stages = await prisma.pipelineStage.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    if (stages.length === 0) {
      // Create default RE pipeline stages
      const stageNames = ['New Lead', 'Contacted', 'Qualified', 'Active Showing', 'Negotiation', 'Contract Pending', 'Closed Won'];
      for (let i = 0; i < stageNames.length; i++) {
        const stage = await prisma.pipelineStage.create({
          data: {
            userId,
            name: stageNames[i],
            order: i,
            color: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#06B6D4', '#22C55E'][i],
          },
        });
        stages.push(stage);
      }
    }

    // Create sample leads
    for (const leadData of SAMPLE_LEADS) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          userId,
          email: leadData.email,
        },
      });

      if (!existingLead) {
        const lead = await prisma.lead.create({
          data: {
            userId,
            ...leadData,
            status: leadData.status as any,
            lastContactedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          },
        });

        // Add notes
        await prisma.note.create({
          data: {
            userId,
            leadId: lead.id,
            content: `Initial contact with ${leadData.contactPerson}. ${leadData.nextAction}`,
            type: 'NOTE',
          },
        });
        created.notes++;

        created.leads++;
      }
    }

    // Create sample deals
    for (const dealData of SAMPLE_DEALS) {
      const existingDeal = await prisma.deal.findFirst({
        where: {
          userId,
          title: dealData.title,
        },
      });

      if (!existingDeal) {
        const stage = stages.find(s => s.name === dealData.stageName) || stages[0];
        await prisma.deal.create({
          data: {
            userId,
            title: dealData.title,
            value: dealData.value,
            probability: dealData.probability,
            stageId: stage.id,
            expectedCloseDate: dealData.closeDate,
          },
        });
        created.deals++;
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
        ownerName: 'Jean-Pierre Martin',
        ownerPhone: '(514) 555-0001',
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
        ownerName: 'Marie Tremblay',
        ownerPhone: '(514) 555-0002',
        status: 'CONTACTED',
      },
      {
        source: 'FSBO',
        sourceUrl: `https://fsbo.com/listing/${Date.now()}-3`,
        address: '789 Sherbrooke West',
        city: 'Montreal',
        state: 'QC',
        zip: 'H3A 1G1',
        country: 'CA',
        listPrice: 895000,
        beds: 5,
        baths: 3,
        sqft: 2800,
        yearBuilt: 2005,
        propertyType: 'Single Family',
        ownerName: 'David Wong',
        ownerPhone: '(514) 555-0003',
        status: 'NEW',
      },
    ];

    for (const fsbo of fsboSamples) {
      try {
        await prisma.rEFSBOListing.create({
          data: {
            userId,
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
            ownerName: fsbo.ownerName,
            ownerPhone: fsbo.ownerPhone,
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
      message: 'Sample Real Estate data seeded successfully',
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
    message: 'POST to this endpoint to seed sample Real Estate data for demos',
    endpoint: '/api/real-estate/seed',
  });
}
