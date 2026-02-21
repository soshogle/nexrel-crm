export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Export listings in Centris.ca or Realtor.ca (CREA DDF) compatible CSV format.
 * GET /api/real-estate/properties/export?format=centris|realtor&status=ACTIVE
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'centris';
    const status = searchParams.get('status');

    const properties = await prisma.rEProperty.findMany({
      where: {
        userId: session.user.id,
        ...(status ? { listingStatus: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'realtor') {
      return buildRealtorExport(properties);
    }
    return buildCentrisExport(properties);
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}

// Centris.ca compatible CSV (matches their broker upload format)
function buildCentrisExport(properties: any[]) {
  const headers = [
    'MLS_Number', 'Address', 'Unit', 'City', 'Province', 'Postal_Code', 'Country',
    'Property_Type', 'Transaction_Type', 'Status', 'Price',
    'Bedrooms', 'Bathrooms', 'Living_Area_SqFt',
    'Lot_Size_SqFt', 'Year_Built', 'Description_EN', 'Description_FR',
    'Features', 'Photo_URL_1', 'Photo_URL_2', 'Photo_URL_3', 'Photo_URL_4', 'Photo_URL_5',
    'Virtual_Tour_URL', 'Listing_Date',
  ];

  const typeMap: Record<string, string> = {
    SINGLE_FAMILY: 'House', CONDO: 'Condo/Apartment', TOWNHOUSE: 'Townhouse',
    MULTI_FAMILY: 'Multi-family (2-4)', LAND: 'Lot', COMMERCIAL: 'Commercial', OTHER: 'Other',
  };

  const statusMap: Record<string, string> = {
    ACTIVE: 'Active', PENDING: 'Conditional', SOLD: 'Sold',
    EXPIRED: 'Expired', WITHDRAWN: 'Withdrawn', COMING_SOON: 'Coming Soon',
  };

  const rows = properties.map((p) => {
    const photos = Array.isArray(p.photos) ? p.photos : [];
    return [
      p.mlsNumber || '',
      p.address,
      p.unit || '',
      p.city,
      p.state,
      p.zip,
      p.country || 'CA',
      typeMap[p.propertyType] || p.propertyType,
      'Sale',
      statusMap[p.listingStatus] || p.listingStatus,
      p.listPrice?.toString() || '',
      p.beds?.toString() || '',
      p.baths?.toString() || '',
      p.sqft?.toString() || '',
      p.lotSize?.toString() || '',
      p.yearBuilt?.toString() || '',
      (p.description || '').replace(/[\r\n]+/g, ' '),
      '', // French description placeholder
      Array.isArray(p.features) ? p.features.join('; ') : '',
      photos[0] || '', photos[1] || '', photos[2] || '', photos[3] || '', photos[4] || '',
      p.virtualTourUrl || '',
      p.listingDate ? new Date(p.listingDate).toISOString().split('T')[0] : '',
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="listings-centris-${Date.now()}.csv"`,
    },
  });
}

// Realtor.ca / CREA DDF compatible CSV
function buildRealtorExport(properties: any[]) {
  const headers = [
    'ListingKey', 'MlsNumber', 'StreetAddress', 'UnitNumber',
    'City', 'StateOrProvince', 'PostalCode', 'Country',
    'PropertyType', 'PropertySubType', 'TransactionType',
    'MlsStatus', 'ListPrice', 'PriceCurrency',
    'BedroomsTotal', 'BathroomsTotalInteger', 'LivingArea', 'LivingAreaUnits',
    'LotSizeArea', 'YearBuilt',
    'PublicRemarks', 'Features',
    'PhotoUrl1', 'PhotoUrl2', 'PhotoUrl3', 'PhotoUrl4', 'PhotoUrl5',
    'VirtualTourUrl', 'ListingDate', 'ModificationTimestamp',
  ];

  const typeMap: Record<string, string> = {
    SINGLE_FAMILY: 'Residential', CONDO: 'Residential', TOWNHOUSE: 'Residential',
    MULTI_FAMILY: 'Multi-Family', LAND: 'Land', COMMERCIAL: 'Commercial', OTHER: 'Residential',
  };

  const subTypeMap: Record<string, string> = {
    SINGLE_FAMILY: 'Single Family Residence', CONDO: 'Condominium',
    TOWNHOUSE: 'Townhouse', MULTI_FAMILY: 'Multi-Family',
    LAND: 'Unimproved Land', COMMERCIAL: 'Office', OTHER: 'Other',
  };

  const statusMap: Record<string, string> = {
    ACTIVE: 'Active', PENDING: 'Pending', SOLD: 'Closed',
    EXPIRED: 'Expired', WITHDRAWN: 'Withdrawn', COMING_SOON: 'Coming Soon',
  };

  const rows = properties.map((p) => {
    const photos = Array.isArray(p.photos) ? p.photos : [];
    return [
      p.id,
      p.mlsNumber || '',
      p.address,
      p.unit || '',
      p.city,
      p.state,
      p.zip,
      p.country || 'CA',
      typeMap[p.propertyType] || 'Residential',
      subTypeMap[p.propertyType] || '',
      'For Sale',
      statusMap[p.listingStatus] || p.listingStatus,
      p.listPrice?.toString() || '',
      'CAD',
      p.beds?.toString() || '',
      p.baths ? Math.floor(p.baths).toString() : '',
      p.sqft?.toString() || '',
      'sqft',
      p.lotSize?.toString() || '',
      p.yearBuilt?.toString() || '',
      (p.description || '').replace(/[\r\n]+/g, ' '),
      Array.isArray(p.features) ? p.features.join('; ') : '',
      photos[0] || '', photos[1] || '', photos[2] || '', photos[3] || '', photos[4] || '',
      p.virtualTourUrl || '',
      p.listingDate ? new Date(p.listingDate).toISOString() : p.createdAt ? new Date(p.createdAt).toISOString() : '',
      p.updatedAt ? new Date(p.updatedAt).toISOString() : '',
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="listings-realtor-ddf-${Date.now()}.csv"`,
    },
  });
}

function escapeCSV(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
