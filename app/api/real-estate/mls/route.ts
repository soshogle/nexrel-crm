export const dynamic = "force-dynamic";

/**
 * MLS Search API - Canadian (Realtor.ca) and US MLS boards
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchRealtorCa, getComparables } from '@/lib/real-estate/mls/realtor-ca';
import { searchUSMLS, storeMLSCredentials, getUserMLSBoards } from '@/lib/real-estate/mls/us-mls';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const country = searchParams.get('country') || 'CA';

    // Get configured MLS boards
    if (action === 'boards') {
      const boards = await getUserMLSBoards(session.user.id);
      return NextResponse.json({ boards });
    }

    // Search listings
    const params = {
      city: searchParams.get('city') || undefined,
      province: searchParams.get('province') || undefined,
      state: searchParams.get('state') || undefined,
      zipCode: searchParams.get('zipCode') || undefined,
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      propertyType: searchParams.get('propertyType') || undefined,
      minBeds: searchParams.get('minBeds') ? parseInt(searchParams.get('minBeds')!) : undefined,
      minBaths: searchParams.get('minBaths') ? parseInt(searchParams.get('minBaths')!) : undefined,
      status: searchParams.get('status') || undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 50,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    };

    if (country === 'CA') {
      const result = await searchRealtorCa(params, session.user.id);
      return NextResponse.json(result);
    } else if (country === 'US') {
      const mlsBoard = searchParams.get('mlsBoard');
      if (!mlsBoard) {
        return NextResponse.json({ error: 'MLS board required for US search' }, { status: 400 });
      }

      // Get stored credentials
      const credentialsJob = await prisma.rEScrapingJob.findFirst({
        where: {
          userId: session.user.id,
          name: `MLS - ${mlsBoard}`
        },
        select: { mlsCredentials: true }
      });

      if (!credentialsJob?.mlsCredentials) {
        return NextResponse.json(
          { error: 'MLS credentials not configured', mlsBoard },
          { status: 400 }
        );
      }

      // Decrypt credentials
      const creds = credentialsJob.mlsCredentials as any;
      const credentials = {
        boardName: mlsBoard,
        apiUrl: creds.apiUrl,
        username: creds.username,
        password: Buffer.from(creds.password, 'base64').toString('utf-8'),
        apiKey: creds.apiKey ? Buffer.from(creds.apiKey, 'base64').toString('utf-8') : undefined
      };

      const result = await searchUSMLS(params, credentials);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid country' }, { status: 400 });
  } catch (error) {
    console.error('MLS GET error:', error);
    return NextResponse.json(
      { error: 'MLS search failed' },
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
    const { action } = body;

    // Store MLS credentials
    if (action === 'store_credentials') {
      const { boardName, apiUrl, username, password, apiKey } = body;
      
      if (!boardName || !apiUrl || !username || !password) {
        return NextResponse.json(
          { error: 'Board name, API URL, username, and password required' },
          { status: 400 }
        );
      }

      const result = await storeMLSCredentials(session.user.id, {
        boardName,
        apiUrl,
        username,
        password,
        apiKey
      });

      return NextResponse.json(result);
    }

    // Get comparables for CMA
    if (action === 'comparables') {
      const { address, city, province, state } = body;
      
      if (!address || !city) {
        return NextResponse.json(
          { error: 'Address and city required' },
          { status: 400 }
        );
      }

      const result = await getComparables(
        address,
        city,
        province || state || '',
        session.user.id
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('MLS POST error:', error);
    return NextResponse.json(
      { error: 'MLS operation failed' },
      { status: 500 }
    );
  }
}
