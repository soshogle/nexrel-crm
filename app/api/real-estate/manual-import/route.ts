export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REFSBOSource } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ data: [], message: 'RE feature initializing...' });
  }
  return NextResponse.json({ success: true, message: 'Manual import endpoint ready' });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }

  const mapSource = (value?: string): REFSBOSource => {
    const v = String(value || '').toLowerCase();
    if (v.includes('duproprio')) return 'DUPROPRIO';
    if (v.includes('purple')) return 'PURPLEBRICKS';
    if (v.includes('fsbo.com')) return 'FSBO_COM';
    if (v.includes('craigslist')) return 'CRAIGSLIST';
    if (v.includes('facebook')) return 'FACEBOOK_MARKETPLACE';
    if (v.includes('kijiji')) return 'KIJIJI';
    if (v.includes('zillow')) return 'ZILLOW_FSBO';
    if (v.includes('manual')) return 'MANUAL_IMPORT';
    return 'OTHER';
  };

  const createListing = async (lead: any) => {
    const sourceUrl = String(lead.url || `manual://${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const data = {
      source: mapSource(lead.source),
      sourceUrl,
      address: String(lead.address || '').trim(),
      city: String(lead.city || '').trim(),
      state: String(lead.state || ''),
      zip: String(lead.zipCode || lead.zip_code || ''),
      country: String(lead.country || 'CA'),
      listPrice: lead.price != null ? Number(lead.price) : null,
      beds: lead.beds != null ? Number(lead.beds) : null,
      baths: lead.baths != null ? Number(lead.baths) : null,
      sqft: lead.sqft != null ? Number(lead.sqft) : null,
      propertyType: String(lead.propertyType || lead.property_type || 'single-family'),
      description: lead.notes ? String(lead.notes) : null,
      sellerName: lead.sellerName ? String(lead.sellerName) : null,
      sellerPhone: lead.sellerPhone ? String(lead.sellerPhone) : null,
      sellerEmail: lead.sellerEmail ? String(lead.sellerEmail) : null,
      status: 'NEW' as const,
      assignedUserId: session.user.id,
    };

    if (!data.address || !data.city) {
      throw new Error('address and city are required');
    }

    const existing = await prisma.rEFSBOListing.findUnique({ where: { sourceUrl: data.sourceUrl } });
    if (existing) {
      return prisma.rEFSBOListing.update({
        where: { sourceUrl: data.sourceUrl },
        data: {
          ...data,
          lastSeenAt: new Date(),
        },
      });
    }
    return prisma.rEFSBOListing.create({ data });
  };

  try {
    const contentType = request.headers.get('content-type') || '';

    // CSV upload path
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return apiErrors.badRequest('CSV file is required');
      }

      const csv = await file.text();
      const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return apiErrors.badRequest('CSV is empty');
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const idx = (name: string) => headers.indexOf(name);
      const get = (cells: string[], name: string) => {
        const i = idx(name);
        return i >= 0 ? cells[i]?.trim() : '';
      };

      let imported = 0;
      let failed = 0;
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim());
        const lead = {
          sellerName: get(cells, 'seller_name') || get(cells, 'sellername'),
          sellerPhone: get(cells, 'phone') || get(cells, 'seller_phone'),
          sellerEmail: get(cells, 'email') || get(cells, 'seller_email'),
          address: get(cells, 'address'),
          city: get(cells, 'city'),
          state: get(cells, 'state'),
          zipCode: get(cells, 'zip_code') || get(cells, 'zipcode') || get(cells, 'zip'),
          price: get(cells, 'price'),
          beds: get(cells, 'beds'),
          baths: get(cells, 'baths'),
          sqft: get(cells, 'sqft'),
          propertyType: get(cells, 'property_type') || 'single-family',
          url: get(cells, 'url'),
          source: get(cells, 'source') || 'Manual Import',
          notes: get(cells, 'notes'),
        };
        try {
          await createListing(lead);
          imported += 1;
        } catch (e: any) {
          failed += 1;
          errors.push({ row: i + 1, error: e?.message || 'Import failed' });
        }
      }

      return NextResponse.json({ success: true, imported, failed, errors });
    }

    // Manual single-entry path
    const body = await request.json();
    const lead = body?.lead;
    if (!lead || typeof lead !== 'object') {
      return apiErrors.badRequest('lead payload is required');
    }
    const listing = await createListing(lead);
    return NextResponse.json({ success: true, listing });
  } catch (error: any) {
    console.error('Manual import POST error:', error);
    return apiErrors.internal(error?.message || 'Failed to import lead(s)');
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return apiErrors.badRequest('Use POST for manual imports');
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiErrors.unauthorized();
  }
  const isOrthoDemo = String(session.user.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';
  if (isOrthoDemo) {
    return NextResponse.json({ success: true, message: 'RE feature initializing...' });
  }
  return apiErrors.badRequest('Use /api/real-estate/fsbo-leads for deletion');
}
