export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Simple CSV parser
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }
  
  return records;
}

// POST - Manual lead import (single or CSV)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // CSV file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const text = await file.text();
      const records = parseCSV(text);

      const imported = [];
      const failed = [];

      for (const record of records) {
        try {
          // Map CSV columns to lead fields
          const lead = await prisma.lead.create({
            data: {
              userId: session.user.id,
              businessName: `FSBO - ${record.address || record.city || 'Property'}`,
              contactPerson: record.seller_name || record.first_name || 'FSBO Seller',
              email: record.email || record.seller_email || null,
              phone: record.phone || record.seller_phone || null,
              address: record.address || record.property_address || null,
              city: record.city || null,
              state: record.state || null,
              zipCode: record.zip_code || record.zipCode || null,
              source: `FSBO - ${record.source || 'Manual Import'}`,
              status: 'NEW',
              tags: JSON.stringify(['FSBO', 'Manual Import', record.source].filter(Boolean)),
              enrichedData: {
                propertyDetails: {
                  price: parseFloat(String(record.price || '0').replace(/[^0-9.]/g, '')) || null,
                  beds: record.beds || record.bedrooms,
                  baths: record.baths || record.bathrooms,
                  sqft: record.sqft || record.square_feet,
                  propertyType: record.property_type || record.propertyType,
                  url: record.url || record.listing_url,
                },
              },
              leadScore: 50,
            },
          });
          imported.push(lead.id);
        } catch (err) {
          failed.push({ record, error: (err as Error).message });
        }
      }

      return NextResponse.json({
        success: true,
        totalRecords: records.length,
        imported: imported.length,
        failed: failed.length,
        importedIds: imported,
        failures: failed.slice(0, 10), // Return first 10 failures
      });
    } else {
      // Single lead JSON import
      const body = await request.json();
      const { lead } = body;

      if (!lead) {
        return NextResponse.json({ error: 'No lead data provided' }, { status: 400 });
      }

      const newLead = await prisma.lead.create({
        data: {
          userId: session.user.id,
          businessName: `FSBO - ${lead.address || lead.city || 'Property'}`,
          contactPerson: lead.sellerName || 'FSBO Seller',
          email: lead.email || lead.sellerEmail || null,
          phone: lead.phone || lead.sellerPhone || null,
          address: lead.address || null,
          city: lead.city || null,
          state: lead.state || null,
          zipCode: lead.zipCode || null,
          source: `FSBO - ${lead.source || 'Manual'}`,
          status: 'NEW',
          tags: JSON.stringify(['FSBO', 'Manual Import', lead.source].filter(Boolean)),
          enrichedData: {
            propertyDetails: {
              price: lead.price,
              beds: lead.beds,
              baths: lead.baths,
              sqft: lead.sqft,
              propertyType: lead.propertyType,
              url: lead.url,
              photos: lead.photos,
            },
            notes: lead.notes,
          },
          leadScore: 50,
        },
      });

      return NextResponse.json({
        success: true,
        leadId: newLead.id,
        message: 'Lead imported successfully',
      });
    }
  } catch (error: any) {
    console.error('Manual import error:', error);
    return NextResponse.json(
      { error: 'Failed to import lead', message: error.message },
      { status: 500 }
    );
  }
}
