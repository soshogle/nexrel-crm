export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Import FSBO lead to CRM
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lead, action } = body;

    if (action === 'import') {
      // Import single lead to CRM as a Lead record
      const newLead = await prisma.lead.create({
        data: {
          userId: session.user.id,
          businessName: `FSBO - ${lead.address || lead.city || 'Property'}`,
          contactPerson: lead.sellerName || 'FSBO Seller',
          email: lead.sellerEmail || null,
          phone: lead.sellerPhone || null,
          address: lead.address || null,
          city: lead.city || null,
          state: lead.state || null,
          zipCode: lead.zipCode || null,
          country: lead.country || null,
          source: `FSBO - ${lead.source}`,
          status: 'NEW',
          tags: JSON.stringify(['FSBO', lead.source, lead.propertyType].filter(Boolean)),
          enrichedData: {
            propertyDetails: {
              price: lead.price,
              beds: lead.beds,
              baths: lead.baths,
              sqft: lead.sqft,
              lotSize: lead.lotSize,
              yearBuilt: lead.yearBuilt,
              propertyType: lead.propertyType,
              description: lead.description,
              photos: lead.photos,
              url: lead.url,
            },
            fsboData: {
              source: lead.source,
              leadScore: lead.leadScore,
              scrapedAt: lead.scrapedAt,
              listedDate: lead.listedDate,
              daysOnMarket: lead.daysOnMarket,
            },
          },
          leadScore: lead.leadScore || 50,
        },
      });

      return NextResponse.json({
        success: true,
        leadId: newLead.id,
        message: 'Lead imported successfully',
      });
    }

    if (action === 'bulk-import') {
      // Import multiple leads
      const leads = body.leads || [];
      const imported = [];
      const failed = [];

      for (const lead of leads) {
        try {
          const newLead = await prisma.lead.create({
            data: {
              userId: session.user.id,
              businessName: `FSBO - ${lead.address || lead.city || 'Property'}`,
              contactPerson: lead.sellerName || 'FSBO Seller',
              email: lead.sellerEmail || null,
              phone: lead.sellerPhone || null,
              address: lead.address || null,
              city: lead.city || null,
              state: lead.state || null,
              zipCode: lead.zipCode || null,
              source: `FSBO - ${lead.source}`,
              status: 'NEW',
              tags: JSON.stringify(['FSBO', lead.source].filter(Boolean)),
              enrichedData: {
                propertyDetails: {
                  price: lead.price,
                  beds: lead.beds,
                  baths: lead.baths,
                  sqft: lead.sqft,
                },
              },
              leadScore: lead.leadScore || 50,
            },
          });
          imported.push(newLead.id);
        } catch (err) {
          failed.push({ lead, error: (err as Error).message });
        }
      }

      return NextResponse.json({
        success: true,
        imported: imported.length,
        failed: failed.length,
        importedIds: imported,
        failures: failed,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('FSBO lead import error:', error);
    return NextResponse.json(
      { error: 'Failed to import lead', message: error.message },
      { status: 500 }
    );
  }
}

// GET - Get saved FSBO leads for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        userId: session.user.id,
        source: { startsWith: 'FSBO' },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Error fetching FSBO leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads', message: error.message },
      { status: 500 }
    );
  }
}
